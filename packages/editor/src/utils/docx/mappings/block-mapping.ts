import {
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  CheckBox,
  ShadingType,
  PageBreak,
  convertInchesToTwip,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  BorderStyle,
} from "docx";
import type { DocNode, BlockMapping, DOCXExporterInterface, ParagraphChild } from "../types";
import { getAlignment, getImageAlignment } from "../style-utils";
import {
  getImageType,
  fetchImageAsArrayBuffer,
  getImageDimensionsFromBlob,
  calculateFinalImageDimensions,
} from "../image-utils";
import { createTable } from "../utils/table-utils";

/**
 * Default block mappings for TipTap nodes to docx elements
 */
export const defaultBlockMapping: BlockMapping = {
  paragraph: (node, exporter, _nestingLevel) => {
    const isRTL = node.attrs?.dir === "rtl";
    const baseAlignment = getAlignment(node.attrs || {});

    // Check for images in paragraph
    const hasImage = node.content?.some((item) => isImageNode(item));

    if (hasImage) {
      return processImageParagraph(node, exporter, baseAlignment, isRTL);
    }

    const children = exporter.transformInlineContent(node.content || []);
    return new Paragraph({
      children: children as ParagraphChild[],
      alignment: isRTL ? AlignmentType.START : baseAlignment,
      bidirectional: isRTL ? true : undefined,
      style: "Normal",
      run: { font: "Inter" },
    });
  },

  heading: (node, exporter, _nestingLevel) => {
    const level = (node.attrs?.level as number) || 1;
    const isRTL = node.attrs?.dir === "rtl";

    const headingLevelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };

    const children = exporter.transformInlineContent(node.content || []);
    return new Paragraph({
      children: children as ParagraphChild[],
      heading: headingLevelMap[level] || HeadingLevel.HEADING_1,
      bidirectional: isRTL ? true : undefined,
      alignment: isRTL ? AlignmentType.START : getAlignment(node.attrs || {}),
    });
  },

  bulletList: (node, exporter, nestingLevel) => {
    return processList(node, exporter, nestingLevel, "bullet");
  },

  orderedList: (node, exporter, nestingLevel) => {
    return processList(node, exporter, nestingLevel, "ordered");
  },

  taskList: (node, exporter, _nestingLevel) => {
    const paragraphs: Paragraph[] = [];
    const nodeDir = node.attrs?.dir as string | undefined;

    for (const taskItem of node.content || []) {
      const isChecked = taskItem.attrs?.checked === true;
      const itemDir = (taskItem.attrs?.dir as string | undefined) || nodeDir;

      for (const para of taskItem.content || []) {
        if (para.type === "paragraph") {
          const paraDir = (para.attrs?.dir as string | undefined) || itemDir;
          const isParaRTL = paraDir === "rtl";

          const children = exporter.transformInlineContent(para.content || []);
          paragraphs.push(
            new Paragraph({
              children: [
                new CheckBox({ checked: isChecked }),
                new TextRun({ text: " ", rightToLeft: isParaRTL }),
                ...(children as ParagraphChild[]),
              ],
              bidirectional: isParaRTL ? true : undefined,
              alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {}),
            })
          );
        }
      }
    }

    return paragraphs;
  },

  blockquote: (node, exporter, _nestingLevel) => {
    const paragraphs: Paragraph[] = [];
    const nodeDir = node.attrs?.dir as string | undefined;

    for (const para of node.content || []) {
      const paraDir = (para.attrs?.dir as string | undefined) || nodeDir;
      const isParaRTL = paraDir === "rtl";

      if (para.type === "paragraph") {
        const children = exporter.transformInlineContent(para.content || []);
        paragraphs.push(
          new Paragraph({
            children: children as ParagraphChild[],
            indent: { left: convertInchesToTwip(0.5) },
            bidirectional: isParaRTL ? true : undefined,
            alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {}),
            border: {
              left: {
                color: "7D797A",
                space: 15,
                style: BorderStyle.SINGLE,
                size: 24,
              },
            },
          })
        );
      }
    }

    return paragraphs;
  },

  codeBlock: (node, _exporter, _nestingLevel) => {
    const isRTL = node.attrs?.dir === "rtl";
    const codeLines = node.content?.map((c) => c.text || "").join("\n") || "";

    // Split by newlines and create TextRuns with breaks
    const textRuns = codeLines.split("\n").map((line, index) => {
      return new TextRun({
        text: line,
        break: index > 0 ? 1 : 0,
        font: { name: "JetBrains Mono" },
        size: "10pt",
        rightToLeft: isRTL,
      });
    });

    return new Paragraph({
      children: textRuns,
      style: "Codeblock",
      shading: {
        type: ShadingType.SOLID,
        color: "161616",
        fill: "161616",
      },
      bidirectional: isRTL ? true : undefined,
      alignment: isRTL ? AlignmentType.START : undefined,
    });
  },

  image: async (node, exporter, _nestingLevel) => {
    const result = await createImageParagraph(node, undefined, exporter.isRTL);
    return result || new Paragraph({ children: [] });
  },

  resizableImage: async (node, exporter, _nestingLevel) => {
    const result = await createImageParagraph(node, undefined, exporter.isRTL);
    return result || new Paragraph({ children: [] });
  },

  imageResize: async (node, exporter, _nestingLevel) => {
    const result = await createImageParagraph(node, undefined, exporter.isRTL);
    return result || new Paragraph({ children: [] });
  },

  table: (node, exporter, _nestingLevel) => {
    return createTable(node, exporter);
  },

  horizontalRule: () => {
    return new Paragraph({ thematicBreak: true });
  },

  hardBreak: () => {
    return new Paragraph({ children: [] });
  },

  pageBreak: () => {
    return new Paragraph({
      children: [new PageBreak()],
    });
  },
};

