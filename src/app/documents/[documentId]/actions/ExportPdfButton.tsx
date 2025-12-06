import { BsFilePdf } from "react-icons/bs";

export const ExportPdfButton = () => {
  return (
    <button
      data-testid="shortcut-export-pdf"
      onClick={() => window.print()}
      className="text-sm h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80"
      title="Export to PDF"
    >
      <BsFilePdf className="size-4" />
    </button>
  );
};

