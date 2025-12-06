import {
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TableLayoutType,
  CheckBox,
  convertInchesToTwip,
  ShadingType,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  TextWrappingType,
} from "docx";
import type { DocNode } from "./types";
import { getAlignment, getImageAlignment } from "./style-utils";
import { getImageType, fetchImageAsArrayBuffer, calculateFinalImageDimensions } from "./image-utils";
import { processTextContent } from "./text-processor";

/**
 * Check if a node is an image node
 */
export const isImageNode = (node: DocNode): boolean => {
  return node.type === "image" || node.type === "resizableImage" || node.type === "imageResize";
};

/**
 * Create a paragraph containing an image with proper alignment
 */
export const createImageParagraph = async (
  item: DocNode,
  parentAlignment?: (typeof AlignmentType)[keyof typeof AlignmentType],
  isRTL: boolean = false
): Promise<Paragraph | null> => {
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

  // Use async dimension calculation to preserve aspect ratio
  const { width, height } = await calculateFinalImageDimensions(item.attrs || {}, src);
  const imageType = getImageType(src);
  const imageAlignment = getImageAlignment(item.attrs || {});
  
  // Debug: Log image alignment info
  console.log("Image alignment debug:", {
    attrs: item.attrs,
    containerStyle: item.attrs?.containerStyle,
    imageAlignment,
    parentAlignment,
    isRTL
  });
  
  // For RTL content: if no explicit alignment, default to RIGHT (which is the natural start for RTL)
  // If there's an explicit alignment, use it; otherwise use parent alignment or RTL default
  let finalAlignment = imageAlignment || parentAlignment;
  if (isRTL && !finalAlignment) {
    finalAlignment = AlignmentType.RIGHT;
  }
  
  console.log("Final image alignment:", finalAlignment);

  // Use floating positioning for explicit alignment (more reliable in DOCX)
  // Map alignment to horizontal position
  let horizontalAlign: typeof HorizontalPositionAlign[keyof typeof HorizontalPositionAlign] | undefined;
  const alignStr = String(finalAlignment);
  if (alignStr === "right") {
    horizontalAlign = HorizontalPositionAlign.RIGHT;
  } else if (alignStr === "center") {
    horizontalAlign = HorizontalPositionAlign.CENTER;
  } else if (alignStr === "left") {
    horizontalAlign = HorizontalPositionAlign.LEFT;
  }

  console.log("Using horizontal align:", horizontalAlign);

  // If we have explicit alignment, use floating image for reliable positioning
  if (horizontalAlign) {
    return new Paragraph({
      children: [
        new ImageRun({
          data: imageData,
          transformation: { width, height },
          type: imageType,
          floating: {
            horizontalPosition: {
              relative: HorizontalPositionRelativeFrom.MARGIN,
              align: horizontalAlign,
            },
            verticalPosition: {
              relative: VerticalPositionRelativeFrom.PARAGRAPH,
              align: VerticalPositionAlign.TOP,
            },
            wrap: {
              type: TextWrappingType.TOP_AND_BOTTOM,
            },
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
        transformation: { width, height },
        type: imageType,
      }),
    ],
    alignment: finalAlignment,
    bidirectional: isRTL ? true : undefined,
  });
};

/**
 * Context for node processing (tracks list counters and direction)
 */
export interface ProcessingContext {
  documentChildren: (Paragraph | Table)[];
  bulletListInstanceCounter: number;
  orderedListInstanceCounter: number;
  lastKnownDirection: "rtl" | "ltr" | null;
}

/**
 * Create initial processing context
 */
export const createProcessingContext = (): ProcessingContext => ({
  documentChildren: [],
  bulletListInstanceCounter: 0,
  orderedListInstanceCounter: 0,
  lastKnownDirection: null,
});

/**
 * Process a single TipTap node and add to document children
 */
export const processNode = async (
  node: DocNode,
  context: ProcessingContext,
  listLevel: number = 0
): Promise<void> => {
  const nodeDir = node.attrs?.dir as string | undefined;
  const isNodeRTL = nodeDir === "rtl";
  
  // Update direction tracking when we see text content with direction
  if (nodeDir) {
    context.lastKnownDirection = nodeDir as "rtl" | "ltr";
  }

  switch (node.type) {
    case "paragraph": {
      const hasImage = node.content?.some((item) => isImageNode(item));
      const baseAlignment = getAlignment(node.attrs || {});

      // For RTL: bidirectional + START alignment (START = right side in RTL mode)
      const rtlOptions = isNodeRTL
        ? { bidirectional: true, alignment: AlignmentType.START }
        : {};

      if (hasImage) {
        for (const item of node.content || []) {
          if (isImageNode(item)) {
            const imgParagraph = await createImageParagraph(item, baseAlignment, isNodeRTL);
            if (imgParagraph) context.documentChildren.push(imgParagraph);
          } else if (item.type === "text") {
            const textChildren = processTextContent([item], isNodeRTL);
            context.documentChildren.push(
              new Paragraph({
                children: textChildren,
                alignment: isNodeRTL ? AlignmentType.START : baseAlignment,
                ...rtlOptions,
              })
            );
          }
        }
      } else {
        const textChildren = processTextContent(node.content || [], isNodeRTL);
        context.documentChildren.push(
          new Paragraph({
            children: textChildren,
            alignment: isNodeRTL ? AlignmentType.START : baseAlignment,
            ...rtlOptions,
          })
        );
      }
      break;
    }

    case "image":
    case "resizableImage":
    case "imageResize": {
      // For standalone images, use the tracked direction context if no explicit direction
      const effectiveRTL = isNodeRTL || (context.lastKnownDirection === "rtl");
      console.log("Standalone image - isNodeRTL:", isNodeRTL, "lastKnownDirection:", context.lastKnownDirection, "effectiveRTL:", effectiveRTL);
      const imgParagraph = await createImageParagraph(node, undefined, effectiveRTL);
      if (imgParagraph) context.documentChildren.push(imgParagraph);
      break;
    }

    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const headingLevelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };

      context.documentChildren.push(
        new Paragraph({
          children: processTextContent(node.content || [], isNodeRTL),
          heading: headingLevelMap[level] || HeadingLevel.HEADING_1,
          bidirectional: isNodeRTL ? true : undefined,
          alignment: isNodeRTL ? AlignmentType.START : getAlignment(node.attrs || {}),
        })
      );
      break;
    }

    case "bulletList": {
      context.bulletListInstanceCounter++;

      const processListItems = async (items: DocNode[], level: number, parentDir?: string) => {
        for (const listItem of items) {
          // Direction inheritance: list → listItem → paragraph
          const itemDir = (listItem.attrs?.dir as string | undefined) || parentDir || nodeDir;
          const isItemRTL = itemDir === "rtl";

          for (const content of listItem.content || []) {
            if (content.type === "bulletList" || content.type === "orderedList") {
              // Nested list - pass direction down
              await processListItems(content.content || [], level + 1, itemDir);
            } else if (content.type === "paragraph") {
              // Check paragraph direction (most specific)
              const paraDir = (content.attrs?.dir as string | undefined) || itemDir;
              const isParaRTL = paraDir === "rtl";

              context.documentChildren.push(
                new Paragraph({
                  children: processTextContent(content.content || [], isParaRTL),
                  bullet: { level },
                  bidirectional: isParaRTL ? true : undefined,
                  alignment: isParaRTL ? AlignmentType.START : getAlignment(content.attrs || {}),
                })
              );
            }
          }
        }
      };

      await processListItems(node.content || [], listLevel, nodeDir);
      break;
    }

    case "orderedList": {
      context.orderedListInstanceCounter++;
      const currentInstance = context.orderedListInstanceCounter;

      const processOrderedListItems = async (items: DocNode[], level: number, parentDir?: string) => {
        for (const listItem of items) {
          // Direction inheritance: list → listItem → paragraph
          const itemDir = (listItem.attrs?.dir as string | undefined) || parentDir || nodeDir;
          const isItemRTL = itemDir === "rtl";

          for (const content of listItem.content || []) {
            if (content.type === "bulletList" || content.type === "orderedList") {
              // Nested list - pass direction down
              await processOrderedListItems(content.content || [], level + 1, itemDir);
            } else if (content.type === "paragraph") {
              // Check paragraph direction (most specific)
              const paraDir = (content.attrs?.dir as string | undefined) || itemDir;
              const isParaRTL = paraDir === "rtl";

              context.documentChildren.push(
                new Paragraph({
                  children: processTextContent(content.content || [], isParaRTL),
                  numbering: {
                    reference: "ordered-list-numbering",
                    level,
                    instance: currentInstance,
                  },
                  bidirectional: isParaRTL ? true : undefined,
                  alignment: isParaRTL ? AlignmentType.START : getAlignment(content.attrs || {}),
                })
              );
            }
          }
        }
      };

      await processOrderedListItems(node.content || [], listLevel, nodeDir);
      break;
    }

    case "taskList": {
      for (const taskItem of node.content || []) {
        const isChecked = taskItem.attrs?.checked === true;
        const itemDir = (taskItem.attrs?.dir as string | undefined) || nodeDir;
        const isItemRTL = itemDir === "rtl";

        for (const para of taskItem.content || []) {
          if (para.type === "paragraph") {
            const paraDir = (para.attrs?.dir as string | undefined) || itemDir;
            const isParaRTL = paraDir === "rtl";

            context.documentChildren.push(
              new Paragraph({
                children: [
                  new CheckBox({ checked: isChecked }),
                  new TextRun({ text: " ", rightToLeft: isParaRTL }),
                  ...processTextContent(para.content || [], isParaRTL),
                ],
                bidirectional: isParaRTL ? true : undefined,
                alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {}),
              })
            );
          }
        }
      }
      break;
    }

    case "table": {
      const firstRow = node.content?.[0];
      const firstCell = firstRow?.content?.[0];
      const firstPara = firstCell?.content?.[0];
      const isTableRTL =
        firstPara?.attrs?.dir === "rtl" ||
        firstCell?.attrs?.dir === "rtl" ||
        firstRow?.attrs?.dir === "rtl" ||
        node.attrs?.dir === "rtl";

      const columnCount = firstRow?.content?.length || 1;
      const totalTableWidth = 9000;
      const columnWidth = Math.floor(totalTableWidth / columnCount);
      const columnWidths = Array(columnCount).fill(columnWidth);

      const tableRows =
        node.content?.map((row) => {
          const cells =
            row.content?.map((cell, cellIndex) => {
              const cellParagraphs =
                cell.content?.map((para) => {
                  const paraDir =
                    (para.attrs?.dir as string | undefined) ||
                    (cell.attrs?.dir as string | undefined) ||
                    (row.attrs?.dir as string | undefined) ||
                    (node.attrs?.dir as string | undefined);
                  const isParaRTL = paraDir === "rtl" || isTableRTL;

                  return new Paragraph({
                    children: processTextContent(para.content || [], isParaRTL),
                    bidirectional: isParaRTL ? true : undefined,
                    alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {}),
                  });
                }) || [new Paragraph({ children: [] })];

              return new TableCell({
                children: cellParagraphs,
                width: { size: columnWidths[cellIndex] || columnWidth, type: WidthType.DXA },
              });
            }) || [];
          return new TableRow({ children: cells });
        }) || [];

      if (tableRows.length > 0) {
        context.documentChildren.push(
          new Table({
            rows: tableRows,
            columnWidths: columnWidths,
            layout: TableLayoutType.FIXED,
            visuallyRightToLeft: isTableRTL,
            width: { size: totalTableWidth, type: WidthType.DXA },
          })
        );
      }
      break;
    }

    case "blockquote": {
      for (const para of node.content || []) {
        const paraDir = (para.attrs?.dir as string | undefined) || nodeDir;
        const isParaRTL = paraDir === "rtl";

        if (para.type === "paragraph") {
          context.documentChildren.push(
            new Paragraph({
              children: processTextContent(para.content || [], isParaRTL),
              indent: { left: convertInchesToTwip(0.5) },
              bidirectional: isParaRTL ? true : undefined,
              alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {}),
              shading: { type: ShadingType.SOLID, color: "F5F5F5", fill: "F5F5F5" },
            })
          );
        } else {
          // Nested content in blockquote
          await processNode(para, context);
        }
      }
      break;
    }

    case "codeBlock": {
      const codeLines = node.content?.map((c) => c.text || "").join("\n") || "";
      
      context.documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLines,
              font: { name: "Courier New" },
              size: "10pt",
              rightToLeft: isNodeRTL,
            }),
          ],
          shading: { type: ShadingType.SOLID, color: "F0F0F0", fill: "F0F0F0" },
          bidirectional: isNodeRTL ? true : undefined,
          alignment: isNodeRTL ? AlignmentType.START : undefined,
        })
      );
      break;
    }

    case "horizontalRule":
      context.documentChildren.push(
        new Paragraph({
          thematicBreak: true,
        })
      );
      break;

    case "hardBreak":
      context.documentChildren.push(new Paragraph({ children: [] }));
      break;

    default:
      // Process nested content for unknown node types
      if (node.content) {
        for (const child of node.content) {
          await processNode(child, context, listLevel);
        }
      }
  }
};

