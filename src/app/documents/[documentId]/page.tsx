import { Editor } from "./editor";
import { ToolBar } from "./toolbar";
import { DevToolbar } from "./dev-toolbar";

interface DocumentIdPageProps {
  params: Promise<{ documentId: string }>;
}

const DocumentIdPage = async ({ params }: DocumentIdPageProps) => {
  const { documentId } = await params;
  return (
    <div className="min-h-screen bg-[#FAFBFD] ">
      <div className="fixed top-0 left-0 right-0 z-10 bg-[#FAFBFD] print:hidden">
        <DevToolbar />
        <div className="flex flex-col px-4 pt-2 gap-y-2">
          <ToolBar />
        </div>
      </div>
      <div className="pt-[100px] print:pt-0">
        <Editor />
      </div>
    </div>
  );
};

export default DocumentIdPage;
