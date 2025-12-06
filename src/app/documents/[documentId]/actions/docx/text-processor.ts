import {
  TextRun,
  ExternalHyperlink,
  ShadingType,
  UnderlineType,
} from "docx";
import type { DocNode, ParagraphChild } from "./types";
import { normalizeColor, mapHighlightColor, type HighlightColor } from "./color-utils";

/**
 * Process text content from TipTap nodes into docx paragraph children
 */
export const processTextContent = (content: DocNode[], isRTL: boolean = false): ParagraphChild[] => {
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
            highlight: highlight as HighlightColor,
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

