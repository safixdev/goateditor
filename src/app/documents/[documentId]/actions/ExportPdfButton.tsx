import { BsFilePdf } from "react-icons/bs";

export const ExportPdfButton = () => {
  return (
    <button
      data-testid="shortcut-export-pdf"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      title="Export to PDF"
    >
      <BsFilePdf className="size-4" />
      Export PDF
    </button>
  );
};

