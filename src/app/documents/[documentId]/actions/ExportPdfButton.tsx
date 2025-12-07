"use client";

import { useState, useCallback } from "react";
import { BsFilePdf } from "react-icons/bs";
import { Loader2, Check, X } from "lucide-react";
import { useEditorStore } from "@/store/use-editor-store";
import { exportToPdf, ExportPdfProgress } from "./pdf";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Inline progress bar component with indeterminate animation */
const ProgressBar = ({ percentage }: { percentage?: number }) => {
  const isIndeterminate = percentage === undefined;
  
  return (
    <div className="w-16 h-1.5 bg-neutral-200 rounded-full overflow-hidden relative">
      {isIndeterminate ? (
        // Indeterminate: shimmer effect moving left to right
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
          style={{
            animation: 'shimmer 1.5s ease-in-out infinite',
            backgroundSize: '200% 100%',
          }}
        />
      ) : (
        // Determinate: fixed width bar
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      )}
    </div>
  );
};

export const ExportPdfButton = () => {
  const { editor } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportPdfProgress | null>(null);

  const handleExport = useCallback(async () => {
    if (isExporting || !editor) return;

    setIsExporting(true);
    setProgress({ status: "initializing", message: "Starting export...", percentage: 0 });

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
    return "הורדה כ-pdf בתהליך...";
  };

  /** Determine what to render inside the button */
  const renderContent = () => {
    if (!isExporting) {
      return <BsFilePdf className="size-4" />;
    }

    // During initialization, show progress bar with percentage
    if (progress?.status === "initializing") {
      return (
        <div className="flex items-center gap-1.5">
          <ProgressBar percentage={progress.percentage} />
          {progress.percentage !== undefined && (
            <span className="text-xs text-neutral-600 min-w-[2.5rem] text-right">
              {progress.percentage}%
            </span>
          )}
        </div>
      );
    }

    // Complete status - show checkmark
    if (progress?.status === "complete") {
      return <Check className="size-4 text-green-600" />;
    }

    // Error status - show X
    if (progress?.status === "error") {
      return <X className="size-4 text-red-600" />;
    }

    // Other statuses (generating-docx, converting-to-pdf) - show spinner
    return <Loader2 className="size-4 animate-spin" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            data-testid="shortcut-export-pdf"
            onClick={handleExport}
            disabled={isExporting}
            className={`text-sm h-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 disabled:cursor-not-allowed transition-all duration-200 ${
              isExporting && progress?.status === "initializing"
                ? "min-w-[6.5rem] px-2" // Wider when showing progress bar
                : "min-w-7 px-1"
            }`}
            title={isExporting ? getStatusMessage() : "Export to PDF"}
          >
            {renderContent()}
          </button>
        </TooltipTrigger>
        <TooltipContent dir="rtl">
          <p>{getStatusMessage()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
