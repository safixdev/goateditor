/**
 * ZetaJS PDF Converter
 * 
 * This module handles the conversion of DOCX files to PDF using
 * LibreOffice WebAssembly (LOWA) via the zetajs library.
 * 
 * The conversion happens entirely client-side using Web Workers.
 * All helper files are bundled and lazy-loaded on first use.
 */

// ZetaOffice CDN URL for LOWA files (WASM binaries)
const ZETAOFFICE_CDN_URL = "https://cdn.zetaoffice.net/zetaoffice_latest/";

// Type definitions for Emscripten FS (not fully typed)
interface EmscriptenFS {
  readFile: (path: string) => Uint8Array;
  writeFile: (path: string, data: Uint8Array) => void;
  unlink: (path: string) => void;
  mkdir: (path: string) => void;
}

// Type for worker messages
interface WorkerMessageData {
  cmd: string;
  name?: string;
  from?: string;
  to?: string;
  error?: string;
}

// Singleton instance for the converter
let converterInstance: ZetaJSConverter | null = null;

// Track initialization state
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Store for FS and thrPort after initialization
let FS: EmscriptenFS | null = null;
let thrPort: MessagePort | null = null;

// Cached blob URLs for helper scripts (lazy loaded)
let zetaJsBlobUrl: string | null = null;
let zetaHelperJsBlobUrl: string | null = null;

// Pending conversions map
const pendingConversions = new Map<string, {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
  outputPath: string;
  inputPath: string;
}>();

/**
 * Lazy load the embedded zetajs helper files and create blob URLs
 * This adds ~56KB to the download only when PDF export is first used
 */
async function loadZetaJsHelpers(): Promise<{ zetaJsUrl: string; zetaHelperJsUrl: string }> {
  if (zetaJsBlobUrl && zetaHelperJsBlobUrl) {
    return { zetaJsUrl: zetaJsBlobUrl, zetaHelperJsUrl: zetaHelperJsBlobUrl };
  }

  // Dynamic import - only loads when needed
  const { createZetaJsBlobUrl, createZetaHelperJsBlobUrl } = await import("./zetajs-embedded");
  
  zetaJsBlobUrl = createZetaJsBlobUrl();
  zetaHelperJsBlobUrl = createZetaHelperJsBlobUrl();
  
  return { zetaJsUrl: zetaJsBlobUrl, zetaHelperJsUrl: zetaHelperJsBlobUrl };
}

/**
 * Create the worker script that runs inside the LibreOffice thread
 * This script handles the actual document conversion
 */
function createWorkerScript(): string {
  return `
// Worker script for ZetaJS PDF conversion
// This runs inside the LibreOffice WASM thread AFTER zetajs is ready

// Access zetajs from the global store (set by zetaHelperWrapThread)
const zetajs = globalThis.zetajsStore.zetajs;
const css = zetajs.uno.com.sun.star;
const thrPort = zetajs.mainPort;

// Create property beans for conversion
const bean_hidden = new css.beans.PropertyValue({Name: 'Hidden', Value: true});
const bean_overwrite = new css.beans.PropertyValue({Name: 'Overwrite', Value: true});
const bean_pdf_export = new css.beans.PropertyValue({Name: 'FilterName', Value: 'writer_pdf_Export'});

// Get desktop for document operations
const context = zetajs.getUnoComponentContext();
const desktop = css.frame.Desktop.create(context);

let xModel;

thrPort.onmessage = (e) => {
  switch (e.data.cmd) {
    case 'convert':
      try {
        // Close previous document if exists
        if (xModel !== undefined) {
          try {
            if (xModel.queryInterface(zetajs.type.interface(css.util.XCloseable))) {
              xModel.close(false);
            }
          } catch (closeErr) {
            // Silently ignore close errors
          }
        }
        
        const from = e.data.from;
        const to = e.data.to;
        
        // Load document (hidden)
        xModel = desktop.loadComponentFromURL('file://' + from, '_blank', 0, [bean_hidden]);
        
        // Export to PDF
        xModel.storeToURL('file://' + to, [bean_overwrite, bean_pdf_export]);
        
        // Send the path back to main thread - it will read the file
        zetajs.mainPort.postMessage({
          cmd: 'converted',
          name: e.data.name,
          from: from,
          to: to
        });
        
      } catch (err) {
        console.error('[ZetaJS] Conversion error:', err);
        zetajs.mainPort.postMessage({
          cmd: 'error',
          name: e.data.name,
          error: err.message || 'Unknown conversion error'
        });
      }
      break;
    default:
      break;
  }
};

// Signal that worker is ready
thrPort.postMessage({ cmd: 'worker_ready' });
`;
}

