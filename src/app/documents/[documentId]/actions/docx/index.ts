import { Editor } from "@tiptap/react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import type { DocNode } from "./types";
import { processNode, createProcessingContext } from "./node-processor";
import { getDocumentStyles, getNumberingConfig } from "./document-config";

/**
 * Export TipTap editor content to a DOCX file
 */
export const exportToDocx = async (editor: Editor | null) => {
  if (!editor) return;

  const json = editor.getJSON();
  console.log("Editor JSON for DOCX export:", JSON.stringify(json, null, 2));
  
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

  // Generate and download using Packer
  const blob = await Packer.toBlob(doc);
  saveAs(blob, "document.docx");
};

// Re-export types and utilities for external use
export type { DocNode, Mark, ParagraphChild } from "./types";
export type { ProcessingContext } from "./node-processor";

