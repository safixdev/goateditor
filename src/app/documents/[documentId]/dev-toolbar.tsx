"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/use-editor-store";
import { toast } from "@/hooks/use-toast";
import { Copy, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const DevToolbar = () => {
  const { editor } = useEditorStore();
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");

  const handleCopyJson = async () => {
    if (!editor) {
      toast({
        title: "Error",
        description: "Editor not initialized",
        variant: "destructive",
      });
      return;
    }

    const json = editor.getJSON();
    const jsonString = JSON.stringify(json, null, 2);

    try {
      await navigator.clipboard.writeText(jsonString);
      toast({
        title: "Copied!",
        description: "JSON copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleLoadJson = () => {
    if (!editor) {
      toast({
        title: "Error",
        description: "Editor not initialized",
        variant: "destructive",
      });
      return;
    }

    if (!jsonInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter JSON content",
        variant: "destructive",
      });
      return;
    }

    try {
      const json = JSON.parse(jsonInput);
      editor.commands.setContent(json);
      toast({
        title: "Loaded!",
        description: "JSON content loaded into editor",
      });
      setIsLoadDialogOpen(false);
      setJsonInput("");
    } catch (err) {
      toast({
        title: "Error",
        description: "Invalid JSON format",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="bg-emerald-100 border-b border-emerald-300 px-4 py-2 flex items-center gap-2">
        <span className="text-emerald-800 text-xs font-medium mr-2">DEV</span>
        <button
          onClick={handleCopyJson}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded transition-colors"
        >
          <Copy className="size-3.5" />
          Copy JSON
        </button>
        <button
          onClick={() => setIsLoadDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded transition-colors"
        >
          <Upload className="size-3.5" />
          Load JSON
        </button>
      </div>

      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Load JSON Content</DialogTitle>
            <DialogDescription>
              Paste TipTap JSON content to load into the editor. This will replace the current content.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"type": "doc", "content": [...]}'
            className="w-full h-64 p-3 text-sm font-mono border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-500"
          />
          <DialogFooter>
            <button
              onClick={() => setIsLoadDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLoadJson}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
            >
              Load
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

