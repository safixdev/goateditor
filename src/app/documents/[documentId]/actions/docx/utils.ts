import { AlignmentType } from "docx";

// ==================== Dimension & Style Utilities ====================

export const parseDimension = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const extractStyleDimensions = (
  style: string
): { width: number | null; height: number | null } => {
  let width: number | null = null;
  let height: number | null = null;

  const widthMatch = style.match(/width:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
  if (widthMatch) width = parseFloat(widthMatch[1]);

  const heightMatch = style.match(/height:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
  if (heightMatch) height = parseFloat(heightMatch[1]);

  return { width, height };
};

export const extractStyleAlignment = (style: string): string | null => {
  const floatMatch = style.match(/float:\s*(left|right)/i);
  if (floatMatch) return floatMatch[1].toLowerCase();

  // Check for margin-based alignment (used by tiptap-extension-resize-image)
  // Handles both "margin: 0 0 0 auto" and "margin: 0px 0px 0px auto" formats
  // Right alignment: margin with only margin-left as auto
  const rightMarginPattern =
    /margin:\s*0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+auto/i;
  if (
    rightMarginPattern.test(style) ||
    (style.includes("margin-left: auto") &&
      !style.includes("margin-right: auto"))
  ) {
    return "right";
  }

  // Left alignment: margin with only margin-right as auto
  const leftMarginPattern =
    /margin:\s*0(?:px)?\s+auto\s+0(?:px)?\s+0(?:px)?/i;
  if (
    leftMarginPattern.test(style) ||
    (style.includes("margin-right: auto") &&
      !style.includes("margin-left: auto"))
  ) {
    return "left";
  }

  // Center alignment: margin: 0 auto OR both margin-left and margin-right are auto
  const centerMarginPattern = /margin:\s*0(?:px)?\s+auto(?:\s*;|\s*$)/i;
  if (
    centerMarginPattern.test(style) ||
    (style.includes("margin-left: auto") &&
      style.includes("margin-right: auto"))
  ) {
    return "center";
  }

  const textAlignMatch = style.match(/text-align:\s*(left|center|right)/i);
  if (textAlignMatch) return textAlignMatch[1].toLowerCase();

  // Check for flexbox justify-content
  const justifyMatch = style.match(
    /justify-content:\s*(flex-start|flex-end|center|start|end)/i
  );
  if (justifyMatch) {
    const justify = justifyMatch[1].toLowerCase();
    if (justify === "flex-start" || justify === "start") return "left";
    if (justify === "flex-end" || justify === "end") return "right";
    if (justify === "center") return "center";
  }

  return null;
};

// ==================== Alignment Utilities ====================

export const getAlignment = (
  attrs: Record<string, unknown>
): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined => {
  if (!attrs?.textAlign) return undefined;
  const alignMap: Record<
    string,
    (typeof AlignmentType)[keyof typeof AlignmentType]
  > = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };
  return alignMap[attrs.textAlign as string];
};

export const getImageAlignment = (
  attrs: Record<string, unknown>
): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined => {
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

// ==================== Color Utilities ====================

export const normalizeColor = (color: string | undefined): string | undefined => {
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
export const mapHighlightColor = (color: string): string | undefined => {
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

