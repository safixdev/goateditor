/**
 * PDF Export Module
 * 
 * Exports TipTap editor content to PDF by:
 * 1. First generating a DOCX using the docx library
 * 2. Converting the DOCX to PDF using LibreOffice WASM (zetajs)
 * 
 * All dependencies are lazy-loaded for optimal bundle size.
 * 
 * Requirements for consumers:
 * - Server must send headers for SharedArrayBuffer support:
 *   - Cross-Origin-Opener-Policy: same-origin
 *   - Cross-Origin-Embedder-Policy: require-corp
 */

import { Editor } from "@tiptap/react";
import { saveAs } from "file-saver";
import { generateDocxBlob } from "../docx";

export type ExportPdfStatus = 
  | "idle"
  | "initializing"
  | "generating-docx"
  | "converting-to-pdf"
  | "complete"
  | "error";

export interface ExportPdfProgress {
  status: ExportPdfStatus;
  message: string;
  error?: string;
}

/**
 * Lazy load the converter module
 * This ensures the ~56KB of helper code is only loaded when needed
 */
async function getConverterModule() {
  const { getConverter, convertDocxToPdf, preInitialize } = await import("./zetajs-converter");
  return { getConverter, convertDocxToPdf, preInitialize };
}

/**
 * Export TipTap editor content to PDF
 * 
 * @param editor - The TipTap editor instance
 * @param filename - Output filename (default: "document.pdf")
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves when export is complete
 */
export async function exportToPdf(
  editor: Editor | null,
  filename: string = "document.pdf",
  onProgress?: (progress: ExportPdfProgress) => void
): Promise<void> {
  if (!editor) {
    onProgress?.({ status: "error", message: "Export failed", error: "No editor provided" });
    throw new Error("No editor provided");
  }

  try {
    // Step 1: Initialize LibreOffice WASM if not already done
    onProgress?.({ status: "initializing", message: "Initializing PDF converter..." });
    
    const { getConverter } = await getConverterModule();
    const converter = getConverter();
    await converter.initialize();
    
    // Step 2: Generate DOCX blob from editor content
    onProgress?.({ status: "generating-docx", message: "Generating document..." });
    
    const docxBlob = await generateDocxBlob(editor);
    if (!docxBlob) {
      throw new Error("Failed to generate DOCX");
    }
    
    // Step 3: Convert DOCX to PDF
    onProgress?.({ status: "converting-to-pdf", message: "Converting to PDF..." });
    
    const baseName = filename.replace(/\.pdf$/i, "");
    const pdfBlob = await converter.convertDocxToPdf(docxBlob, baseName);
    
    // Step 4: Download the PDF
    onProgress?.({ status: "complete", message: "Download starting..." });
    
    const outputFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    saveAs(pdfBlob, outputFilename);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    onProgress?.({ status: "error", message: "Export failed", error: errorMessage });
    throw error;
  }
}

/**
 * Generate a PDF blob from editor content without downloading
 * 
 * @param editor - The TipTap editor instance
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves with the PDF blob
 */
export async function generatePdfBlob(
  editor: Editor | null,
  onProgress?: (progress: ExportPdfProgress) => void
): Promise<Blob | null> {
  if (!editor) {
    onProgress?.({ status: "error", message: "Generation failed", error: "No editor provided" });
    return null;
  }

  try {
    // Step 1: Initialize LibreOffice WASM if not already done
    onProgress?.({ status: "initializing", message: "Initializing PDF converter..." });
    
    const { getConverter } = await getConverterModule();
    const converter = getConverter();
    await converter.initialize();
    
    // Step 2: Generate DOCX blob from editor content
    onProgress?.({ status: "generating-docx", message: "Generating document..." });
    
    const docxBlob = await generateDocxBlob(editor);
    if (!docxBlob) {
      throw new Error("Failed to generate DOCX");
    }
    
    // Step 3: Convert DOCX to PDF
    onProgress?.({ status: "converting-to-pdf", message: "Converting to PDF..." });
    
    const pdfBlob = await converter.convertDocxToPdf(docxBlob, "document");
    
    onProgress?.({ status: "complete", message: "PDF generated" });
    return pdfBlob;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    onProgress?.({ status: "error", message: "Generation failed", error: errorMessage });
    throw error;
  }
}

/**
 * Pre-initialize the PDF converter
 * Call this early to reduce wait time when user exports
 * Note: This will lazy-load the converter module
 */
export async function preInitializePdfConverter(): Promise<void> {
  const { preInitialize } = await getConverterModule();
  return preInitialize();
}

/**
 * Check if the PDF converter is ready
 * Note: Will return false if the converter module hasn't been loaded yet
 */
export async function isPdfConverterReady(): Promise<boolean> {
  try {
    const { getConverter } = await getConverterModule();
    return getConverter().isReady();
  } catch {
    return false;
  }
}

