"use client";

import Link from "next/link";
import Image from "next/image";
import { BsFilePdf, BsFileWord } from "react-icons/bs";
import {
  Document,
  Packer,
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
  ExternalHyperlink,
  LevelFormat,
  CheckBox,
  convertInchesToTwip,
  ShadingType,
  UnderlineType,
} from "docx";
import { saveAs } from "file-saver"; 
import {
  BoldIcon,
  ImportIcon,
  FileIcon,
  FileJsonIcon,
  FilePenIcon,
  FilePlus,
  FileTextIcon,
  FileUpIcon,
  GlobeIcon,
  ItalicIcon,
  PrinterIcon,
  Redo2Icon,
  RemoveFormattingIcon,
  StrikethroughIcon,
  TextIcon,
  TrashIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

import { DocumentInput } from "./document-input";
import { useEditorStore } from "@/store/use-editor-store";
import { useState } from "react";

export const Navbar = () => {
  const { editor } = useEditorStore();

  const insertTable = ({ rows, cols }: { rows: number; cols: number }) => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: false })
      .run();
  };

  const onDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const onSaveJSON = () => {
    if (!editor) return;

    const content = editor.getJSON();
    const blob = new Blob([JSON.stringify(content)], {
      type: "application/json",
    });
    onDownload(blob, "document.json"); //TODO: Use document name
  };

  const onSaveHTML = () => {
    if (!editor) return;

    const content = editor.getHTML();
    const blob = new Blob([content], {
      type: "text/html",
    });
    onDownload(blob, "document.html"); //TODO: Use document name
  };

  const onSaveText = () => {
    if (!editor) return;

    const content = editor.getHTML();
    const blob = new Blob([content], {
      type: "text/plain",
    });
    onDownload(blob, "document.txt"); //TODO: Use document name
  };

  const onSaveDocx = async () => {
    if (!editor) return;

    const json = editor.getJSON();
    console.log("Editor JSON for DOCX export:", JSON.stringify(json, null, 2));
    const documentChildren: (Paragraph | Table)[] = [];

    // Type definitions for TipTap JSON nodes
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

    // ==================== Image Utilities ====================
    
    const getImageType = (src: string): "png" | "jpg" | "gif" | "bmp" => {
      if (src.startsWith("data:")) {
        const mimeMatch = src.match(/data:image\/(\w+)/);
        if (mimeMatch) {
          const mime = mimeMatch[1].toLowerCase();
          if (mime === "jpeg" || mime === "jpg") return "jpg";
          if (mime === "gif") return "gif";
          if (mime === "bmp") return "bmp";
        }
        return "png";
      }
      const ext = src.split(".").pop()?.toLowerCase().split("?")[0];
      if (ext === "jpg" || ext === "jpeg") return "jpg";
      if (ext === "gif") return "gif";
      if (ext === "bmp") return "bmp";
      return "png";
    };

    const fetchImageAsArrayBuffer = async (src: string): Promise<ArrayBuffer | null> => {
      try {
        if (src.startsWith("data:")) {
          const base64Data = src.split(",")[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        }

        if (src.startsWith("blob:")) {
          const response = await fetch(src);
          if (!response.ok) throw new Error("Failed to fetch blob image");
          return await response.arrayBuffer();
        }

        try {
          const response = await fetch(src);
          if (!response.ok) throw new Error("Failed to fetch image");
          return await response.arrayBuffer();
        } catch {
          return await loadImageViaCanvas(src);
        }
      } catch (error) {
        console.error("Error fetching image:", error);
        return null;
      }
    };

    const loadImageViaCanvas = (src: string): Promise<ArrayBuffer | null> => {
      return new Promise((resolve) => {
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                blob.arrayBuffer().then(resolve).catch(() => resolve(null));
              } else {
                resolve(null);
              }
            }, "image/png");
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    // ==================== Dimension & Style Utilities ====================

    const parseDimension = (value: unknown): number | null => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const extractStyleDimensions = (style: string): { width: number | null; height: number | null } => {
      let width: number | null = null;
      let height: number | null = null;

      const widthMatch = style.match(/width:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
      if (widthMatch) width = parseFloat(widthMatch[1]);

      const heightMatch = style.match(/height:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
      if (heightMatch) height = parseFloat(heightMatch[1]);

      return { width, height };
    };

    const extractStyleAlignment = (style: string): string | null => {
      const floatMatch = style.match(/float:\s*(left|right)/i);
      if (floatMatch) return floatMatch[1].toLowerCase();

      if (
        style.includes("margin: 0 auto") ||
        style.includes("margin:0 auto") ||
        (style.includes("margin-left: auto") && style.includes("margin-right: auto"))
      ) {
        return "center";
      }

      const textAlignMatch = style.match(/text-align:\s*(left|center|right)/i);
      if (textAlignMatch) return textAlignMatch[1].toLowerCase();

      return null;
    };

    const getImageDimensions = (attrs: Record<string, unknown>): { width: number; height: number } => {
      const maxWidth = 600;
      let width: number | null = null;
      let height: number | null = null;

      if (attrs?.style && typeof attrs.style === "string") {
        const styleDims = extractStyleDimensions(attrs.style);
        if (styleDims.width) width = styleDims.width;
        if (styleDims.height) height = styleDims.height;
      }

      const attrWidth = parseDimension(attrs?.width);
      const attrHeight = parseDimension(attrs?.height);
      if (attrWidth) width = attrWidth;
      if (attrHeight) height = attrHeight;

      // If we have both dimensions, use them
      if (width && height) {
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        return { width: Math.round(width), height: Math.round(height) };
      }

      // If only one dimension, return it with null for the other (will be resolved later)
      // If neither dimension, default to reasonable size
      if (!width) width = 300;
      if (!height) height = 300; // Default to square if only width provided

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }

      return { width: Math.round(width), height: Math.round(height) };
    };

    // Get actual image dimensions by loading the image
    const getActualImageDimensions = (src: string): Promise<{ naturalWidth: number; naturalHeight: number } | null> => {
      return new Promise((resolve) => {
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        img.onload = () => {
          resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    const calculateFinalImageDimensions = async (
      attrs: Record<string, unknown>,
      src: string
    ): Promise<{ width: number; height: number }> => {
      const maxWidth = 600;
      
      // Debug: log all image attrs to see what TipTap stores
      console.log("Image attrs for dimension calculation:", JSON.stringify(attrs, null, 2));
      
      // First try to get dimensions from attrs - check multiple possible attribute names
      let width: number | null = null;
      let height: number | null = null;

      // Check containerStyle attribute (used by tiptap-extension-resize-image)
      if (attrs?.containerStyle && typeof attrs.containerStyle === "string") {
        const containerStyleDims = extractStyleDimensions(attrs.containerStyle);
        console.log("Extracted from containerStyle:", containerStyleDims);
        if (containerStyleDims.width) width = containerStyleDims.width;
        if (containerStyleDims.height) height = containerStyleDims.height;
      }

      // Check style attribute
      if (attrs?.style && typeof attrs.style === "string") {
        const styleDims = extractStyleDimensions(attrs.style);
        if (styleDims.width) width = styleDims.width;
        if (styleDims.height) height = styleDims.height;
      }

      // Check direct width/height attributes
      const attrWidth = parseDimension(attrs?.width);
      const attrHeight = parseDimension(attrs?.height);
      if (attrWidth) width = attrWidth;
      if (attrHeight) height = attrHeight;

      // Check data-* attributes (common for resizable images)
      const dataWidth = parseDimension(attrs?.["data-width"]);
      const dataHeight = parseDimension(attrs?.["data-height"]);
      if (dataWidth) width = dataWidth;
      if (dataHeight) height = dataHeight;

      // Check resized* attributes
      const resizedWidth = parseDimension(attrs?.resizedWidth);
      const resizedHeight = parseDimension(attrs?.resizedHeight);
      if (resizedWidth) width = resizedWidth;
      if (resizedHeight) height = resizedHeight;

      console.log("Parsed dimensions from attrs - width:", width, "height:", height);

      // If we have both dimensions from attrs, use them
      if (width && height) {
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        return { width: Math.round(width), height: Math.round(height) };
      }

      // If we have at least one dimension, try to get aspect ratio from actual image
      const actualDims = await getActualImageDimensions(src);
      
      if (actualDims) {
        const { naturalWidth, naturalHeight } = actualDims;
        const aspectRatio = naturalHeight / naturalWidth;
        console.log("Natural dimensions:", naturalWidth, "x", naturalHeight, "ratio:", aspectRatio);

        if (width && !height) {
          // We have width, calculate height preserving aspect ratio
          height = Math.round(width * aspectRatio);
        } else if (height && !width) {
          // We have height, calculate width preserving aspect ratio
          width = Math.round(height / aspectRatio);
        } else {
          // No dimensions provided - use natural dimensions but cap at maxWidth
          width = naturalWidth;
          height = naturalHeight;
        }

        // Apply max width constraint while preserving aspect ratio
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        return { width: Math.round(width), height: Math.round(height) };
      }

      // Fallback if we can't load the image
      if (!width) width = 300;
      if (!height) height = 300;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }

      return { width: Math.round(width), height: Math.round(height) };
    };

    // ==================== Alignment Utilities ====================

    const getAlignment = (attrs: Record<string, unknown>): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined => {
      if (!attrs?.textAlign) return undefined;
      const alignMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
        left: AlignmentType.LEFT,
        center: AlignmentType.CENTER,
        right: AlignmentType.RIGHT,
        justify: AlignmentType.JUSTIFIED,
      };
      return alignMap[attrs.textAlign as string];
    };

    const getImageAlignment = (attrs: Record<string, unknown>): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined => {
      if (attrs?.align) {
        const align = (attrs.align as string).toLowerCase();
        if (align === "center") return AlignmentType.CENTER;
        if (align === "right") return AlignmentType.RIGHT;
        if (align === "left") return AlignmentType.LEFT;
      }

      if (attrs?.style && typeof attrs.style === "string") {
        const styleAlign = extractStyleAlignment(attrs.style);
        if (styleAlign === "center") return AlignmentType.CENTER;
        if (styleAlign === "right") return AlignmentType.RIGHT;
        if (styleAlign === "left") return AlignmentType.LEFT;
      }

      if (attrs?.textAlign) {
        const align = (attrs.textAlign as string).toLowerCase();
        if (align === "center") return AlignmentType.CENTER;
        if (align === "right") return AlignmentType.RIGHT;
        if (align === "left") return AlignmentType.LEFT;
      }

      return undefined;
    };

    // ==================== Color Utilities ====================

    const normalizeColor = (color: string | undefined): string | undefined => {
      if (!color) return undefined;
      // Remove # prefix if present
      let normalized = color.replace(/^#/, "");
      // Handle rgb() format
      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
        const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
        const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
        normalized = `${r}${g}${b}`;
      }
      return normalized.toUpperCase();
    };

    // Map TipTap highlight colors to docx HighlightColor names
    const mapHighlightColor = (color: string): string | undefined => {
      const colorMap: Record<string, string> = {
        yellow: "yellow",
        green: "green",
        cyan: "cyan",
        magenta: "magenta",
        blue: "blue",
        red: "red",
        darkBlue: "darkBlue",
        darkCyan: "darkCyan",
        darkGreen: "darkGreen",
        darkMagenta: "darkMagenta",
        darkRed: "darkRed",
        darkYellow: "darkYellow",
        darkGray: "darkGray",
        lightGray: "lightGray",
        black: "black",
        white: "white",
      };
      return colorMap[color.toLowerCase()] || undefined;
    };

    // ==================== Text Processing ====================

    const processTextContent = (content: DocNode[], isRTL: boolean = false): ParagraphChild[] => {
      if (!content || content.length === 0) {
        return [new TextRun({ text: "", rightToLeft: isRTL })];
      }

      const result: ParagraphChild[] = [];

      for (const item of content) {
        if (item.type === "text") {
          const marks = item.marks || [];

          // Extract formatting from marks
          const isBold = marks.some((m) => m.type === "bold");
          const isItalic = marks.some((m) => m.type === "italic");
          const isUnderline = marks.some((m) => m.type === "underline");
          const isStrike = marks.some((m) => m.type === "strike");
          const isSubscript = marks.some((m) => m.type === "subscript");
          const isSuperscript = marks.some((m) => m.type === "superscript");
          const isCode = marks.some((m) => m.type === "code");

          // Extract color mark
          const textColorMark = marks.find((m) => m.type === "textStyle");
          const textColor = normalizeColor(textColorMark?.attrs?.color as string | undefined);

          // Extract highlight mark
          const highlightMark = marks.find((m) => m.type === "highlight");
          const highlightColorAttr = highlightMark?.attrs?.color as string | undefined;
          const highlight = highlightColorAttr ? mapHighlightColor(highlightColorAttr) : undefined;

          // Extract font family from textStyle mark
          const fontFamily = textColorMark?.attrs?.fontFamily as string | undefined;

          // Extract font size (in pt or px)
          const fontSizeAttr = textColorMark?.attrs?.fontSize as string | undefined;
          let fontSize: `${number}pt` | number | undefined;
          if (fontSizeAttr) {
            // Parse fontSize - can be "12pt", "16px", etc.
            const sizeMatch = fontSizeAttr.match(/^(\d+(?:\.\d+)?)(pt|px)?$/);
            if (sizeMatch) {
              const value = parseFloat(sizeMatch[1]);
              const unit = sizeMatch[2] || "pt";
              // docx uses half-points for number, or string like "12pt"
              fontSize = unit === "px" 
                ? `${Math.round(value * 0.75)}pt` as `${number}pt`
                : `${value}pt` as `${number}pt`;
            }
          }

          // Check for link mark
          const linkMark = marks.find((m) => m.type === "link");
          if (linkMark && linkMark.attrs?.href) {
            result.push(
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: item.text || "",
                    style: "Hyperlink",
                    bold: isBold,
                    italics: isItalic,
                    underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
                    strike: isStrike,
                    rightToLeft: isRTL,
                    color: textColor,
                    size: fontSize,
                    font: fontFamily ? { name: fontFamily } : undefined,
                  }),
                ],
                link: linkMark.attrs.href as string,
              })
            );
          } else {
            result.push(
              new TextRun({
                text: item.text || "",
                bold: isBold,
                italics: isItalic,
                underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
                strike: isStrike,
                subScript: isSubscript,
                superScript: isSuperscript,
                rightToLeft: isRTL,
                color: textColor,
                highlight: highlight as "yellow" | "green" | "cyan" | "magenta" | "blue" | "red" | "darkBlue" | "darkCyan" | "darkGreen" | "darkMagenta" | "darkRed" | "darkYellow" | "darkGray" | "lightGray" | "black" | "white" | undefined,
                size: fontSize,
                font: isCode ? { name: "Courier New" } : fontFamily ? { name: fontFamily } : undefined,
                // Use shading for custom highlight colors not in the standard list
                shading: highlightColorAttr && !highlight
                  ? { type: ShadingType.SOLID, color: normalizeColor(highlightColorAttr), fill: normalizeColor(highlightColorAttr) }
                  : undefined,
              })
            );
          }
        } else if (item.type === "hardBreak") {
          result.push(new TextRun({ break: 1 }));
        }
      }

      return result.length > 0 ? result : [new TextRun({ text: "", rightToLeft: isRTL })];
    };

    // ==================== Node Type Checks ====================

    const isImageNode = (node: DocNode): boolean => {
      return node.type === "image" || node.type === "resizableImage" || node.type === "imageResize";
    };

    // ==================== Image Paragraph Creation ====================

    const createImageParagraph = async (
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
      
      // For RTL content: if no explicit alignment, default to RIGHT (which is the natural start for RTL)
      // If there's an explicit alignment, use it; otherwise use parent alignment or RTL default
      let finalAlignment = imageAlignment || parentAlignment;
      if (isRTL && !finalAlignment) {
        finalAlignment = AlignmentType.RIGHT;
      }

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

    // ==================== List Level Tracking ====================

    let bulletListInstanceCounter = 0;
    let orderedListInstanceCounter = 0;

    // ==================== Main Node Processing ====================

    const processNode = async (node: DocNode, listLevel: number = 0): Promise<void> => {
      const nodeDir = node.attrs?.dir as string | undefined;
      const isNodeRTL = nodeDir === "rtl";

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
                if (imgParagraph) documentChildren.push(imgParagraph);
              } else if (item.type === "text") {
                const textChildren = processTextContent([item], isNodeRTL);
                documentChildren.push(
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
            documentChildren.push(
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
          const imgParagraph = await createImageParagraph(node, undefined, isNodeRTL);
          if (imgParagraph) documentChildren.push(imgParagraph);
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

          documentChildren.push(
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
          bulletListInstanceCounter++;

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

                  documentChildren.push(
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
          orderedListInstanceCounter++;
          const currentInstance = orderedListInstanceCounter;

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

                  documentChildren.push(
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

                documentChildren.push(
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
            documentChildren.push(
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
              documentChildren.push(
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
              await processNode(para);
            }
          }
          break;
        }

        case "codeBlock": {
          const codeLines = node.content?.map((c) => c.text || "").join("\n") || "";
          
          documentChildren.push(
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
          documentChildren.push(
            new Paragraph({
              thematicBreak: true,
            })
          );
          break;

        case "hardBreak":
          documentChildren.push(new Paragraph({ children: [] }));
          break;

        default:
          // Process nested content for unknown node types
          if (node.content) {
            for (const child of node.content) {
              await processNode(child, listLevel);
            }
          }
      }
    };

    // Process all nodes
    for (const node of (json.content || []) as DocNode[]) {
      await processNode(node);
    }

    // Create the document with proper numbering configuration
    const doc = new Document({
      creator: "TipTap Editor",
      title: "Document",
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: "11pt",
            },
          },
          hyperlink: {
            run: {
              color: "0563C1",
              underline: { type: UnderlineType.SINGLE },
            },
          },
        },
      },
      numbering: {
        config: [
          {
            reference: "ordered-list-numbering",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1.",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
              {
                level: 1,
                format: LevelFormat.LOWER_LETTER,
                text: "%2.",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(1), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
              {
                level: 2,
                format: LevelFormat.LOWER_ROMAN,
                text: "%3.",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(1.5), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
              {
                level: 3,
                format: LevelFormat.DECIMAL,
                text: "%4.",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(2), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
            ],
          },
        ],
      },
      sections: [
        {
          children: documentChildren.length > 0
            ? documentChildren
            : [new Paragraph({ children: [new TextRun("")] })],
        },
      ],
    });

    // Generate and download using Packer
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "document.docx");
  };

  // State to hold dynamic row and column values
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);

  const handleInsertTable = () => {
    insertTable({ rows, cols });
  };

  // State to track full screen status
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    const element = document.documentElement; // Or any specific element you want to make fullscreen

    if (
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    ) {
      // If already in fullscreen, exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }

      setIsFullScreen(false); // Update the state to reflect exiting fullscreen
    } else {
      // If not in fullscreen, request fullscreen
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen();
      }

      setIsFullScreen(true); // Update the state to reflect entering fullscreen
    }
  };

  return (
    <nav data-testid="navbar" className="flex items-center justify-between">
      <div className="flex gap-2 items-center">
        <Link href="/" data-testid="navbar-logo">
          <Image
            src="/IITG_Logo_20241210_01.png"
            alt="Logo"
            width={36}
            height={36}
          />
        </Link>
        <div className="flex flex-col">
          <DocumentInput />
          <div className="flex">
            <Menubar className="border-none bg-transparent shadow-none h-auto p-0">
              {/* File Menu */}
              <MenubarMenu>
                <MenubarTrigger data-testid="menu-file" className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  File
                </MenubarTrigger>
                <MenubarContent className="print:hidden">
                  <MenubarSub>
                    <MenubarSubTrigger data-testid="menu-file-save">
                      <FileIcon className="size-4 mr-2" />
                      Save
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarItem data-testid="menu-file-save-docx" onClick={onSaveDocx}>
                        <BsFileWord className="size-4 mr-2" />
                        Word (.docx)
                      </MenubarItem>
                      <MenubarItem data-testid="menu-file-save-pdf" onClick={() => window.print()}>
                        <BsFilePdf className="size-4 mr-2" />
                        PDF
                      </MenubarItem>
                      <MenubarItem data-testid="menu-file-save-text" onClick={onSaveText}>
                        <FileTextIcon className="size-4 mr-2" />
                        Text
                      </MenubarItem>
                    </MenubarSubContent>
                  </MenubarSub>
                  <MenubarItem data-testid="menu-file-import">
                    <ImportIcon className="size-4 mr-2" />
                    Import / Open
                  </MenubarItem>
                  <MenubarItem data-testid="menu-file-new">
                    <FilePlus className="size-4 mr-2" />
                    New Document
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem data-testid="menu-file-rename">
                    <FilePenIcon className="size-4 mr-2" />
                    Rename
                  </MenubarItem>
                  <MenubarItem data-testid="menu-file-remove">
                    <TrashIcon className="size-4 mr-2" />
                    Remove
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem data-testid="menu-file-print" onClick={() => window.print()}>
                    <PrinterIcon className="size-4 mr-2" />
                    Print <MenubarShortcut>⌘P</MenubarShortcut>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Edit Menu */}
              <MenubarMenu>
                <MenubarTrigger data-testid="menu-edit" className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Edit
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarItem
                    data-testid="menu-edit-undo"
                    onClick={() => editor?.chain().focus().undo().run()}
                  >
                    <Undo2Icon className="size-4 mr-2" />
                    Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem
                    data-testid="menu-edit-redo"
                    onClick={() => editor?.chain().focus().redo().run()}
                  >
                    <Redo2Icon className="size-4 mr-2" />
                    Redo <MenubarShortcut>⌘Y</MenubarShortcut>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Insert Menu */}
              <MenubarMenu>
                <MenubarTrigger data-testid="menu-insert" className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Insert
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarSub>
                    <MenubarSubTrigger data-testid="menu-insert-table">Table</MenubarSubTrigger>
                    <MenubarSubContent>
                      <div className="p-2">
                        <div className="mb-2">
                          <label htmlFor="rows" className="text-sm">
                            Rows:
                          </label>
                          <input
                            type="number"
                            id="rows"
                            data-testid="menu-insert-table-rows"
                            value={rows}
                            onChange={(e) => setRows(Number(e.target.value))}
                            min="1"
                            className="ml-2 p-1 border rounded-sm"
                          />
                        </div>
                        <div className="mb-2">
                          <label htmlFor="cols" className="text-sm">
                            Columns:
                          </label>
                          <input
                            type="number"
                            id="cols"
                            data-testid="menu-insert-table-cols"
                            value={cols}
                            onChange={(e) => setCols(Number(e.target.value))}
                            min="1"
                            className="ml-2 p-1 border rounded-sm"
                          />
                        </div>
                        <MenubarItem
                          data-testid="menu-insert-table-submit"
                          onClick={handleInsertTable}
                          className="text-sm p-1 hover:bg-muted"
                        >
                          Insert Table ({rows} X {cols})
                        </MenubarItem>
                      </div>
                    </MenubarSubContent>
                  </MenubarSub>
                </MenubarContent>
              </MenubarMenu>
              {/* Format Menu */}
              <MenubarMenu>
                <MenubarTrigger data-testid="menu-format" className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Format
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarSub>
                    <MenubarSubTrigger data-testid="menu-format-text">
                      <TextIcon className="size-4 mr-2" />
                      Text
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarItem
                        data-testid="menu-format-bold"
                        onClick={() =>
                          editor?.chain().focus().toggleBold().run()
                        }
                      >
                        <BoldIcon className="size-4 mr-2" />
                        Bold <MenubarShortcut>⌘B</MenubarShortcut>
                      </MenubarItem>
                      <MenubarItem
                        data-testid="menu-format-italic"
                        onClick={() =>
                          editor?.chain().focus().toggleItalic().run()
                        }
                      >
                        <ItalicIcon className="size-4 mr-2" />
                        Italic <MenubarShortcut>⌘I</MenubarShortcut>
                      </MenubarItem>
                      <MenubarItem
                        data-testid="menu-format-underline"
                        onClick={() =>
                          editor?.chain().focus().toggleUnderline().run()
                        }
                      >
                        <UnderlineIcon className="size-4 mr-2" />
                        Underline <MenubarShortcut>⌘U</MenubarShortcut>
                      </MenubarItem>
                      <MenubarItem
                        data-testid="menu-format-strikethrough"
                        onClick={() =>
                          editor?.chain().focus().toggleStrike().run()
                        }
                      >
                        <StrikethroughIcon className="size-4 mr-2" />
                        Strikethrough
                      </MenubarItem>
                    </MenubarSubContent>
                  </MenubarSub>
                  <MenubarItem
                    data-testid="menu-format-clear"
                    onClick={() =>
                      editor?.chain().focus().unsetAllMarks().run()
                    }
                  >
                    <RemoveFormattingIcon className="size-4 mr-2" />
                    Clear formatting
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Translate Menu */}
              <MenubarMenu>
                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Translate
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>
                    <Link href="/translate/assames/">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">অ</span>
                        Assamese
                      </div>
                    </Link>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Switch Format Menu */}
              <MenubarMenu>
                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Switch Format
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>
                    <FileJsonIcon className="size-4 mr-2" />
                    Switch Format
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Full Screen Menu */}
              <MenubarMenu>
                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Full Screen
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={toggleFullScreen}>
                    <FileUpIcon className="size-4 mr-2" />
                    Toggle Full Screen
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </div>
        </div>
      </div>
      {/* Quick Export Buttons for LLM Agent Testing */}
      <div className="flex items-center gap-2">
        <button
          data-testid="shortcut-export-docx"
          onClick={onSaveDocx}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          title="Export to Word (.docx)"
        >
          <BsFileWord className="size-4" />
          Export DOCX
        </button>
        <button
          data-testid="shortcut-export-pdf"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          title="Export to PDF"
        >
          <BsFilePdf className="size-4" />
          Export PDF
        </button>
      </div>
    </nav>
  );
};
