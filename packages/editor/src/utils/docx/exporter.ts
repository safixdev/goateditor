import {
  Document,
  Packer,
  Paragraph,
  Table,
  TextRun,
  IRunPropertiesOptions,
  AlignmentType,
  LevelFormat,
} from "docx";
import type {
  DocNode,
  Mark,
  DOCXExporterInterface,
  DOCXExporterOptions,
  BlockMapping,
  ParagraphChild,
} from "./types";
import { defaultBlockMapping } from "./mappings/block-mapping";
import { processInlineContent } from "./mappings/inline-mapping";
import { mapMarksToStyles } from "./mappings/style-mapping";

// Import styles template as raw string (esbuild loader: text)
// @ts-ignore - esbuild text loader
import stylesXml from "./template/styles.xml";

// Import fonts as data URLs (esbuild loader: dataurl)
// @ts-ignore - esbuild dataurl loader
import interFontDataUrl from "./fonts/Inter-Regular.ttf";
// @ts-ignore - esbuild dataurl loader
import monoFontDataUrl from "./fonts/JetBrainsMono-Regular.ttf";

const DEFAULT_TAB_STOP =
  /* default font size */ 16 *
  /* 1 pixel is 0.75 points */ 0.75 *
  /* 1.5em */ 1.5 *
  /* 1 point is 20 twips */ 20;

/**
 * DOCX Exporter class with mapping-based architecture
 */
export class DOCXExporter implements DOCXExporterInterface {
  private blockMapping: BlockMapping;
  private _isRTL: boolean = false;
  private options: DOCXExporterOptions;

  constructor(options: DOCXExporterOptions = {}) {
    this.blockMapping = { ...defaultBlockMapping };
    this.options = {
      embedFonts: true,
      defaultFont: "Inter",
      monospaceFont: "JetBrains Mono",
      ...options,
    };
  }

  get isRTL(): boolean {
    return this._isRTL;
  }

  /**
   * Transform styled text node into a TextRun
   */
  transformStyledText(node: DocNode, hyperlink: boolean = false): TextRun {
    const styles = this.mapStyles(node.marks || []);

    return new TextRun({
      ...styles,
      text: node.text || "",
      style: hyperlink ? "Hyperlink" : undefined,
      rightToLeft: this._isRTL,
    });
  }

  /**
   * Transform inline content array into paragraph children
   */
  transformInlineContent(content: DocNode[]): ParagraphChild[] {
    return processInlineContent(content, this);
  }

  /**
   * Map marks to docx run properties
   */
  mapStyles(marks: Mark[]): IRunPropertiesOptions {
    return mapMarksToStyles(marks, this);
  }

  /**
   * Transform a single block node
   */
  async transformBlock(
    node: DocNode,
    nestingLevel: number = 0
  ): Promise<Paragraph | Table | (Paragraph | Table)[]> {
    // Update RTL tracking
    if (node.attrs?.dir) {
      this._isRTL = node.attrs.dir === "rtl";
    }

    const mapping = this.blockMapping[node.type];
    if (mapping) {
      const result = mapping(node, this, nestingLevel);
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    }

    // Default: process children if present
    if (node.content) {
      const children: (Paragraph | Table)[] = [];
      for (const child of node.content) {
        const result = await this.transformBlock(child, nestingLevel);
        if (Array.isArray(result)) {
          children.push(...result);
        } else {
          children.push(result);
        }
      }
      return children.length > 0 ? children : [new Paragraph({ children: [] })];
    }

    return new Paragraph({ children: [] });
  }

  /**
   * Transform all blocks in the document
   */
  async transformBlocks(nodes: DocNode[]): Promise<(Paragraph | Table)[]> {
    const result: (Paragraph | Table)[] = [];

    for (const node of nodes) {
      const transformed = await this.transformBlock(node);
      if (Array.isArray(transformed)) {
        result.push(...transformed);
      } else {
        result.push(transformed);
      }
    }

    return result;
  }

