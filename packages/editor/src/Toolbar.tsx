import { useState } from "react";
import { ColorResult, SketchPicker } from "react-color";
import { Level } from "@tiptap/extension-heading";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ChevronDownIcon,
  HighlighterIcon,
  ImageIcon,
  ItalicIcon,
  Link2Icon,
  ListCollapseIcon,
  ListIcon,
  ListOrderedIcon,
  LucideIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  Redo2Icon,
  SearchIcon,
  UnderlineIcon,
  Undo2Icon,
  UploadIcon,
} from "lucide-react";
import { BsFileWord, BsFilePdf } from "react-icons/bs";
import { TextDirectionLtrIcon, TextDirectionRtlIcon } from "./components/icons";
import { cn } from "./lib/utils";
import { Separator } from "./components/ui/separator";
import { useEditorStore } from "./store/use-editor-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { exportToDocx } from "./utils/export-docx";

const LineHeightButton = () => {
  const { editor } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const lineHeights = [
    { label: "Default", value: "normal" },
    { label: "Single", value: "1" },
    { label: "1.15", value: "1.15" },
    { label: "1.5", value: "1.5" },
    { label: "Double", value: "2" },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="toolbar-line-height"
          className="h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <ListCollapseIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 flex flex-col gap-y-1">
        {lineHeights.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              editor?.chain().focus().setLineHeight(value).run();
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
              editor?.getAttributes("paragraph").lineHeight === value &&
                "bg-neutral-200/80"
            )}
          >
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FontSizeButton = () => {
  const { editor } = useEditorStore();

  const currentFontSize = editor?.getAttributes("textStyle").fontSize
    ? editor?.getAttributes("textStyle").fontSize.replace("px", "")
    : "16";

  const [fontSize, setFontSize] = useState(currentFontSize);
  const [inputValue, setInputvalue] = useState(fontSize);
  const [isEditing, setIsEditing] = useState(false);

  const updateFontSize = (newSize: string) => {
    const size = parseInt(newSize);
    if (!isNaN(size) && size > 0) {
      editor?.chain().focus().setFontSize(`${size}px`).run();
      setFontSize(newSize);
      setInputvalue(newSize);
      setIsEditing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputvalue(e.target.value);
  };

  const handleInputBlur = () => {
    updateFontSize(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateFontSize(inputValue);
      editor?.commands.focus();
    }
  };

  const increment = () => {
    const newSize = parseInt(fontSize) + 1;
    updateFontSize(newSize.toString());
  };

  const decrement = () => {
    const newSize = parseInt(fontSize) - 1;
    if (newSize > 0) {
      updateFontSize(newSize.toString());
    }
  };

  return (
    <div
      data-testid="toolbar-font-size"
      className="flex items-center gap-x-0.5"
    >
      <button
        data-testid="toolbar-font-size-decrease"
        onClick={decrement}
        className="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80"
      >
        <MinusIcon className="size-4" />
      </button>
      {isEditing ? (
        <Input
          data-testid="toolbar-font-size-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="h-7 w-10 text-sm text-center border border-neutral-400 rounded-sm bg-transparent focus:outline-none focus:ring-0"
        />
      ) : (
        <button
          data-testid="toolbar-font-size-value"
          onClick={() => {
            setIsEditing(true);
            setFontSize(currentFontSize);
          }}
          className="h-7 w-10 text-sm text-center border border-neutral-400 rounded-sm hover:bg-neutral-200/80"
        >
          {currentFontSize}
        </button>
      )}
      <button
        data-testid="toolbar-font-size-increase"
        onClick={increment}
        className="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
};

const ListButton = () => {
  const { editor } = useEditorStore();

  const lists = [
    {
      label: "Bullet List",
      icon: ListIcon,
      isActive: editor?.isActive("bulletList"),
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
      testId: "toolbar-list-bullet",
    },
    {
      label: "Ordered List",
      icon: ListOrderedIcon,
      isActive: editor?.isActive("orderedList"),
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
      testId: "toolbar-list-ordered",
    },
  ];

  return (
    <div className="flex items-center gap-x-0.5">
      {lists.map(({ label, icon, onClick, isActive, testId }) => (
        <ToolbarButton
          key={label}
          icon={icon}
          onClick={onClick}
          isActive={isActive}
          testId={testId}
        />
      ))}
    </div>
  );
};

const AlignButton = () => {
  const { editor } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const alignments = [
    {
      label: "Align left",
      value: "left",
      icon: AlignLeftIcon,
      testId: "toolbar-align-left",
    },
    {
      label: "Align Center",
      value: "center",
      icon: AlignCenterIcon,
      testId: "toolbar-align-center",
    },
    {
      label: "Align Right",
      value: "right",
      icon: AlignRightIcon,
      testId: "toolbar-align-right",
    },
    {
      label: "Align Justified",
      value: "justify",
      icon: AlignJustifyIcon,
      testId: "toolbar-align-justify",
    },
  ];

  const getCurrentAlignment = () => {
    if (!editor) return null;
    const paraAttrs = editor.getAttributes("paragraph");
    if (paraAttrs.textAlign) return paraAttrs.textAlign;
    const headingAttrs = editor.getAttributes("heading");
    if (headingAttrs.textAlign) return headingAttrs.textAlign;
    return null;
  };

  const currentAlignment = getCurrentAlignment();
  const CurrentAlignIcon =
    alignments.find((a) => a.value === currentAlignment)?.icon || AlignLeftIcon;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="toolbar-align"
          className="h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <CurrentAlignIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 flex flex-row gap-x-1">
        {alignments.map(({ label, value, icon: Icon, testId }) => (
          <button
            key={value}
            data-testid={testId}
            onClick={() => {
              editor?.chain().focus().setTextAlign(value).run();
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center justify-center p-2 rounded-sm hover:bg-neutral-200/80",
              currentAlignment === value && "bg-blue-100 text-blue-700"
            )}
            title={label}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TextDirectionButton = () => {
  const { editor } = useEditorStore();

  const getCurrentDirection = () => {
    if (!editor) return null;
    const attrs = editor.getAttributes("paragraph");
    return attrs.dir || null;
  };

  return (
    <div className="flex items-center gap-x-0.5">
      <button
        data-testid="toolbar-ltr"
        onClick={() => editor?.chain().focus().setTextDirection("ltr").run()}
        className={cn(
          "h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5",
          getCurrentDirection() === "ltr" && "bg-neutral-200/80"
        )}
        title="Left to Right"
      >
        <TextDirectionLtrIcon className="size-4" />
      </button>
      <button
        data-testid="toolbar-rtl"
        onClick={() => editor?.chain().focus().setTextDirection("rtl").run()}
        className={cn(
          "h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5",
          getCurrentDirection() === "rtl" && "bg-neutral-200/80"
        )}
        title="Right to Left"
      >
        <TextDirectionRtlIcon className="size-4" />
      </button>
    </div>
  );
};

const ImageButton = () => {
  const { editor } = useEditorStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const onChange = (src: string) => {
    editor?.chain().focus().setImage({ src }).run();
  };

  const onUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        onChange(imageUrl);
      }
    };

    input.click();
  };

  const handleImageUrlSubmit = () => {
    if (imageUrl) {
      onChange(imageUrl);
      setImageUrl("");
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            data-testid="toolbar-image-button"
            className="h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
          >
            <ImageIcon className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem data-testid="toolbar-image-upload" onClick={onUpload}>
            <UploadIcon className="size-2 mr-2" />
            Upload
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid="toolbar-image-url"
            onClick={() => setIsDialogOpen(true)}
          >
            <SearchIcon className="size-2 mr-2" />
            Paste image URL
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="image-url-dialog">
          <DialogHeader>
            <DialogTitle>Insert image URL</DialogTitle>
          </DialogHeader>
          <input
            data-testid="image-url-input"
            placeholder="Insert image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleImageUrlSubmit();
              }
            }}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm"
          />
          <DialogFooter>
            <Button data-testid="image-url-submit" onClick={handleImageUrlSubmit}>
              Submit
            </Button>
            <Button
              data-testid="image-url-cancel"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const LinkButton = () => {
  const { editor } = useEditorStore();
  const [value, setValue] = useState("");

  const onChange = (href: string) => {
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setValue("");
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          setValue(editor?.getAttributes("link").href || "");
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          data-testid="toolbar-link"
          className="h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <Link2Icon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-2.5 flex items-center gap-x-2">
        <Input
          data-testid="toolbar-link-input"
          placeholder="https://example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button data-testid="toolbar-link-apply" onClick={() => onChange(value)}>
          Apply
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const HighlightColorButton = () => {
  const { editor } = useEditorStore();

  const value = editor?.getAttributes("highlight").color || "#ffffff";

  const onChange = (color: ColorResult) => {
    editor?.chain().focus().setHighlight({ color: color.hex }).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="toolbar-highlight-color"
          className="h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <HighlighterIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-testid="toolbar-highlight-color-picker"
        className="p-0"
      >
        <SketchPicker color={value} onChange={onChange} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TextColorButton = () => {
  const { editor } = useEditorStore();

  const value = editor?.getAttributes("textStyle").color || "#000000";

  const onChange = (color: ColorResult) => {
    editor?.chain().focus().setColor(color.hex).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="toolbar-text-color"
          className="h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <span className="text-xs">A</span>
          <div className="h-0.5 w-full" style={{ backgroundColor: value }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-testid="toolbar-text-color-picker"
        className="p-0"
      >
        <SketchPicker color={value} onChange={onChange} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const HeadingLevelButton = () => {
  const { editor } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const headings = [
    { label: "Normal text", value: 0, fontSize: "16px" },
    { label: "Heading 1", value: 1, fontSize: "32px" },
    { label: "Heading 2", value: 2, fontSize: "28px" },
    { label: "Heading 3", value: 3, fontSize: "24px" },
    { label: "Heading 4", value: 4, fontSize: "20px" },
    { label: "Heading 5", value: 5, fontSize: "18px" },
    { label: "Heading 6", value: 6, fontSize: "16px" },
  ];

  const getCurrentHeading = () => {
    for (let level = 1; level <= 5; level++) {
      if (editor?.isActive("heading", { level })) {
        return `heading ${level}`;
      }
    }
    return "Normal text";
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="toolbar-heading"
          className="h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <span className="truncate">{getCurrentHeading()}</span>
          <ChevronDownIcon className="ml-2 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 flex flex-col gap-y-1">
        {headings.map(({ label, value, fontSize }) => (
          <button
            key={value}
            data-testid={`toolbar-heading-${value}`}
            style={{ fontSize }}
            onClick={() => {
              if (value === 0) {
                editor?.chain().focus().setParagraph().run();
              } else {
                editor
                  ?.chain()
                  .focus()
                  .toggleHeading({ level: value as Level })
                  .run();
              }
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
              (value === 0 && !editor?.isActive("heading")) ||
                (editor?.isActive("heading", { level: value }) &&
                  "bg-neutral-200/80")
            )}
          >
            {label}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FontFamilyButton = () => {
  const { editor } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const fonts = [
    { label: "Arial", value: "Arial" },
    { label: "Times New Roman", value: "Times New Roman" },
    { label: "Courier New", value: "Courier New" },
    { label: "Georgia", value: "Georgia" },
    { label: "Verdana", value: "Verdana" },
    { label: "Tahoma", value: "Tahoma" },
    { label: "Trebuchet MS", value: "Trebuchet MS" },
    { label: "Impact", value: "Impact" },
    { label: "Comic Sans MS", value: "Comic Sans MS" },
    { label: "Lucida Console", value: "Lucida Console" },
    { label: "Lucida Sans Unicode", value: "Lucida Sans Unicode" },
    { label: "Arial Black", value: "Arial Black" },
    { label: "Helvetica", value: "Helvetica" },
    { label: "Palatino Linotype", value: "Palatino Linotype" },
    { label: "Book Antiqua", value: "Book Antiqua" },
    { label: "Courier", value: "Courier" },
    { label: "MS Sans Serif", value: "MS Sans Serif" },
    { label: "MS Serif", value: "MS Serif" },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="toolbar-font-family"
          className="h-7 w-[120px] shrink-0 flex items-center justify-between rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm"
        >
          <span className="truncate">
            {editor?.getAttributes("textStyle").fontFamily || "Arial"}
          </span>
          <ChevronDownIcon className="ml-2 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-testid="toolbar-font-family-dropdown"
        className="p-1 flex flex-col gap-y-1"
      >
        {fonts.map(({ label, value }) => (
          <button
            onClick={() => {
              editor?.chain().focus().setFontFamily(value).run();
              setIsOpen(false);
            }}
            key={value}
            data-testid={`toolbar-font-${value.toLowerCase().replace(/\s+/g, "-")}`}
            className={cn(
              "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
              editor?.getAttributes("textStyle").fontfamily === value &&
                "bg-neutral-200/80"
            )}
            style={{ fontFamily: value }}
          >
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface ToolbarButtonProps {
  onClick?: () => void;
  isActive?: boolean;
  icon: LucideIcon;
  testId?: string;
}

const ToolbarButton = ({
  onClick,
  isActive,
  icon: Icon,
  testId,
}: ToolbarButtonProps) => {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "text-sm h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
        isActive && "bg-neutral-200/80"
      )}
    >
      <Icon className="size-4" />
    </button>
  );
};

const ExportDocxButton = () => {
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

const ExportPdfButton = () => {
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

export interface ToolbarProps {
  /** Text direction for the toolbar layout */
  direction?: "ltr" | "rtl";
  /** Custom class name */
  className?: string;
}

export const Toolbar = ({ direction = "ltr", className }: ToolbarProps) => {
  const { editor } = useEditorStore();

  const sections: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    isActive?: boolean;
    testId?: string;
  }[][] = [
    [
      {
        label: "Undo",
        icon: Undo2Icon,
        onClick: () => editor?.chain().focus().undo().run(),
        testId: "toolbar-undo",
      },
      {
        label: "Redo",
        icon: Redo2Icon,
        onClick: () => editor?.chain().focus().redo().run(),
        testId: "toolbar-redo",
      },
      {
        label: "Print",
        icon: PrinterIcon,
        onClick: () => window.print(),
        testId: "toolbar-print",
      },
    ],
    [
      {
        label: "Bold",
        icon: BoldIcon,
        isActive: editor?.isActive("bold"),
        onClick: () => editor?.chain().focus().toggleBold().run(),
        testId: "toolbar-bold",
      },
      {
        label: "Italic",
        icon: ItalicIcon,
        isActive: editor?.isActive("italic"),
        onClick: () => editor?.chain().focus().toggleItalic().run(),
        testId: "toolbar-italic",
      },
      {
        label: "Underline",
        icon: UnderlineIcon,
        isActive: editor?.isActive("underline"),
        onClick: () => editor?.chain().focus().toggleUnderline().run(),
        testId: "toolbar-underline",
      },
    ],
  ];

  return (
    <div
      data-testid="toolbar"
      dir={direction}
      className={cn(
        "goat-editor-toolbar bg-[#F1F4F9] px-2.5 py-0.5 rounded-[24px] min-h-[40px] flex items-center gap-x-0.5 overflow-x-auto",
        className
      )}
    >
      {sections[0].map((item) => (
        <ToolbarButton key={item.label} {...item} />
      ))}
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <FontFamilyButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <HeadingLevelButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <FontSizeButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      {sections[1].map((item) => (
        <ToolbarButton key={item.label} {...item} />
      ))}
      <TextColorButton />
      <HighlightColorButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <LinkButton />
      <ImageButton />
      <AlignButton />
      <TextDirectionButton />
      <LineHeightButton />
      <ListButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <ExportDocxButton />
      <ExportPdfButton />
    </div>
  );
};