/**
 * Initialize the LibreOffice WASM environment
 */
async function initializeZetaJS(): Promise<void> {
  if (FS && thrPort) {
    return; // Already initialized
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  if (typeof window === "undefined") {
    throw new Error("ZetaJS can only be initialized in a browser environment");
  }
  
  isInitializing = true;
  
  initPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Lazy load helper scripts
      const { zetaJsUrl, zetaHelperJsUrl } = await loadZetaJsHelpers();
      
      // Create hidden canvas element (required by zetajs)
      let canvas = document.getElementById("qtcanvas") as HTMLCanvasElement;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "qtcanvas";
        canvas.style.display = "none";
        document.body.appendChild(canvas);
      }
      
      // Create worker script as blob URL
      const workerScript = createWorkerScript();
      const workerBlob = new Blob([workerScript], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(workerBlob);
      
      // Set up Module configuration
      const soffice_base_url = ZETAOFFICE_CDN_URL;
      
      // Create the wrapper script that initializes zetajsStore in the worker
      const threadWrapScript = `data:text/javascript;charset=UTF-8,` +
        `import("${zetaHelperJsUrl}").then(m => {m.zetaHelperWrapThread();});`;
      
      // Emscripten Module configuration
      const Module: Record<string, unknown> = {
        canvas,
        uno_scripts: [zetaJsUrl, threadWrapScript],
        locateFile: (path: string, prefix: string) => {
          return (prefix || soffice_base_url) + path;
        },
      };
      
      // Create the main script blob for the worker
      Module.mainScriptUrlOrBlob = new Blob(
        [`importScripts('${soffice_base_url}soffice.js');`],
        { type: "text/javascript" }
      );
      
      // Set Module as global (required by soffice.js)
      (window as unknown as Record<string, unknown>).Module = Module;
      
      // Load soffice.js
      const sofficeScript = document.createElement("script");
      sofficeScript.src = `${soffice_base_url}soffice.js`;
      
      sofficeScript.onerror = () => {
        isInitializing = false;
        initPromise = null;
        reject(new Error("Failed to load LibreOffice WASM"));
      };
      
      sofficeScript.onload = () => {
        // Wait for Module.uno_main to be available
        const checkReady = setInterval(() => {
          if (Module.uno_main) {
            clearInterval(checkReady);
            
            (Module.uno_main as Promise<MessagePort>).then((port: MessagePort) => {
              thrPort = port;
              FS = (window as unknown as Record<string, unknown>).FS as EmscriptenFS;
              
              // Set up message handler
              thrPort!.onmessage = (e: MessageEvent) => {
                const data = e.data as WorkerMessageData;
                
                switch (data.cmd) {
                  case "ZetaHelper::thr_started":
                    thrPort!.postMessage({
                      cmd: "ZetaHelper::run_thr_script",
                      threadJs: workerUrl,
                      threadJsType: "classic"
                    });
                    break;
                    
                  case "worker_ready":
                    isInitializing = false;
                    resolve();
                    break;
                    
                  default:
                    handleWorkerMessage(data);
                }
              };
              
            }).catch((err: Error) => {
              isInitializing = false;
              initPromise = null;
              reject(new Error(`WASM initialization failed: ${err.message}`));
            });
          }
        }, 100);
        
        // Timeout after 120 seconds
        setTimeout(() => {
          clearInterval(checkReady);
          if (isInitializing) {
            isInitializing = false;
            initPromise = null;
            reject(new Error("LibreOffice WASM initialization timed out"));
          }
        }, 120000);
      };
      
      document.body.appendChild(sofficeScript);
      
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      reject(error);
    }
  });
  
  return initPromise;
}

