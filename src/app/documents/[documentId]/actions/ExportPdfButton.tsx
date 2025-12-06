"use client";

import { useState, useCallback } from "react";
import { BsFilePdf } from "react-icons/bs";
import { Loader2 } from "lucide-react";
import { useEditorStore } from "@/store/use-editor-store";
import { exportToPdf, ExportPdfProgress } from "./pdf";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ExportPdfButton = () => {
  const { editor } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportPdfProgress | null>(null);

  const handleExport = useCallback(async () => {
    if (isExporting || !editor) return;

    setIsExporting(true);
    setProgress({ status: "initializing", message: "Starting export..." });

    try {
      await exportToPdf(editor, "document.pdf", (progressUpdate) => {
        setProgress(progressUpdate);
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      // Error is already set in progress by the exportToPdf function
    } finally {
      // Keep the progress message visible briefly before clearing
      setTimeout(() => {
        setIsExporting(false);
        setProgress(null);
      }, 1500);
    }
  }, [editor, isExporting]);

  const getStatusMessage = (): string => {
    if (!progress) return "Export to PDF";
    
    switch (progress.status) {
      case "initializing":
        return "Loading converter (first time may take a moment)...";
      case "generating-docx":
        return "Generating document...";
      case "converting-to-pdf":
        return "Converting to PDF...";
      case "complete":
        return "Download started!";
      case "error":
        return `Error: ${progress.error || "Export failed"}`;
      default:
        return "Export to PDF";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            data-testid="shortcut-export-pdf"
            onClick={handleExport}
            disabled={isExporting}
            className="text-sm h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isExporting ? getStatusMessage() : "Export to PDF"}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BsFilePdf className="size-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getStatusMessage()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
