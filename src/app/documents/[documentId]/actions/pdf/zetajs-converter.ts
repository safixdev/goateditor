/**
 * ZetaJS PDF Converter
 * 
 * This module handles the conversion of DOCX files to PDF using
 * LibreOffice WebAssembly (LOWA) via the zetajs library.
 * 
 * The conversion happens entirely client-side using Web Workers.
 */

// ZetaOffice CDN URL for LOWA files
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

// Progress callback type for initialization
export type InitProgressPhase = "downloading" | "compiling" | "starting" | "ready";
export interface InitProgress {
  phase: InitProgressPhase;
  message: string;
  percentage?: number; // 0-100, undefined for indeterminate
  downloadedBytes?: number;
  totalBytes?: number;
}
export type InitProgressCallback = (progress: InitProgress) => void;

// Store current progress callback (used during initialization)
let currentProgressCallback: InitProgressCallback | null = null;

// Singleton instance for the converter
let converterInstance: ZetaJSConverter | null = null;

// Track initialization state
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Store for FS and thrPort after initialization
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FS: EmscriptenFS | null = null;
let thrPort: MessagePort | null = null;

// Pending conversions map
const pendingConversions = new Map<string, {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
  outputPath: string;
  inputPath: string;
}>();

/**
 * Parse Emscripten setStatus message to extract progress information
 * Format examples:
 * - "Downloading..." - indeterminate download
 * - "Downloading... (5242880/52428800)" - download with byte progress
 * - "" - empty means complete
 */
function parseEmscriptenStatus(status: string): InitProgress | null {
  if (!status || status === "") {
    return { phase: "ready", message: "Ready", percentage: 100 };
  }

  // Match "Downloading... (current/total)" format
  const downloadMatch = status.match(/Downloading.*?\((\d+)\/(\d+)\)/);
  if (downloadMatch) {
    const current = parseInt(downloadMatch[1], 10);
    const total = parseInt(downloadMatch[2], 10);
    const percentage = total > 0 ? Math.round((current / total) * 100) : undefined;
    return {
      phase: "downloading",
      message: `Downloading LibreOffice... ${percentage !== undefined ? `${percentage}%` : ""}`,
      percentage,
    };
  }

  // Match just "Downloading..." without progress
  if (status.toLowerCase().includes("downloading")) {
    return {
      phase: "downloading",
      message: "Downloading LibreOffice...",
      percentage: undefined,
    };
  }

  // Match compilation/running status
  if (status.toLowerCase().includes("compiling") || status.toLowerCase().includes("preparing")) {
    return {
      phase: "compiling",
      message: "Compiling WASM module...",
      percentage: undefined,
    };
  }

  if (status.toLowerCase().includes("running") || status.toLowerCase().includes("starting")) {
    return {
      phase: "starting",
      message: "Starting LibreOffice...",
      percentage: undefined,
    };
  }

  // Default: treat as compiling phase (after download)
  return {
    phase: "compiling",
    message: status || "Initializing...",
    percentage: undefined,
  };
}

/**
 * Create the worker script that runs inside the LibreOffice thread
 * This script handles the actual document conversion
 * 
 * This script runs AFTER zetajs is initialized, so globalThis.zetajsStore is available
 */
function createWorkerScript(): string {
  return `
// Worker script for ZetaJS PDF conversion
// This runs inside the LibreOffice WASM thread AFTER zetajs is ready

// Access zetajs from the global store (set by zetaHelperWrapThread)
const zetajs = globalThis.zetajsStore.zetajs;
const css = zetajs.uno.com.sun.star;
const thrPort = zetajs.mainPort;
// FS is a global in the worker (Emscripten virtual filesystem)
// We access it directly from globalThis

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
        // (FS is shared between worker and main thread via SharedArrayBuffer)
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
      // Ignore unknown commands
      break;
  }
};

// Signal that worker is ready
thrPort.postMessage({ cmd: 'worker_ready' });
`;
}

/**
 * Initialize the LibreOffice WASM environment
 * @param onProgress - Optional callback for progress updates during initialization
 */
