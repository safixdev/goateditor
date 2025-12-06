import { AlignmentType } from "docx";

/**
 * Parse a dimension value from various formats (number, string with units)
 */
export const parseDimension = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

/**
 * Extract width and height from a CSS style string
 */
export const extractStyleDimensions = (style: string): { width: number | null; height: number | null } => {
  let width: number | null = null;
  let height: number | null = null;

  const widthMatch = style.match(/width:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
  if (widthMatch) width = parseFloat(widthMatch[1]);

  const heightMatch = style.match(/height:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
  if (heightMatch) height = parseFloat(heightMatch[1]);

  return { width, height };
};

/**
 * Extract alignment from a CSS style string
 * Handles float, margin-based centering, text-align, and flexbox
 */
export const extractStyleAlignment = (style: string): string | null => {
  const floatMatch = style.match(/float:\s*(left|right)/i);
  if (floatMatch) return floatMatch[1].toLowerCase();

  // Check for margin-based alignment (used by tiptap-extension-resize-image)
  // Handles both "margin: 0 0 0 auto" and "margin: 0px 0px 0px auto" formats
  // Right alignment: margin with only margin-left as auto
  const rightMarginPattern = /margin:\s*0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+auto/i;
  if (rightMarginPattern.test(style) || 
      (style.includes("margin-left: auto") && !style.includes("margin-right: auto"))) {
    console.log("Detected RIGHT alignment from margin pattern");
    return "right";
  }
  
  // Left alignment: margin with only margin-right as auto
  const leftMarginPattern = /margin:\s*0(?:px)?\s+auto\s+0(?:px)?\s+0(?:px)?/i;
  if (leftMarginPattern.test(style) ||
      (style.includes("margin-right: auto") && !style.includes("margin-left: auto"))) {
    console.log("Detected LEFT alignment from margin pattern");
    return "left";
  }

  // Center alignment: margin: 0 auto OR both margin-left and margin-right are auto
  const centerMarginPattern = /margin:\s*0(?:px)?\s+auto(?:\s*;|\s*$)/i;
  if (centerMarginPattern.test(style) ||
      (style.includes("margin-left: auto") && style.includes("margin-right: auto"))) {
    console.log("Detected CENTER alignment from margin pattern");
    return "center";
  }

  const textAlignMatch = style.match(/text-align:\s*(left|center|right)/i);
  if (textAlignMatch) return textAlignMatch[1].toLowerCase();

  // Check for flexbox justify-content
  const justifyMatch = style.match(/justify-content:\s*(flex-start|flex-end|center|start|end)/i);
  if (justifyMatch) {
    const justify = justifyMatch[1].toLowerCase();
    if (justify === "flex-start" || justify === "start") return "left";
    if (justify === "flex-end" || justify === "end") return "right";
    if (justify === "center") return "center";
  }

  return null;
};

/**
 * Get text alignment from node attributes
 */
export const getAlignment = (attrs: Record<string, unknown>): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined => {
  if (!attrs?.textAlign) return undefined;
  const alignMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };
  return alignMap[attrs.textAlign as string];
};

/**
 * Get image alignment from various attribute sources
 */
export const getImageAlignment = (attrs: Record<string, unknown>): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined => {
  if (attrs?.align) {
    const align = (attrs.align as string).toLowerCase();
    if (align === "center") return AlignmentType.CENTER;
    if (align === "right") return AlignmentType.RIGHT;
    if (align === "left") return AlignmentType.LEFT;
  }

  // Check containerStyle (used by tiptap-extension-resize-image for alignment)
  if (attrs?.containerStyle && typeof attrs.containerStyle === "string") {
    const containerAlign = extractStyleAlignment(attrs.containerStyle);
    if (containerAlign === "center") return AlignmentType.CENTER;
    if (containerAlign === "right") return AlignmentType.RIGHT;
    if (containerAlign === "left") return AlignmentType.LEFT;
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

