import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import ImageResize from "tiptap-extension-resize-image";

import { useEditorStore } from "./store/use-editor-store";
import { FontSizeExtension } from "./extensions/font-size";
import { LineHeightExtension } from "./extensions/line-height";
import { TextDirectionExtension } from "./extensions/text-direction";
import { Toolbar } from "./Toolbar";
import { Ruler } from "./Ruler";
import { cn } from "./lib/utils";
import type { GoatEditorProps } from "./types";

/**
 * GoatEditor - A rich-text editor built with TipTap
 *
 * @example
 * ```tsx
 * import GoatEditor from "@goat/editor";
 * import "@goat/editor/styles.css";
 *
 * function App() {
 *   return (
 *     <GoatEditor
 *       options={{
 *         initialContent: "<p>Hello World</p>",
 *         showToolbar: true,
 *         showRuler: true,
 *         onChange: (html, json) => console.log(html),
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export const GoatEditor = ({ options = {} }: GoatEditorProps) => {
  const {
    initialContent = "",
    showToolbar = true,
    showRuler = true,
    defaultDirection = "ltr",
    className,
    toolbarClassName,
    onChange,
    onReady,
    onDestroy,
    extensions: customExtensions = [],
    editable = true,
    autoFocus = false,
    dimensions = { width: 816, height: 1054 },
    toolbarDirection,
  } = options;

  const { setEditor } = useEditorStore();
  const [content, setContent] = useState<string | null>(null);

  // Load initial content
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    } else {
      setContent("");
    }
  }, [initialContent]);

  // Configure text direction extension with the default direction
  const textDirectionExtension = TextDirectionExtension.configure({
    types: [
      "paragraph",
      "heading",
      "bulletList",
      "orderedList",
      "listItem",
      "taskList",
      "taskItem",
      "codeBlock",
      "blockquote",
    ],
    defaultDirection,
  });

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    autofocus: autoFocus,
    onCreate({ editor }) {
      setEditor(editor);
      onReady?.(editor);
    },
    onDestroy() {
      setEditor(null);
      onDestroy?.();
    },
    onUpdate({ editor }) {
      setEditor(editor);
      onChange?.(editor.getHTML(), editor.getJSON());
    },
    onSelectionUpdate({ editor }) {
      setEditor(editor);
    },
    onTransaction({ editor }) {
      setEditor(editor);
    },
    onFocus({ editor }) {
      setEditor(editor);
    },
    onBlur({ editor }) {
      setEditor(editor);
    },
    onContentError({ editor }) {
      setEditor(editor);
    },
    editorProps: {
      attributes: {
        id: "goat-editor-content",
        "data-testid": "editor-content",
        style: `padding-left: 56px; padding-right: 56px; min-height: ${dimensions.height}px; width: ${dimensions.width}px;`,
        class:
          "focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col pt-10 pr-10 cursor-text",
      },
    },
    extensions: [
      StarterKit,
      LineHeightExtension,
      FontSizeExtension,
      textDirectionExtension,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      FontFamily,
      TextStyle,
      Underline,
      Image,
      ImageResize,
      Table,
      TableCell,
      TableHeader,
      TableRow,
      TaskItem.configure({
        nested: true,
      }),
      TaskList,
      ...customExtensions,
    ],
  });

  // Handle inserting the content into the editor once it's available
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    } else if (editor && (!content || content === "")) {
      // For empty content, set default direction and alignment
      const isEmpty = editor.isEmpty;
      if (isEmpty) {
        editor.commands.setTextDirection(defaultDirection);
        editor.commands.setTextAlign(
          defaultDirection === "rtl" ? "right" : "left"
        );
      }
    }
  }, [editor, content, defaultDirection]);

  return (
    <div
      className={cn("goat-editor min-h-screen bg-[#FAFBFD]", className)}
      data-testid="goat-editor"
    >
      {showToolbar && (
        <div className="goat-editor-toolbar-wrapper flex flex-col px-4 pt-2 gap-y-2 fixed top-0 left-0 right-0 z-10 bg-[#FAFBFD] print:hidden">
          <Toolbar
            direction={toolbarDirection || defaultDirection}
            className={toolbarClassName}
          />
        </div>
      )}
      <div
        className={cn(
          "goat-editor-content-wrapper print:pt-0",
          showToolbar && "pt-[60px]"
        )}
      >
        <div
          id="goat-editor-container"
          data-testid="editor-container"
          className="size-full overflow-x-auto bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-visible"
        >
          {showRuler && <Ruler width={dimensions.width} />}
          <div
            className="min-w-max flex justify-center py-4 print:py-0 mx-auto print:w-full print:min-w-0"
            style={{ width: `${dimensions.width}px` }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoatEditor;