// Helper functions

function isImageNode(node: DocNode): boolean {
  return (
    node.type === "image" ||
    node.type === "resizableImage" ||
    node.type === "imageResize"
  );
}

async function processImageParagraph(
  node: DocNode,
  exporter: DOCXExporterInterface,
  baseAlignment: (typeof AlignmentType)[keyof typeof AlignmentType] | undefined,
  isRTL: boolean
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];

  for (const item of node.content || []) {
    if (isImageNode(item)) {
      const imgParagraph = await createImageParagraph(item, baseAlignment, isRTL);
      if (imgParagraph) paragraphs.push(imgParagraph);
    } else if (item.type === "text") {
      const children = exporter.transformInlineContent([item]);
      paragraphs.push(
        new Paragraph({
          children: children as ParagraphChild[],
          alignment: isRTL ? AlignmentType.START : baseAlignment,
          bidirectional: isRTL ? true : undefined,
        })
      );
    }
  }

  return paragraphs;
}

async function createImageParagraph(
  item: DocNode,
  parentAlignment?: (typeof AlignmentType)[keyof typeof AlignmentType],
  isRTL: boolean = false
): Promise<Paragraph | null> {
  const src = item.attrs?.src as string;
  if (!src) {
    console.warn("Image node has no src:", item);
    return null;
  }

  const imageData = await fetchImageAsArrayBuffer(src);
  if (!imageData) {
    console.warn("Failed to fetch image data for:", src.substring(0, 100));
    return null;
  }

  // Use createImageBitmap for dimension calculation when possible
  let dimensions: { width: number; height: number };
  try {
    const blob = new Blob([imageData]);
    dimensions = await getImageDimensionsFromBlob(blob);
    // Apply constraints
    const maxWidth = 600;
    if (dimensions.width > maxWidth) {
      const ratio = maxWidth / dimensions.width;
      dimensions.width = maxWidth;
      dimensions.height = Math.round(dimensions.height * ratio);
    }
    // Apply any explicit dimensions from attrs
    dimensions = await calculateFinalImageDimensions(item.attrs || {}, src, dimensions);
  } catch {
    dimensions = await calculateFinalImageDimensions(item.attrs || {}, src);
  }

  const imageType = getImageType(src);
  const imageAlignment = getImageAlignment(item.attrs || {});

  // For RTL content: if no explicit alignment, default to RIGHT
  let finalAlignment = imageAlignment || parentAlignment;
  if (isRTL && !finalAlignment) {
    finalAlignment = AlignmentType.RIGHT;
  }

  // Map alignment to horizontal position for floating images
  let horizontalAlign: (typeof HorizontalPositionAlign)[keyof typeof HorizontalPositionAlign] | undefined;
  const alignStr = String(finalAlignment);
  if (alignStr === "right") {
    horizontalAlign = HorizontalPositionAlign.RIGHT;
  } else if (alignStr === "center") {
    horizontalAlign = HorizontalPositionAlign.CENTER;
  } else if (alignStr === "left") {
    horizontalAlign = HorizontalPositionAlign.LEFT;
  }

  // Create caption if present
  const caption = item.attrs?.caption as string | undefined;

  // If we have explicit alignment, use floating image for reliable positioning
  if (horizontalAlign) {
    return new Paragraph({
      children: [
        new ImageRun({
          data: imageData,
          transformation: { width: dimensions.width, height: dimensions.height },
          type: imageType,
          altText: caption
            ? { description: caption, name: caption, title: caption }
            : undefined,
          floating: {
            horizontalPosition: {
              relative: HorizontalPositionRelativeFrom.MARGIN,
              align: horizontalAlign,
            },
            verticalPosition: {
              relative: VerticalPositionRelativeFrom.PARAGRAPH,
              align: VerticalPositionAlign.TOP,
            },
            wrap: { type: TextWrappingType.TOP_AND_BOTTOM },
          },
        }),
      ],
      bidirectional: isRTL ? true : undefined,
    });
  }

  // Fallback to inline image with paragraph alignment
  return new Paragraph({
    children: [
      new ImageRun({
        data: imageData,
        transformation: { width: dimensions.width, height: dimensions.height },
        type: imageType,
        altText: caption
          ? { description: caption, name: caption, title: caption }
          : undefined,
      }),
    ],
    alignment: finalAlignment,
    bidirectional: isRTL ? true : undefined,
  });
}

function processList(
  node: DocNode,
  exporter: DOCXExporterInterface,
  nestingLevel: number,
  listType: "bullet" | "ordered"
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const nodeDir = node.attrs?.dir as string | undefined;

  const processListItems = (items: DocNode[], level: number, parentDir?: string) => {
    for (const listItem of items) {
      const itemDir = (listItem.attrs?.dir as string | undefined) || parentDir || nodeDir;

      for (const content of listItem.content || []) {
        if (content.type === "bulletList" || content.type === "orderedList") {
          // Nested list
          processListItems(content.content || [], level + 1, itemDir);
        } else if (content.type === "paragraph") {
          const paraDir = (content.attrs?.dir as string | undefined) || itemDir;
          const isParaRTL = paraDir === "rtl";

          const children = exporter.transformInlineContent(content.content || []);
          paragraphs.push(
            new Paragraph({
              children: children as ParagraphChild[],
              numbering:
                listType === "ordered"
                  ? { reference: "goateditor-numbered-list", level }
                  : undefined,
              bullet: listType === "bullet" ? { level } : undefined,
              bidirectional: isParaRTL ? true : undefined,
              alignment: isParaRTL ? AlignmentType.START : getAlignment(content.attrs || {}),
            })
          );
        }
      }
    }
  };

  processListItems(node.content || [], nestingLevel, nodeDir);
  return paragraphs;
}

