import { Editor } from "@tiptap/react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import type { DocNode } from "./types";
import { processNode, createProcessingContext } from "./node-processor";
import { getDocumentStyles, getNumberingConfig } from "./document-config";

/**
 * Generate a DOCX blob from TipTap editor content
 * This is the core function that creates the DOCX without downloading
 */
export const generateDocxBlob = async (editor: Editor | null): Promise<Blob | null> => {
  if (!editor) return null;

  const json = editor.getJSON();
  
  // Create processing context
  const context = createProcessingContext();

  // Process all nodes
  for (const node of (json.content || []) as DocNode[]) {
    await processNode(node, context);
  }

  // Create the document with proper styling and numbering configuration
  const doc = new Document({
    creator: "TipTap Editor",
    title: "Document",
    styles: getDocumentStyles(),
    numbering: getNumberingConfig(),
    sections: [
      {
        children: context.documentChildren.length > 0
          ? context.documentChildren
          : [new Paragraph({ children: [new TextRun("")] })],
      },
    ],
  });

  // Generate blob using Packer
  const blob = await Packer.toBlob(doc);
  return blob;
};

/**
 * Export TipTap editor content to a DOCX file (downloads the file)
 */
export const exportToDocx = async (editor: Editor | null, filename: string = "document.docx") => {
  const blob = await generateDocxBlob(editor);
  if (blob) {
    saveAs(blob, filename);
  }
};

// Re-export types and utilities for external use
export type { DocNode, Mark, ParagraphChild } from "./types";
export type { ProcessingContext } from "./node-processor";

