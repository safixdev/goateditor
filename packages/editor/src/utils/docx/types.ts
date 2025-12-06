import { TextRun, ExternalHyperlink, CheckBox } from "docx";

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