  /**
   * Get fonts for embedding
   */
  private async getFonts(): Promise<{ name: string; data: Buffer }[] | undefined> {
    if (!this.options.embedFonts) {
      return undefined;
    }

    try {
      const fonts: { name: string; data: Buffer }[] = [];

      // Load Inter font from data URL
      if (interFontDataUrl) {
        const interBuffer = await dataUrlToBuffer(interFontDataUrl);
        if (interBuffer) {
          fonts.push({ name: "Inter", data: interBuffer });
        }
      }

      // Load monospace font from data URL
      if (monoFontDataUrl) {
        const monoBuffer = await dataUrlToBuffer(monoFontDataUrl);
        if (monoBuffer) {
          fonts.push({ name: "JetBrains Mono", data: monoBuffer });
        }
      }

      return fonts.length > 0 ? fonts : undefined;
    } catch (error) {
      console.warn("Failed to load embedded fonts:", error);
      return undefined;
    }
  }

  /**
   * Create default document options with numbering and styles
   */
  private async createDocumentOptions() {
    const bullets = ["•"];

    return {
      numbering: {
        config: [
          {
            reference: "goateditor-numbered-list",
            levels: Array.from({ length: 9 }, (_, i) => ({
              start: 1,
              level: i,
              format: LevelFormat.DECIMAL,
              text: `%${i + 1}.`,
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: DEFAULT_TAB_STOP * (i + 1),
                    hanging: DEFAULT_TAB_STOP,
                  },
                },
              },
            })),
          },
          {
            reference: "goateditor-bullet-list",
            levels: Array.from({ length: 9 }, (_, i) => ({
              start: 1,
              level: i,
              format: LevelFormat.BULLET,
              text: bullets[i % bullets.length],
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: DEFAULT_TAB_STOP * (i + 1),
                    hanging: DEFAULT_TAB_STOP,
                  },
                },
              },
            })),
          },
        ],
      },
      fonts: await this.getFonts(),
      defaultTabStop: 200,
      externalStyles: stylesXml,
    };
  }

  /**
   * Convert document to a Blob
   */
  async toBlob(nodes: DocNode[]): Promise<Blob> {
    const doc = await this.toDocument(nodes);

    // Handle Buffer polyfill for browser environments
    type GlobalThis = typeof globalThis & { Buffer?: unknown };
    const prevBuffer = (globalThis as GlobalThis).Buffer;

    try {
      if (!(globalThis as GlobalThis).Buffer) {
        const bufferModule = await import("buffer");
        (globalThis as GlobalThis).Buffer = bufferModule.Buffer;
      }
      return await Packer.toBlob(doc);
    } finally {
      (globalThis as GlobalThis).Buffer = prevBuffer;
    }
  }

  /**
   * Convert document to a docx Document object
   */
  async toDocument(nodes: DocNode[]): Promise<Document> {
    const documentOptions = await this.createDocumentOptions();
    const children = await this.transformBlocks(nodes);

    const doc = new Document({
      ...documentOptions,
      creator: "GoatEditor",
      title: "Document",
      sections: [
        {
          children: children.length > 0 ? children : [new Paragraph({ children: [new TextRun("")] })],
        },
      ],
    });

    // Fix fontTable relationship (docx library bug)
    doc.Document.Relationships.createRelationship(
      doc.Document.Relationships.RelationshipCount + 1,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable",
      "fontTable.xml"
    );

    return doc;
  }

  /**
   * Register a custom block mapping
   */
  registerBlockMapping(type: string, mapping: BlockMapping[string]): void {
    this.blockMapping[type] = mapping;
  }
}

/**
 * Convert data URL to Buffer
 */
async function dataUrlToBuffer(dataUrl: string): Promise<Buffer | null> {
  try {
    // Extract base64 data from data URL
    const matches = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!matches) {
      return null;
    }

    const base64Data = matches[1];

    // In browser environments, use atob
    if (typeof atob !== "undefined") {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check if Buffer is available (polyfilled)
      if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes.buffer);
      }

      return bytes.buffer as unknown as Buffer;
    }

    // In Node.js environments
    if (typeof Buffer !== "undefined") {
      return Buffer.from(base64Data, "base64");
    }

    return null;
  } catch {
    return null;
  }
}

