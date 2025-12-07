import * as react_jsx_runtime from 'react/jsx-runtime';
import { Editor, Extension } from '@tiptap/react';
export { Editor } from '@tiptap/react';
import * as zustand from 'zustand';
import { TextRun, ExternalHyperlink, CheckBox, Paragraph, Table } from 'docx';

/**
 * Configuration options for the GoatEditor component
 */
interface GoatEditorOptions {
    /** Initial HTML content to load into the editor */
    initialContent?: string;
    /** Show/hide the toolbar (default: true) */
    showToolbar?: boolean;
    /** Show/hide the ruler (default: true) */
    showRuler?: boolean;
    /** Default text direction for the editor (default: "ltr") */
    defaultDirection?: "ltr" | "rtl";
    /** Editor placeholder text */
    placeholder?: string;
    /** Custom CSS class for the editor container */
    className?: string;
    /** Custom CSS class for the toolbar */
    toolbarClassName?: string;
    /** Callback when content changes */
    onChange?: (html: string, json: object) => void;
    /** Callback when editor is ready */
    onReady?: (editor: Editor) => void;
    /** Callback when editor is destroyed */
    onDestroy?: () => void;
    /** Custom TipTap extensions to add to the editor */
    extensions?: any[];
    /** Whether the editor should be editable (default: true) */
    editable?: boolean;
    /** Whether to auto-focus the editor on mount (default: false) */
    autoFocus?: boolean;
    /** Document dimensions in pixels */
    dimensions?: {
        width?: number;
        height?: number;
    };
    /** Text direction for the toolbar layout */
    toolbarDirection?: "ltr" | "rtl";
}
/**
 * Props for the GoatEditor component
 */
interface GoatEditorProps {
    /** Editor configuration options */
    options?: GoatEditorOptions;
}

/**
 * GoatEditor - A rich-text editor built with TipTap
 *
 * @example
 * ```tsx
 * import GoatEditor from "@goat/editor";
 * import "@goat/editor/styles.css";
 *
 * function App() {
 *   return (
 *     <GoatEditor
 *       options={{
 *         initialContent: "<p>Hello World</p>",
 *         showToolbar: true,
 *         showRuler: true,
 *         onChange: (html, json) => console.log(html),
 *       }}
 *     />
 *   );
 * }
 * ```
 */
declare const GoatEditor: ({ options }: GoatEditorProps) => react_jsx_runtime.JSX.Element;

interface ToolbarProps {
    /** Text direction for the toolbar layout */
    direction?: "ltr" | "rtl";
    /** Custom class name */
    className?: string;
}
declare const Toolbar: ({ direction, className }: ToolbarProps) => react_jsx_runtime.JSX.Element;

interface RulerProps {
    /** Width of the document in pixels */
    width?: number;
}
declare const Ruler: ({ width }: RulerProps) => react_jsx_runtime.JSX.Element;

type Mark = {
    type: string;
    attrs?: Record<string, unknown>;
};
type DocNode = {
    type: string;
    attrs?: Record<string, unknown>;
    content?: DocNode[];
    text?: string;
    marks?: Mark[];
};
type ParagraphChild = TextRun | ExternalHyperlink | CheckBox;
interface ProcessingContext {
    documentChildren: (Paragraph | Table)[];
    bulletListInstanceCounter: number;
    orderedListInstanceCounter: number;
    lastKnownDirection: "rtl" | "ltr" | null;
}

/**
 * Generate a DOCX blob from TipTap editor content
 * This is the core function that creates the DOCX without downloading
 */
declare const generateDocxBlob: (editor: Editor | null) => Promise<Blob | null>;
/**
 * Export TipTap editor content to a DOCX file (downloads the file)
 */
declare const exportToDocx: (editor: Editor | null, filename?: string) => Promise<void>;

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

type ExportPdfStatus = "idle" | "initializing" | "generating-docx" | "converting-to-pdf" | "complete" | "error";
interface ExportPdfProgress {
    status: ExportPdfStatus;
    message: string;
    error?: string;
}
/**
 * Export TipTap editor content to PDF
 *
 * @param editor - The TipTap editor instance
 * @param filename - Output filename (default: "document.pdf")
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves when export is complete
 */
declare function exportToPdf(editor: Editor | null, filename?: string, onProgress?: (progress: ExportPdfProgress) => void): Promise<void>;
/**
 * Generate a PDF blob from editor content without downloading
 *
 * @param editor - The TipTap editor instance
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves with the PDF blob
 */
declare function generatePdfBlob(editor: Editor | null, onProgress?: (progress: ExportPdfProgress) => void): Promise<Blob | null>;
/**
 * Pre-initialize the PDF converter
 * Call this early to reduce wait time when user exports
 * Note: This will lazy-load the converter module
 */
declare function preInitializePdfConverter(): Promise<void>;
/**
 * Check if the PDF converter is ready
 * Note: Will return false if the converter module hasn't been loaded yet
 */
declare function isPdfConverterReady(): Promise<boolean>;

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
    }
}
declare const FontSizeExtension: Extension<any, any>;

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        LineHeight: {
            setLineHeight: (LineHeight: string) => ReturnType;
            unsetLineHeight: () => ReturnType;
        };
    }
}
declare const LineHeightExtension: Extension<any, any>;

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        textDirection: {
            setTextDirection: (direction: "ltr" | "rtl") => ReturnType;
            unsetTextDirection: () => ReturnType;
        };
    }
}
declare const TextDirectionExtension: Extension<any, any>;

interface EditorState {
    editor: Editor | null;
    setEditor: (editor: Editor | null) => void;
}
declare const useEditorStore: zustand.UseBoundStore<zustand.StoreApi<EditorState>>;

export { type DocNode, type ExportPdfProgress, type ExportPdfStatus, FontSizeExtension, GoatEditor, type GoatEditorOptions, type GoatEditorProps, LineHeightExtension, type Mark, type ParagraphChild, type ProcessingContext, Ruler, TextDirectionExtension, Toolbar, type ToolbarProps, GoatEditor as default, exportToDocx, exportToPdf, generateDocxBlob, generatePdfBlob, isPdfConverterReady, preInitializePdfConverter, useEditorStore };
