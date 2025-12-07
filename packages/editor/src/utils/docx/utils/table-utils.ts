import {
  Table,
  TableRow,
  TableCell,
  Paragraph,
  ShadingType,
  WidthType,
  TableLayoutType,
  AlignmentType,
} from "docx";
import type { DocNode, DOCXExporterInterface, ParagraphChild } from "../types";
import { getAlignment } from "../style-utils";

const DEFAULT_COLUMN_WIDTH = 120;
const TWIPS_PER_POINT = 20;
const POINTS_PER_PIXEL = 0.75;

/**
 * Create a DOCX table from TipTap table node
 * Supports colspan, rowspan, header rows/columns, and per-cell styling
 */
export function createTable(
  node: DocNode,
  exporter: DOCXExporterInterface
): Table {
  const rows = node.content || [];
  const firstRow = rows[0];
  const columnCount = firstRow?.content?.length || 1;

  // Detect RTL from first cell content
  const firstCell = firstRow?.content?.[0];
  const firstPara = firstCell?.content?.[0];
  const isTableRTL =
    firstPara?.attrs?.dir === "rtl" ||
    firstCell?.attrs?.dir === "rtl" ||
    firstRow?.attrs?.dir === "rtl" ||
    node.attrs?.dir === "rtl";

  // Calculate column widths
  const totalTableWidth = 9000; // in twips
  const columnWidths = calculateColumnWidths(node, columnCount, totalTableWidth);

  // Check for header configuration
  const headerRows = (node.attrs?.headerRows as number) || 0;
  const headerCols = (node.attrs?.headerCols as number) || 0;

  const tableRows = rows.map((row, rowIndex) => {
    const isHeaderRow = rowIndex < headerRows;
    const cells = (row.content || []).map((cell, colIndex) => {
      const isHeaderCol = colIndex < headerCols;
      return createTableCell(
        cell,
        exporter,
        columnWidths[colIndex] || columnWidths[0],
        isHeaderRow || isHeaderCol,
        isTableRTL
      );
    });

    return new TableRow({
      children: cells,
      tableHeader: isHeaderRow,
    });
  });

  return new Table({
    rows: tableRows,
    columnWidths,
    layout: TableLayoutType.FIXED,
    visuallyRightToLeft: isTableRTL,
    width: { size: totalTableWidth, type: WidthType.DXA },
  });
}

/**
 * Calculate column widths from table data or default to equal distribution
 */
function calculateColumnWidths(
  node: DocNode,
  columnCount: number,
  totalWidth: number
): number[] {
  // Check for explicit column widths in attrs
  const explicitWidths = node.attrs?.columnWidths as number[] | undefined;

  if (explicitWidths && explicitWidths.length === columnCount) {
    // Convert pixel widths to twips
    return explicitWidths.map(
      (w) => (w ?? DEFAULT_COLUMN_WIDTH) * POINTS_PER_PIXEL * TWIPS_PER_POINT
    );
  }

  // Default to equal distribution
  const columnWidth = Math.floor(totalWidth / columnCount);
  return Array(columnCount).fill(columnWidth);
}

/**
 * Create a single table cell with content and styling
 */
function createTableCell(
  cell: DocNode,
  exporter: DOCXExporterInterface,
  width: number,
  isHeader: boolean,
  isTableRTL: boolean
): TableCell {
  // Get cell attributes
  const colspan = (cell.attrs?.colspan as number) || 1;
  const rowspan = (cell.attrs?.rowspan as number) || 1;
  const backgroundColor = cell.attrs?.backgroundColor as string | undefined;

  // Process cell content into paragraphs
  const cellParagraphs = (cell.content || []).map((para) => {
    const paraDir =
      (para.attrs?.dir as string | undefined) ||
      (cell.attrs?.dir as string | undefined);
    const isParaRTL = paraDir === "rtl" || isTableRTL;

    const children = exporter.transformInlineContent(para.content || []);

    return new Paragraph({
      children: children as ParagraphChild[],
      bidirectional: isParaRTL ? true : undefined,
      alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {}),
      run: isHeader ? { bold: true } : undefined,
    });
  });

  // If no content, add empty paragraph
  if (cellParagraphs.length === 0) {
    cellParagraphs.push(new Paragraph({ children: [] }));
  }

  return new TableCell({
    children: cellParagraphs,
    width: { size: width, type: WidthType.DXA },
    columnSpan: colspan > 1 ? colspan : undefined,
    rowSpan: rowspan > 1 ? rowspan : undefined,
    shading: backgroundColor
      ? {
          type: ShadingType.SOLID,
          color: backgroundColor.replace("#", ""),
          fill: backgroundColor.replace("#", ""),
        }
      : undefined,
  });
}

