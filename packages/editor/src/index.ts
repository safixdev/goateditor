// Main component exports
export { GoatEditor as default } from "./Editor";
export { GoatEditor } from "./Editor";

// Named component exports
export { Toolbar } from "./Toolbar";
export type { ToolbarProps } from "./Toolbar";
export { Ruler } from "./Ruler";

// Export utilities
export { exportToDocx } from "./utils/export-docx";
export { exportToPdf } from "./utils/export-pdf";

// Types
export type { GoatEditorProps, GoatEditorOptions, Editor } from "./types";

// Custom TipTap extensions (for advanced users)
export { FontSizeExtension } from "./extensions/font-size";
export { LineHeightExtension } from "./extensions/line-height";
export { TextDirectionExtension } from "./extensions/text-direction";

// Store hook (for accessing editor instance externally)
export { useEditorStore } from "./store/use-editor-store";

// Re-export docx types for consumers who need them
export type {
  DocNode,
  Mark,
  ParagraphChild,
  ProcessingContext,
} from "./utils/export-docx";

