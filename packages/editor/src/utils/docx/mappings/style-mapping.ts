import { IRunPropertiesOptions, ShadingType, UnderlineType } from "docx";
import type { Mark, StyleMapping, DOCXExporterInterface } from "../types";
import { normalizeColor, mapHighlightColor } from "../color-utils";

/**
 * Style mappings for TipTap marks to docx run properties
 */
export const defaultStyleMapping: StyleMapping = {
  bold: (value) => {
    if (!value) return {};
    return { bold: true };
  },

  italic: (value) => {
    if (!value) return {};
    return { italics: true };
  },

  underline: (value) => {
    if (!value) return {};
    return { underline: { type: UnderlineType.SINGLE } };
  },

  strike: (value) => {
    if (!value) return {};
    return { strike: true };
  },

  subscript: (value) => {
    if (!value) return {};
    return { subScript: true };
  },

  superscript: (value) => {
    if (!value) return {};
    return { superScript: true };
  },

  code: (value) => {
    if (!value) return {};
    return { font: { name: "JetBrains Mono" } };
  },

  textColor: (value) => {
    if (!value || typeof value !== "string") return {};
    const color = normalizeColor(value);
    return color ? { color } : {};
  },

  backgroundColor: (value) => {
    if (!value || typeof value !== "string") return {};
    // First try standard highlight colors
    const highlight = mapHighlightColor(value);
    if (highlight) {
      return { highlight: highlight as IRunPropertiesOptions["highlight"] };
    }
    // Fall back to shading for custom colors
    const color = normalizeColor(value);
    if (color) {
      return {
        shading: {
          type: ShadingType.SOLID,
          color,
          fill: color,
        },
      };
    }
    return {};
  },
};

/**
 * Map TipTap marks to docx run properties
 */
export function mapMarksToStyles(
  marks: Mark[],
  _exporter: DOCXExporterInterface
): IRunPropertiesOptions {
  const result: IRunPropertiesOptions = {};

  for (const mark of marks) {
    const mapping = defaultStyleMapping[mark.type];
    if (mapping) {
      // For textStyle marks, extract individual style properties
      if (mark.type === "textStyle" && mark.attrs) {
        if (mark.attrs.color) {
          Object.assign(result, defaultStyleMapping.textColor(mark.attrs.color, _exporter));
        }
        if (mark.attrs.backgroundColor) {
          Object.assign(
            result,
            defaultStyleMapping.backgroundColor(mark.attrs.backgroundColor, _exporter)
          );
        }
        if (mark.attrs.fontFamily) {
          Object.assign(result, { font: { name: mark.attrs.fontFamily as string } });
        }
        if (mark.attrs.fontSize) {
          const fontSizeAttr = mark.attrs.fontSize as string;
          const sizeMatch = fontSizeAttr.match(/^(\d+(?:\.\d+)?)(pt|px)?$/);
          if (sizeMatch) {
            const value = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2] || "pt";
            const fontSize =
              unit === "px"
                ? (`${Math.round(value * 0.75)}pt` as `${number}pt`)
                : (`${value}pt` as `${number}pt`);
            Object.assign(result, { size: fontSize });
          }
        }
      } else if (mark.type === "highlight" && mark.attrs?.color) {
        Object.assign(result, defaultStyleMapping.backgroundColor(mark.attrs.color, _exporter));
      } else {
        Object.assign(result, mapping(true, _exporter));
      }
    }
  }

  return result;
}

