import {
  TextRun,
  ExternalHyperlink,
  CheckBox,
  Paragraph,
  Table,
  IRunPropertiesOptions,
} from "docx";

// Type definitions for TipTap JSON nodes
export type Mark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: Mark[];
};

export type ParagraphChild = TextRun | ExternalHyperlink | CheckBox;

export type BlockResult =
  | Paragraph
  | Paragraph[]
  | Table
  | Promise<Paragraph | Paragraph[] | Table>;

// Mapping types for extensible architecture
export type BlockMapping = {
  [key: string]: (
    node: DocNode,
    exporter: DOCXExporterInterface,
    nestingLevel: number
  ) => BlockResult;
};

export type InlineContentMapping = {
  [key: string]: (
    node: DocNode,
    exporter: DOCXExporterInterface
  ) => ParagraphChild;
};

export type StyleMapping = {
  [key: string]: (
    value: unknown,
    exporter: DOCXExporterInterface
  ) => IRunPropertiesOptions;
};

// Exporter interface for type safety in mappings
export interface DOCXExporterInterface {
  transformInlineContent(content: DocNode[]): ParagraphChild[];
  transformStyledText(node: DocNode, hyperlink?: boolean): TextRun;
  mapStyles(marks: Mark[]): IRunPropertiesOptions;
  isRTL: boolean;
}

// Processing context for tracking state during export
export interface ProcessingContext {
  documentChildren: (Paragraph | Table)[];
  bulletListInstanceCounter: number;
  orderedListInstanceCounter: number;
  lastKnownDirection: "rtl" | "ltr" | null;
}

// Options for the DOCX exporter
export interface DOCXExporterOptions {
  /** Whether to embed fonts in the document */
  embedFonts?: boolean;
  /** Default font for the document */
  defaultFont?: string;
  /** Monospace font for code blocks */
  monospaceFont?: string;
}
