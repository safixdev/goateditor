import { TextRun, ExternalHyperlink } from "docx";
import type { DocNode, InlineContentMapping, DOCXExporterInterface, ParagraphChild } from "../types";

/**
 * Inline content mappings for TipTap nodes to docx paragraph children
 */
export const defaultInlineContentMapping: InlineContentMapping = {
  text: (node, exporter) => {
    return exporter.transformStyledText(node);
  },

  hardBreak: () => {
    return new TextRun({ break: 1 });
  },
};

/**
 * Process inline content from TipTap nodes into docx paragraph children
 */
export function processInlineContent(
  content: DocNode[],
  exporter: DOCXExporterInterface
): ParagraphChild[] {
  if (!content || content.length === 0) {
    return [new TextRun({ text: "", rightToLeft: exporter.isRTL })];
  }

  const result: ParagraphChild[] = [];

  for (const item of content) {
    // Check for link mark
    const linkMark = item.marks?.find((m) => m.type === "link");

    if (linkMark && linkMark.attrs?.href) {
      // Create hyperlink with styled text
      const styledText = exporter.transformStyledText(item, true);
      result.push(
        new ExternalHyperlink({
          children: [styledText],
          link: linkMark.attrs.href as string,
        })
      );
    } else {
      // Use mapping or default to text
      const mapping = defaultInlineContentMapping[item.type];
      if (mapping) {
        result.push(mapping(item, exporter));
      } else if (item.type === "text") {
        result.push(exporter.transformStyledText(item));
      }
    }
  }

  return result.length > 0
    ? result
    : [new TextRun({ text: "", rightToLeft: exporter.isRTL })];
}

