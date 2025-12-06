'use strict';

// src/utils/pdf/zetajs-converter.ts
var ZETAOFFICE_CDN_URL = "https://cdn.zetaoffice.net/zetaoffice_latest/";
var converterInstance = null;
var isInitializing = false;
var initPromise = null;
var FS = null;
var thrPort = null;
var zetaJsBlobUrl = null;
var zetaHelperJsBlobUrl = null;
var pendingConversions = /* @__PURE__ */ new Map();
async function loadZetaJsHelpers() {
  if (zetaJsBlobUrl && zetaHelperJsBlobUrl) {
    return { zetaJsUrl: zetaJsBlobUrl, zetaHelperJsUrl: zetaHelperJsBlobUrl };
  }
  const { createZetaJsBlobUrl, createZetaHelperJsBlobUrl } = await import('./zetajs-embedded-GZX5MKW6.js');
  zetaJsBlobUrl = createZetaJsBlobUrl();
  zetaHelperJsBlobUrl = createZetaHelperJsBlobUrl();
  return { zetaJsUrl: zetaJsBlobUrl, zetaHelperJsUrl: zetaHelperJsBlobUrl };
}
function createWorkerScript() {
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
async function initializeZetaJS() {
  if (FS && thrPort) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }
  if (typeof window === "undefined") {
    throw new Error("ZetaJS can only be initialized in a browser environment");
  }
  isInitializing = true;
  initPromise = new Promise(async (resolve, reject) => {
    try {
      const { zetaJsUrl, zetaHelperJsUrl } = await loadZetaJsHelpers();
      let canvas = document.getElementById("qtcanvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "qtcanvas";
        canvas.style.display = "none";
        document.body.appendChild(canvas);
      }
      const workerScript = createWorkerScript();
      const workerBlob = new Blob([workerScript], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(workerBlob);
      const soffice_base_url = ZETAOFFICE_CDN_URL;
      const threadWrapScript = `data:text/javascript;charset=UTF-8,import("${zetaHelperJsUrl}").then(m => {m.zetaHelperWrapThread();});`;
      const Module = {
        canvas,
        uno_scripts: [zetaJsUrl, threadWrapScript],
        locateFile: (path, prefix) => {
          return (prefix || soffice_base_url) + path;
        }
      };
      Module.mainScriptUrlOrBlob = new Blob(
        [`importScripts('${soffice_base_url}soffice.js');`],
        { type: "text/javascript" }
      );
      window.Module = Module;
      const sofficeScript = document.createElement("script");
      sofficeScript.src = `${soffice_base_url}soffice.js`;
      sofficeScript.onerror = () => {
        isInitializing = false;
        initPromise = null;
        reject(new Error("Failed to load LibreOffice WASM"));
      };
      sofficeScript.onload = () => {
        const checkReady = setInterval(() => {
          if (Module.uno_main) {
            clearInterval(checkReady);
            Module.uno_main.then((port) => {
              thrPort = port;
              FS = window.FS;
              thrPort.onmessage = (e) => {
                const data = e.data;
                switch (data.cmd) {
                  case "ZetaHelper::thr_started":
                    thrPort.postMessage({
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
            }).catch((err) => {
              isInitializing = false;
              initPromise = null;
              reject(new Error(`WASM initialization failed: ${err.message}`));
            });
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkReady);
          if (isInitializing) {
            isInitializing = false;
            initPromise = null;
            reject(new Error("LibreOffice WASM initialization timed out"));
          }
        }, 12e4);
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
function handleWorkerMessage(data) {
  switch (data.cmd) {
    case "ZetaHelper::thr_started":
    case "worker_ready":
      break;
    case "converted": {
      if (!data.name || !data.to) break;
      const conversion = pendingConversions.get(data.name);
      if (conversion) {
        try {
          const mainFS = window.FS;
          const pdfData = mainFS.readFile(data.to);
          const blob = new Blob([new Uint8Array(pdfData)], { type: "application/pdf" });
          try {
            mainFS.unlink(conversion.inputPath);
          } catch {
          }
          try {
            mainFS.unlink(data.to);
          } catch {
          }
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
          FS.unlink(conversion.inputPath);
        } catch {
        }
      }
      break;
    }
  }
}
var ZetaJSConverter = class {
  constructor() {
    this.initPromise = null;
  }
  /**
   * Initialize the LibreOffice WASM environment
   * This is lazy-loaded and only happens on first use
   */
  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = initializeZetaJS();
    return this.initPromise;
  }
  /**
   * Check if the converter is initialized
   */
  isReady() {
    return FS !== null && thrPort !== null;
  }
  /**
   * Convert a DOCX blob to PDF
   */
  async convertDocxToPdf(docxBlob, filename = "document") {
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
            FS.mkdir("/tmp");
          } catch {
          }
          FS.writeFile(inputPath, new Uint8Array(data));
          thrPort.postMessage({
            cmd: "convert",
            name: conversionId,
            from: inputPath,
            to: outputPath
          });
        } catch (error) {
          pendingConversions.delete(conversionId);
          reject(new Error(`Failed to prepare DOCX for conversion: ${error}`));
        }
      }).catch((error) => {
        pendingConversions.delete(conversionId);
        reject(new Error(`Failed to read DOCX blob: ${error}`));
      });
      setTimeout(() => {
        if (pendingConversions.has(conversionId)) {
          pendingConversions.delete(conversionId);
          reject(new Error("PDF conversion timed out after 120 seconds"));
        }
      }, 12e4);
    });
  }
};
function getConverter() {
  if (!converterInstance) {
    converterInstance = new ZetaJSConverter();
  }
  return converterInstance;
}
async function convertDocxToPdf(docxBlob, filename) {
  const converter = getConverter();
  return converter.convertDocxToPdf(docxBlob, filename);
}
async function preInitialize() {
  const converter = getConverter();
  return converter.initialize();
}

exports.ZetaJSConverter = ZetaJSConverter;
exports.convertDocxToPdf = convertDocxToPdf;
exports.getConverter = getConverter;
exports.preInitialize = preInitialize;
//# sourceMappingURL=zetajs-converter-ZQBY4IE4.js.map
//# sourceMappingURL=zetajs-converter-ZQBY4IE4.js.map