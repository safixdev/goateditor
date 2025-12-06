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
      className="text-sm h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80"
      title="Export to Word (.docx)"
    >
      <BsFileWord className="size-4" />
    </button>
  );
};