/**
 * Handle messages from the worker thread
 */
function handleWorkerMessage(data: WorkerMessageData): void {
  switch (data.cmd) {
    case "ZetaHelper::thr_started":
    case "worker_ready":
      break;
      
    case "converted": {
      if (!data.name || !data.to) break;
      const conversion = pendingConversions.get(data.name);
      if (conversion) {
        try {
          const mainFS = (window as unknown as Record<string, unknown>).FS as EmscriptenFS;
          const pdfData = mainFS.readFile(data.to);
          const blob = new Blob([new Uint8Array(pdfData)], { type: "application/pdf" });
          
          // Clean up virtual filesystem
          try { mainFS.unlink(conversion.inputPath); } catch { /* ignore */ }
          try { mainFS.unlink(data.to); } catch { /* ignore */ }
          
          conversion.resolve(blob);
        } catch (error) {
          conversion.reject(new Error(`Failed to read PDF from FS: ${error}`));
        }
        pendingConversions.delete(data.name);
      }
      break;
    }
    
    case "error": {
      if (!data.name) break;
      const conversion = pendingConversions.get(data.name);
      if (conversion) {
        conversion.reject(new Error(data.error || "Conversion failed"));
        pendingConversions.delete(data.name);
        
        try {
          FS!.unlink(conversion.inputPath);
        } catch { /* ignore */ }
      }
      break;
    }
    
    default:
      break;
  }
}

/**
 * ZetaJS Converter class
 * Manages LibreOffice WASM initialization and document conversion
 */
export class ZetaJSConverter {
  private initPromise: Promise<void> | null = null;
  
  /**
   * Initialize the LibreOffice WASM environment
   * This is lazy-loaded and only happens on first use
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = initializeZetaJS();
    return this.initPromise;
  }
  
  /**
   * Check if the converter is initialized
   */
  isReady(): boolean {
    return FS !== null && thrPort !== null;
  }
  
  /**
   * Convert a DOCX blob to PDF
   */
  async convertDocxToPdf(docxBlob: Blob, filename: string = "document"): Promise<Blob> {
    await this.initialize();
    
    if (!FS || !thrPort) {
      throw new Error("ZetaJS not initialized");
    }
    
    return new Promise((resolve, reject) => {
      const conversionId = `${filename.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
      const inputPath = `/tmp/input_${conversionId}.docx`;
      const outputPath = `/tmp/output_${conversionId}.pdf`;
      
      pendingConversions.set(conversionId, { 
        resolve, 
        reject,
        inputPath,
        outputPath
      });
      
      docxBlob.arrayBuffer().then((data) => {
        try {
          try {
            FS!.mkdir("/tmp");
          } catch { /* Directory may exist */ }
          
          FS!.writeFile(inputPath, new Uint8Array(data));
          
          thrPort!.postMessage({
            cmd: "convert",
            name: conversionId,
            from: inputPath,
            to: outputPath,
          });
        } catch (error) {
          pendingConversions.delete(conversionId);
          reject(new Error(`Failed to prepare DOCX for conversion: ${error}`));
        }
      }).catch((error) => {
        pendingConversions.delete(conversionId);
        reject(new Error(`Failed to read DOCX blob: ${error}`));
      });
      
      // Timeout after 120 seconds
      setTimeout(() => {
        if (pendingConversions.has(conversionId)) {
          pendingConversions.delete(conversionId);
          reject(new Error("PDF conversion timed out after 120 seconds"));
        }
      }, 120000);
    });
  }
}

/**
 * Get or create the singleton converter instance
 */
export function getConverter(): ZetaJSConverter {
  if (!converterInstance) {
    converterInstance = new ZetaJSConverter();
  }
  return converterInstance;
}

/**
 * Convert a DOCX blob to PDF using zetajs
 */
export async function convertDocxToPdf(docxBlob: Blob, filename?: string): Promise<Blob> {
  const converter = getConverter();
  return converter.convertDocxToPdf(docxBlob, filename);
}

/**
 * Pre-initialize the converter (optional, for eager loading)
 */
export async function preInitialize(): Promise<void> {
  const converter = getConverter();
  return converter.initialize();
}

