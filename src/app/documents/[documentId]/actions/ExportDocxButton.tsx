import { BsFileWord } from "react-icons/bs";
import { useEditorStore } from "@/store/use-editor-store";
import { exportToDocx } from "./export-docx";

export const ExportDocxButton = () => {
  const { editor } = useEditorStore();

  const onSaveDocx = () => {
    exportToDocx(editor);
  };

  return (
    <button
      data-testid="shortcut-export-docx"
      onClick={onSaveDocx}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      title="Export to Word (.docx)"
    >
      <BsFileWord className="size-4" />
      Export DOCX
    </button>
  );
};

