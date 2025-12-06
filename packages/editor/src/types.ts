import { Editor } from "@tiptap/react";

/**
 * Configuration options for the GoatEditor component
 */
export interface GoatEditorOptions {
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
export interface GoatEditorProps {
  /** Editor configuration options */
  options?: GoatEditorOptions;
}

/**
 * Re-export the TipTap Editor type for convenience
 */
export type { Editor } from "@tiptap/react";

