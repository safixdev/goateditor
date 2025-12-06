/**
 * Normalize color to uppercase hex format (without # prefix)
 * Handles hex colors and rgb() format
 */
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

/**
 * Map TipTap highlight colors to docx HighlightColor names
 */
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

/** Valid highlight color type for docx */
export type HighlightColor =
  | "yellow"
  | "green"
  | "cyan"
  | "magenta"
  | "blue"
  | "red"
  | "darkBlue"
  | "darkCyan"
  | "darkGreen"
  | "darkMagenta"
  | "darkRed"
  | "darkYellow"
  | "darkGray"
  | "lightGray"
  | "black"
  | "white"
  | undefined;

