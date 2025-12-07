import { Editor } from "@tiptap/react";
import { saveAs } from "file-saver";
import type { DocNode } from "./types";
import { DOCXExporter } from "./exporter";

// Re-export exporter and types for external use
export { DOCXExporter } from "./exporter";
export type {
  DocNode,
  Mark,
  ParagraphChild,
  BlockMapping,
  InlineContentMapping,
  StyleMapping,
  DOCXExporterInterface,
  DOCXExporterOptions,
  ProcessingContext,
} from "./types";

// Re-export mappings for extensibility
export {
  defaultBlockMapping,
  defaultInlineContentMapping,
  defaultStyleMapping,
} from "./mappings";

/**
 * Generate a DOCX blob from TipTap editor content
 * This is the core function that creates the DOCX without downloading
 */
export const generateDocxBlob = async (
  editor: Editor | null
): Promise<Blob | null> => {
  if (!editor) return null;

  const json = editor.getJSON();
  const exporter = new DOCXExporter();

  // Process all nodes using the new exporter
  const blob = await exporter.toBlob((json.content || []) as DocNode[]);
  return blob;
};

/**
 * Export TipTap editor content to a DOCX file (downloads the file)
 */
export const exportToDocx = async (
  editor: Editor | null,
  filename: string = "document.docx"
) => {
  const blob = await generateDocxBlob(editor);
  if (blob) {
    saveAs(blob, filename);
  }
};