async function initializeZetaJS(onProgress?: InitProgressCallback): Promise<void> {
  if (FS && thrPort) {
    // Already initialized - report ready immediately
    onProgress?.({ phase: "ready", message: "Ready", percentage: 100 });
    return;
  }
  
  if (initPromise) {
    // Already initializing - store the new callback to receive updates
    if (onProgress) {
      currentProgressCallback = onProgress;
    }
    return initPromise;
  }
  
  if (typeof window === "undefined") {
    throw new Error("ZetaJS can only be initialized in a browser environment");
  }
  
  isInitializing = true;
  currentProgressCallback = onProgress || null;
  
  // Report initial progress
  currentProgressCallback?.({ phase: "downloading", message: "Starting download...", percentage: 0 });
  
  initPromise = new Promise<void>((resolve, reject) => {
    try {
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
      
      // The zetajs helper files need to be served locally due to CORS/COEP
      // These are copied to /public/zetajs/ from node_modules/zetajs/source/
      const localZetaJsUrl = "/zetajs/zeta.js";
      const localZetaHelperUrl = "/zetajs/zetaHelper.js";
      
      // Create the wrapper script that initializes zetajsStore in the worker
      // This is required for our worker script to access zetajs
      // Use absolute URL for the ES module import
      const absoluteZetaHelperUrl = new URL(localZetaHelperUrl, window.location.origin).href;
      const threadWrapScript = `data:text/javascript;charset=UTF-8,` +
        `import("${absoluteZetaHelperUrl}").then(m => {m.zetaHelperWrapThread();});`;
      
      // Emscripten Module configuration (untyped as it's Emscripten internals)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Module: Record<string, unknown> = {
        canvas,
        // These scripts run in the worker after WASM loads, before our threadJs
        // Use absolute URL for the zeta.js since it's loaded via importScripts in worker
        uno_scripts: [new URL(localZetaJsUrl, window.location.origin).href, threadWrapScript],
        locateFile: (path: string, prefix: string) => {
          return (prefix || soffice_base_url) + path;
        },
        // Emscripten progress callback - called during WASM download and compilation
        setStatus: (status: string) => {
          if (currentProgressCallback) {
            const progress = parseEmscriptenStatus(status);
            if (progress) {
              currentProgressCallback(progress);
            }
          }
        },
      };
      
      // Create the main script blob for the worker
      Module.mainScriptUrlOrBlob = new Blob(
        [`importScripts('${soffice_base_url}soffice.js');`],
        { type: "text/javascript" }
      );
      
      // Set Module as global (required by soffice.js)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as unknown as Record<string, unknown>).Module = Module;
      
      // Load soffice.js
      const sofficeScript = document.createElement("script");
      sofficeScript.src = `${soffice_base_url}soffice.js`;
      
      sofficeScript.onerror = () => {
        isInitializing = false;
        initPromise = null;
        currentProgressCallback = null;
        reject(new Error("Failed to load LibreOffice WASM"));
      };
      
      sofficeScript.onload = () => {
        // Report that we're past the initial script load
        currentProgressCallback?.({ phase: "downloading", message: "Loading WASM module...", percentage: undefined });
        
        // Wait for Module.uno_main to be available
        const checkReady = setInterval(() => {
          if (Module.uno_main) {
            clearInterval(checkReady);
            
            // Report starting phase
            currentProgressCallback?.({ phase: "starting", message: "Starting LibreOffice...", percentage: undefined });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Module.uno_main as Promise<MessagePort>).then((port: MessagePort) => {
              thrPort = port;
              FS = (window as unknown as Record<string, unknown>).FS as EmscriptenFS;
              
              // Set up message handler - need to handle the initialization protocol
              thrPort!.onmessage = (e: MessageEvent) => {
                const data = e.data as WorkerMessageData;
                
                switch (data.cmd) {
                  case "ZetaHelper::thr_started":
                    // Worker's zetaHelperWrapThread is ready, now send our script
                    thrPort!.postMessage({
                      cmd: "ZetaHelper::run_thr_script",
                      threadJs: workerUrl,
                      threadJsType: "classic"
                    });
                    break;
                    
                  case "worker_ready":
                    // Our worker script is now ready
                    isInitializing = false;
                    currentProgressCallback?.({ phase: "ready", message: "Ready", percentage: 100 });
                    currentProgressCallback = null;
                    resolve();
                    break;
                    
                  default:
                    // Pass other messages to the regular handler
                    handleWorkerMessage(data);
                }
              };
              
            }).catch((err: Error) => {
              isInitializing = false;
              initPromise = null;
              currentProgressCallback = null;
              reject(new Error(`WASM initialization failed: ${err.message}`));
            });
          }
        }, 100);
        
        // Timeout after 120 seconds (WASM loading can take time)
        setTimeout(() => {
          clearInterval(checkReady);
          if (isInitializing) {
            isInitializing = false;
            initPromise = null;
            currentProgressCallback = null;
            reject(new Error("LibreOffice WASM initialization timed out"));
          }
        }, 120000);
      };
      
      document.body.appendChild(sofficeScript);
      
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      currentProgressCallback = null;
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
      // Internal messages, ignore
      break;
      
    case "converted": {
      if (!data.name || !data.to) break;
      const conversion = pendingConversions.get(data.name);
      if (conversion) {
        try {
          // Read the PDF from the shared virtual filesystem (window.FS)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mainFS = (window as any).FS as EmscriptenFS;
          const pdfData = mainFS.readFile(data.to);
          
          // Create blob from the PDF data
          // Copy to a regular Uint8Array to avoid SharedArrayBuffer issues
          const blob = new Blob([new Uint8Array(pdfData)], { type: "application/pdf" });
          
          // Clean up virtual filesystem
          try { mainFS.unlink(conversion.inputPath); } catch {}
          try { mainFS.unlink(data.to); } catch {}
          
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
        
        // Clean up input file
        try {
          FS!.unlink(conversion.inputPath);
        } catch {}
      }
      break;
    }
    
    default:
      // Ignore other messages (like ZetaHelper internal messages)
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
   * @param onProgress - Optional callback for progress updates during initialization
   */
  async initialize(onProgress?: InitProgressCallback): Promise<void> {
    if (this.initPromise) {
      // Already initializing - update the progress callback
      if (onProgress) {
        currentProgressCallback = onProgress;
      }
      return this.initPromise;
    }
    
    this.initPromise = initializeZetaJS(onProgress);
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
    // Ensure initialized
    await this.initialize();
    
    if (!FS || !thrPort) {
      throw new Error("ZetaJS not initialized");
    }
    
    return new Promise((resolve, reject) => {
      const conversionId = `${filename.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
      const inputPath = `/tmp/input_${conversionId}.docx`;
      const outputPath = `/tmp/output_${conversionId}.pdf`;
      
      // Store the promise callbacks
      pendingConversions.set(conversionId, { 
        resolve, 
        reject,
        inputPath,
        outputPath
      });
      
      // Read the blob as ArrayBuffer and write to virtual filesystem
      docxBlob.arrayBuffer().then((data) => {
        try {
          // Ensure /tmp directory exists
          try {
            FS!.mkdir("/tmp");
          } catch {
            // Directory may already exist
          }
          
          // Write DOCX to virtual filesystem
          FS!.writeFile(inputPath, new Uint8Array(data));
          
          // Send conversion message to worker
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
      
      // Timeout after 120 seconds (conversion can take time for large docs)
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
 * This is the main entry point for conversion
 */
export async function convertDocxToPdf(docxBlob: Blob, filename?: string): Promise<Blob> {
  const converter = getConverter();
  return converter.convertDocxToPdf(docxBlob, filename);
}

/**
 * Pre-initialize the converter (optional, for eager loading)
 * @param onProgress - Optional callback for progress updates during initialization
 */
export async function preInitialize(onProgress?: InitProgressCallback): Promise<void> {
  const converter = getConverter();
  return converter.initialize(onProgress);
}
