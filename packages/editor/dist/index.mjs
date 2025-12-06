import * as React2 from 'react';
import { useState, useRef, useEffect } from 'react';
import { Extension, useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Table2 from '@tiptap/extension-table';
import TableCell2 from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow2 from '@tiptap/extension-table-row';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import ImageResize from 'tiptap-extension-resize-image';
import { create } from 'zustand';
import { SketchPicker } from 'react-color';
import { ChevronRight, Check, Circle, X, Undo2Icon, Redo2Icon, PrinterIcon, BoldIcon, ItalicIcon, UnderlineIcon, ChevronDownIcon, MinusIcon, PlusIcon, HighlighterIcon, Link2Icon, ImageIcon, UploadIcon, SearchIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon, ListCollapseIcon, ListIcon, ListOrderedIcon } from 'lucide-react';
import { BsFileWord, BsFilePdf } from 'react-icons/bs';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Document, Paragraph, convertInchesToTwip, AlignmentType, LevelFormat, UnderlineType, TextRun, Packer, ShadingType, TableCell, WidthType, TableRow, Table, TableLayoutType, CheckBox, HeadingLevel, ExternalHyperlink, HorizontalPositionAlign, ImageRun, TextWrappingType, VerticalPositionAlign, VerticalPositionRelativeFrom, HorizontalPositionRelativeFrom } from 'docx';
import { saveAs } from 'file-saver';
import { FaCaretDown } from 'react-icons/fa';

// src/Editor.tsx
var useEditorStore = create((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor })
}));
var FontSizeExtension = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"]
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`
              };
            }
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        return chain().setMark("textStyle", { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
      }
    };
  }
});
var LineHeightExtension = Extension.create({
  name: "lineHeight",
  addOptions() {
    return {
      types: ["paragraph", "heading"],
      defaultLineHeight: "normal"
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return {
                style: `line-height: ${attributes.lineHeight}`
              };
            },
            parseHTML: (element) => {
              return element.style.lineHeight || this.options.defaultLineHeight;
            }
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setLineHeight: (lineHeight) => ({ tr, state, dispatch }) => {
        const { selection } = state;
        tr = tr.setSelection(selection);
        const { from, to } = selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            tr = tr.setNodeMarkup(pos, void 0, {
              ...node.attrs,
              lineHeight
            });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
      unsetLineHeight: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        tr = tr.setSelection(selection);
        const { from, to } = selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            tr = tr.setNodeMarkup(pos, void 0, {
              ...node.attrs,
              lineHeight: this.options.defaultLineHeight
            });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      }
    };
  }
});
var TextDirectionExtension = Extension.create({
  name: "textDirection",
  addOptions() {
    return {
      types: [
        "paragraph",
        "heading",
        "bulletList",
        "orderedList",
        "listItem",
        "taskList",
        "taskItem",
        "codeBlock",
        "blockquote"
      ],
      defaultDirection: "ltr"
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: this.options.defaultDirection,
            renderHTML: (attributes) => {
              if (!attributes.dir) return {};
              return {
                dir: attributes.dir,
                style: `direction: ${attributes.dir}; text-align: ${attributes.dir === "rtl" ? "right" : "left"}`
              };
            },
            parseHTML: (element) => {
              return element.getAttribute("dir") || element.style.direction || null;
            }
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setTextDirection: (direction) => ({ tr, state, dispatch }) => {
        const { selection } = state;
        tr = tr.setSelection(selection);
        const { from, to } = selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            tr = tr.setNodeMarkup(pos, void 0, {
              ...node.attrs,
              dir: direction
            });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
      unsetTextDirection: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        tr = tr.setSelection(selection);
        const { from, to } = selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            tr = tr.setNodeMarkup(pos, void 0, {
              ...node.attrs,
              dir: null
            });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      }
    };
  }
});
var TextDirectionLtrIcon = ({ className, ...props }) => /* @__PURE__ */ jsx(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className,
    ...props,
    children: /* @__PURE__ */ jsx("path", { d: "M10 10v5h2V4h2v11h2V4h2V2h-8C7.79 2 6 3.79 6 6s1.79 4 4 4zM20 18l-4-4v3h-12v2h12v3z" })
  }
);
var TextDirectionRtlIcon = ({ className, ...props }) => /* @__PURE__ */ jsx(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className,
    ...props,
    children: /* @__PURE__ */ jsx("path", { d: "M10 10v5h2V4h2v11h2V4h2V2h-8C7.79 2 6 3.79 6 6s1.79 4 4 4zM4 18l4-4v3h12v2h-12v3z" })
  }
);
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
var Separator = React2.forwardRef(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ jsx(
    SeparatorPrimitive.Root,
    {
      ref,
      decorative,
      orientation,
      className: cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      ),
      ...props
    }
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;
var DropdownMenu = DropdownMenuPrimitive.Root;
var DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
var DropdownMenuSubTrigger = React2.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.SubTrigger,
  {
    ref,
    className: cn(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(ChevronRight, { className: "ml-auto" })
    ]
  }
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;
var DropdownMenuSubContent = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.SubContent,
  {
    ref,
    className: cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    ),
    ...props
  }
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;
var DropdownMenuContent = React2.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(DropdownMenuPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    ),
    ...props
  }
) }));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
var DropdownMenuItem = React2.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props
  }
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
var DropdownMenuCheckboxItem = React2.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.CheckboxItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    checked,
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      children
    ]
  }
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;
var DropdownMenuRadioItem = React2.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.RadioItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Circle, { className: "h-2 w-2 fill-current" }) }) }),
      children
    ]
  }
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;
var DropdownMenuLabel = React2.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Label,
  {
    ref,
    className: cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    ),
    ...props
  }
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
var DropdownMenuSeparator = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
var Dialog = DialogPrimitive.Root;
var DialogPortal = DialogPrimitive.Portal;
var DialogOverlay = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
var DialogContent = React2.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxs(
    DialogPrimitive.Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = DialogPrimitive.Content.displayName;
var DialogHeader = ({
  className,
  ...props
}) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    ),
    ...props
  }
);
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({
  className,
  ...props
}) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    ),
    ...props
  }
);
DialogFooter.displayName = "DialogFooter";
var DialogTitle = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Title,
  {
    ref,
    className: cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    ),
    ...props
  }
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
var DialogDescription = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
var Input = React2.forwardRef(
  ({ className, type, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "input",
      {
        type,
        className: cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Input.displayName = "Input";
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
var Button = React2.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(
      Comp,
      {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        ...props
      }
    );
  }
);
Button.displayName = "Button";
var parseDimension = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};
var extractStyleDimensions = (style) => {
  let width = null;
  let height = null;
  const widthMatch = style.match(/width:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
  if (widthMatch) width = parseFloat(widthMatch[1]);
  const heightMatch = style.match(/height:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
  if (heightMatch) height = parseFloat(heightMatch[1]);
  return { width, height };
};
var extractStyleAlignment = (style) => {
  const floatMatch = style.match(/float:\s*(left|right)/i);
  if (floatMatch) return floatMatch[1].toLowerCase();
  const rightMarginPattern = /margin:\s*0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+auto/i;
  if (rightMarginPattern.test(style) || style.includes("margin-left: auto") && !style.includes("margin-right: auto")) {
    return "right";
  }
  const leftMarginPattern = /margin:\s*0(?:px)?\s+auto\s+0(?:px)?\s+0(?:px)?/i;
  if (leftMarginPattern.test(style) || style.includes("margin-right: auto") && !style.includes("margin-left: auto")) {
    return "left";
  }
  const centerMarginPattern = /margin:\s*0(?:px)?\s+auto(?:\s*;|\s*$)/i;
  if (centerMarginPattern.test(style) || style.includes("margin-left: auto") && style.includes("margin-right: auto")) {
    return "center";
  }
  const textAlignMatch = style.match(/text-align:\s*(left|center|right)/i);
  if (textAlignMatch) return textAlignMatch[1].toLowerCase();
  const justifyMatch = style.match(
    /justify-content:\s*(flex-start|flex-end|center|start|end)/i
  );
  if (justifyMatch) {
    const justify = justifyMatch[1].toLowerCase();
    if (justify === "flex-start" || justify === "start") return "left";
    if (justify === "flex-end" || justify === "end") return "right";
    if (justify === "center") return "center";
  }
  return null;
};
var getAlignment = (attrs) => {
  if (!attrs?.textAlign) return void 0;
  const alignMap = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED
  };
  return alignMap[attrs.textAlign];
};
var getImageAlignment = (attrs) => {
  if (attrs?.align) {
    const align = attrs.align.toLowerCase();
    if (align === "center") return AlignmentType.CENTER;
    if (align === "right") return AlignmentType.RIGHT;
    if (align === "left") return AlignmentType.LEFT;
  }
  if (attrs?.containerStyle && typeof attrs.containerStyle === "string") {
    const containerAlign = extractStyleAlignment(attrs.containerStyle);
    if (containerAlign === "center") return AlignmentType.CENTER;
    if (containerAlign === "right") return AlignmentType.RIGHT;
    if (containerAlign === "left") return AlignmentType.LEFT;
  }
  if (attrs?.style && typeof attrs.style === "string") {
    const styleAlign = extractStyleAlignment(attrs.style);
    if (styleAlign === "center") return AlignmentType.CENTER;
    if (styleAlign === "right") return AlignmentType.RIGHT;
    if (styleAlign === "left") return AlignmentType.LEFT;
  }
  if (attrs?.textAlign) {
    const align = attrs.textAlign.toLowerCase();
    if (align === "center") return AlignmentType.CENTER;
    if (align === "right") return AlignmentType.RIGHT;
    if (align === "left") return AlignmentType.LEFT;
  }
  return void 0;
};

// src/utils/docx/image-utils.ts
var getImageType = (src) => {
  if (src.startsWith("data:")) {
    const mimeMatch = src.match(/data:image\/(\w+)/);
    if (mimeMatch) {
      const mime = mimeMatch[1].toLowerCase();
      if (mime === "jpeg" || mime === "jpg") return "jpg";
      if (mime === "gif") return "gif";
      if (mime === "bmp") return "bmp";
    }
    return "png";
  }
  const ext = src.split(".").pop()?.toLowerCase().split("?")[0];
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "gif") return "gif";
  if (ext === "bmp") return "bmp";
  return "png";
};
var loadImageViaCanvas = (src) => {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(resolve).catch(() => resolve(null));
          } else {
            resolve(null);
          }
        }, "image/png");
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};
var fetchImageAsArrayBuffer = async (src) => {
  try {
    if (src.startsWith("data:")) {
      const base64Data = src.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    if (src.startsWith("blob:")) {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Failed to fetch blob image");
      return await response.arrayBuffer();
    }
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Failed to fetch image");
      return await response.arrayBuffer();
    } catch {
      return await loadImageViaCanvas(src);
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
};
var getActualImageDimensions = (src) => {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};
var calculateFinalImageDimensions = async (attrs, src) => {
  const maxWidth = 600;
  let width = null;
  let height = null;
  if (attrs?.containerStyle && typeof attrs.containerStyle === "string") {
    const containerStyleDims = extractStyleDimensions(attrs.containerStyle);
    if (containerStyleDims.width) width = containerStyleDims.width;
    if (containerStyleDims.height) height = containerStyleDims.height;
  }
  if (attrs?.style && typeof attrs.style === "string") {
    const styleDims = extractStyleDimensions(attrs.style);
    if (styleDims.width) width = styleDims.width;
    if (styleDims.height) height = styleDims.height;
  }
  const attrWidth = parseDimension(attrs?.width);
  const attrHeight = parseDimension(attrs?.height);
  if (attrWidth) width = attrWidth;
  if (attrHeight) height = attrHeight;
  const dataWidth = parseDimension(attrs?.["data-width"]);
  const dataHeight = parseDimension(attrs?.["data-height"]);
  if (dataWidth) width = dataWidth;
  if (dataHeight) height = dataHeight;
  const resizedWidth = parseDimension(attrs?.resizedWidth);
  const resizedHeight = parseDimension(attrs?.resizedHeight);
  if (resizedWidth) width = resizedWidth;
  if (resizedHeight) height = resizedHeight;
  if (width && height) {
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }
    return { width: Math.round(width), height: Math.round(height) };
  }
  const actualDims = await getActualImageDimensions(src);
  if (actualDims) {
    const { naturalWidth, naturalHeight } = actualDims;
    const aspectRatio = naturalHeight / naturalWidth;
    if (width && !height) {
      height = Math.round(width * aspectRatio);
    } else if (height && !width) {
      width = Math.round(height / aspectRatio);
    } else {
      width = naturalWidth;
      height = naturalHeight;
    }
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }
    return { width: Math.round(width), height: Math.round(height) };
  }
  if (!width) width = 300;
  if (!height) height = 300;
  if (width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }
  return { width: Math.round(width), height: Math.round(height) };
};

// src/utils/docx/color-utils.ts
var normalizeColor = (color) => {
  if (!color) return void 0;
  let normalized = color.replace(/^#/, "");
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
    normalized = `${r}${g}${b}`;
  }
  return normalized.toUpperCase();
};
var mapHighlightColor = (color) => {
  const colorMap = {
    yellow: "yellow",
    green: "green",
    cyan: "cyan",
    magenta: "magenta",
    blue: "blue",
    red: "red",
    darkBlue: "darkBlue",
    darkCyan: "darkCyan",
    darkGreen: "darkGreen",
    darkMagenta: "darkMagenta",
    darkRed: "darkRed",
    darkYellow: "darkYellow",
    darkGray: "darkGray",
    lightGray: "lightGray",
    black: "black",
    white: "white"
  };
  return colorMap[color.toLowerCase()] || void 0;
};

// src/utils/docx/text-processor.ts
var processTextContent = (content, isRTL = false) => {
  if (!content || content.length === 0) {
    return [new TextRun({ text: "", rightToLeft: isRTL })];
  }
  const result = [];
  for (const item of content) {
    if (item.type === "text") {
      const marks = item.marks || [];
      const isBold = marks.some((m) => m.type === "bold");
      const isItalic = marks.some((m) => m.type === "italic");
      const isUnderline = marks.some((m) => m.type === "underline");
      const isStrike = marks.some((m) => m.type === "strike");
      const isSubscript = marks.some((m) => m.type === "subscript");
      const isSuperscript = marks.some((m) => m.type === "superscript");
      const isCode = marks.some((m) => m.type === "code");
      const textColorMark = marks.find((m) => m.type === "textStyle");
      const textColor = normalizeColor(
        textColorMark?.attrs?.color
      );
      const highlightMark = marks.find((m) => m.type === "highlight");
      const highlightColorAttr = highlightMark?.attrs?.color;
      const highlight = highlightColorAttr ? mapHighlightColor(highlightColorAttr) : void 0;
      const fontFamily = textColorMark?.attrs?.fontFamily;
      const fontSizeAttr = textColorMark?.attrs?.fontSize;
      let fontSize;
      if (fontSizeAttr) {
        const sizeMatch = fontSizeAttr.match(/^(\d+(?:\.\d+)?)(pt|px)?$/);
        if (sizeMatch) {
          const value = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2] || "pt";
          fontSize = unit === "px" ? `${Math.round(value * 0.75)}pt` : `${value}pt`;
        }
      }
      const linkMark = marks.find((m) => m.type === "link");
      if (linkMark && linkMark.attrs?.href) {
        result.push(
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: item.text || "",
                style: "Hyperlink",
                bold: isBold,
                italics: isItalic,
                underline: isUnderline ? { type: UnderlineType.SINGLE } : void 0,
                strike: isStrike,
                rightToLeft: isRTL,
                color: textColor,
                size: fontSize,
                font: fontFamily ? { name: fontFamily } : void 0
              })
            ],
            link: linkMark.attrs.href
          })
        );
      } else {
        result.push(
          new TextRun({
            text: item.text || "",
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? { type: UnderlineType.SINGLE } : void 0,
            strike: isStrike,
            subScript: isSubscript,
            superScript: isSuperscript,
            rightToLeft: isRTL,
            color: textColor,
            highlight,
            size: fontSize,
            font: isCode ? { name: "Courier New" } : fontFamily ? { name: fontFamily } : void 0,
            // Use shading for custom highlight colors not in the standard list
            shading: highlightColorAttr && !highlight ? {
              type: ShadingType.SOLID,
              color: normalizeColor(highlightColorAttr),
              fill: normalizeColor(highlightColorAttr)
            } : void 0
          })
        );
      }
    } else if (item.type === "hardBreak") {
      result.push(new TextRun({ break: 1 }));
    }
  }
  return result.length > 0 ? result : [new TextRun({ text: "", rightToLeft: isRTL })];
};

// src/utils/docx/node-processor.ts
var isImageNode = (node) => {
  return node.type === "image" || node.type === "resizableImage" || node.type === "imageResize";
};
var createImageParagraph = async (item, parentAlignment, isRTL = false) => {
  const src = item.attrs?.src;
  if (!src) {
    console.warn("Image node has no src:", item);
    return null;
  }
  const imageData = await fetchImageAsArrayBuffer(src);
  if (!imageData) {
    console.warn("Failed to fetch image data for:", src.substring(0, 100));
    return null;
  }
  const { width, height } = await calculateFinalImageDimensions(
    item.attrs || {},
    src
  );
  const imageType = getImageType(src);
  const imageAlignment = getImageAlignment(item.attrs || {});
  let finalAlignment = imageAlignment || parentAlignment;
  if (isRTL && !finalAlignment) {
    finalAlignment = AlignmentType.RIGHT;
  }
  let horizontalAlign;
  const alignStr = String(finalAlignment);
  if (alignStr === "right") {
    horizontalAlign = HorizontalPositionAlign.RIGHT;
  } else if (alignStr === "center") {
    horizontalAlign = HorizontalPositionAlign.CENTER;
  } else if (alignStr === "left") {
    horizontalAlign = HorizontalPositionAlign.LEFT;
  }
  if (horizontalAlign) {
    return new Paragraph({
      children: [
        new ImageRun({
          data: imageData,
          transformation: { width, height },
          type: imageType,
          floating: {
            horizontalPosition: {
              relative: HorizontalPositionRelativeFrom.MARGIN,
              align: horizontalAlign
            },
            verticalPosition: {
              relative: VerticalPositionRelativeFrom.PARAGRAPH,
              align: VerticalPositionAlign.TOP
            },
            wrap: {
              type: TextWrappingType.TOP_AND_BOTTOM
            }
          }
        })
      ],
      bidirectional: isRTL ? true : void 0
    });
  }
  return new Paragraph({
    children: [
      new ImageRun({
        data: imageData,
        transformation: { width, height },
        type: imageType
      })
    ],
    alignment: finalAlignment,
    bidirectional: isRTL ? true : void 0
  });
};
var createProcessingContext = () => ({
  documentChildren: [],
  bulletListInstanceCounter: 0,
  orderedListInstanceCounter: 0,
  lastKnownDirection: null
});
var processNode = async (node, context, listLevel = 0) => {
  const nodeDir = node.attrs?.dir;
  const isNodeRTL = nodeDir === "rtl";
  if (nodeDir) {
    context.lastKnownDirection = nodeDir;
  }
  switch (node.type) {
    case "paragraph": {
      const hasImage = node.content?.some((item) => isImageNode(item));
      const baseAlignment = getAlignment(node.attrs || {});
      const rtlOptions = isNodeRTL ? { bidirectional: true, alignment: AlignmentType.START } : {};
      if (hasImage) {
        for (const item of node.content || []) {
          if (isImageNode(item)) {
            const imgParagraph = await createImageParagraph(
              item,
              baseAlignment,
              isNodeRTL
            );
            if (imgParagraph) context.documentChildren.push(imgParagraph);
          } else if (item.type === "text") {
            const textChildren = processTextContent([item], isNodeRTL);
            context.documentChildren.push(
              new Paragraph({
                children: textChildren,
                alignment: isNodeRTL ? AlignmentType.START : baseAlignment,
                ...rtlOptions
              })
            );
          }
        }
      } else {
        const textChildren = processTextContent(node.content || [], isNodeRTL);
        context.documentChildren.push(
          new Paragraph({
            children: textChildren,
            alignment: isNodeRTL ? AlignmentType.START : baseAlignment,
            ...rtlOptions
          })
        );
      }
      break;
    }
    case "image":
    case "resizableImage":
    case "imageResize": {
      const effectiveRTL = isNodeRTL || context.lastKnownDirection === "rtl";
      const imgParagraph = await createImageParagraph(
        node,
        void 0,
        effectiveRTL
      );
      if (imgParagraph) context.documentChildren.push(imgParagraph);
      break;
    }
    case "heading": {
      const level = node.attrs?.level || 1;
      const headingLevelMap = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6
      };
      context.documentChildren.push(
        new Paragraph({
          children: processTextContent(node.content || [], isNodeRTL),
          heading: headingLevelMap[level] || HeadingLevel.HEADING_1,
          bidirectional: isNodeRTL ? true : void 0,
          alignment: isNodeRTL ? AlignmentType.START : getAlignment(node.attrs || {})
        })
      );
      break;
    }
    case "bulletList": {
      context.bulletListInstanceCounter++;
      const processListItems = async (items, level, parentDir) => {
        for (const listItem of items) {
          const itemDir = listItem.attrs?.dir || parentDir || nodeDir;
          for (const content of listItem.content || []) {
            if (content.type === "bulletList" || content.type === "orderedList") {
              await processListItems(content.content || [], level + 1, itemDir);
            } else if (content.type === "paragraph") {
              const paraDir = content.attrs?.dir || itemDir;
              const isParaRTL = paraDir === "rtl";
              context.documentChildren.push(
                new Paragraph({
                  children: processTextContent(content.content || [], isParaRTL),
                  bullet: { level },
                  bidirectional: isParaRTL ? true : void 0,
                  alignment: isParaRTL ? AlignmentType.START : getAlignment(content.attrs || {})
                })
              );
            }
          }
        }
      };
      await processListItems(node.content || [], listLevel, nodeDir);
      break;
    }
    case "orderedList": {
      context.orderedListInstanceCounter++;
      const currentInstance = context.orderedListInstanceCounter;
      const processOrderedListItems = async (items, level, parentDir) => {
        for (const listItem of items) {
          const itemDir = listItem.attrs?.dir || parentDir || nodeDir;
          for (const content of listItem.content || []) {
            if (content.type === "bulletList" || content.type === "orderedList") {
              await processOrderedListItems(
                content.content || [],
                level + 1,
                itemDir
              );
            } else if (content.type === "paragraph") {
              const paraDir = content.attrs?.dir || itemDir;
              const isParaRTL = paraDir === "rtl";
              context.documentChildren.push(
                new Paragraph({
                  children: processTextContent(content.content || [], isParaRTL),
                  numbering: {
                    reference: "ordered-list-numbering",
                    level,
                    instance: currentInstance
                  },
                  bidirectional: isParaRTL ? true : void 0,
                  alignment: isParaRTL ? AlignmentType.START : getAlignment(content.attrs || {})
                })
              );
            }
          }
        }
      };
      await processOrderedListItems(node.content || [], listLevel, nodeDir);
      break;
    }
    case "taskList": {
      for (const taskItem of node.content || []) {
        const isChecked = taskItem.attrs?.checked === true;
        const itemDir = taskItem.attrs?.dir || nodeDir;
        for (const para of taskItem.content || []) {
          if (para.type === "paragraph") {
            const paraDir = para.attrs?.dir || itemDir;
            const isParaRTL = paraDir === "rtl";
            context.documentChildren.push(
              new Paragraph({
                children: [
                  new CheckBox({ checked: isChecked }),
                  new TextRun({ text: " ", rightToLeft: isParaRTL }),
                  ...processTextContent(para.content || [], isParaRTL)
                ],
                bidirectional: isParaRTL ? true : void 0,
                alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {})
              })
            );
          }
        }
      }
      break;
    }
    case "table": {
      const firstRow = node.content?.[0];
      const firstCell = firstRow?.content?.[0];
      const firstPara = firstCell?.content?.[0];
      const isTableRTL = firstPara?.attrs?.dir === "rtl" || firstCell?.attrs?.dir === "rtl" || firstRow?.attrs?.dir === "rtl" || node.attrs?.dir === "rtl";
      const columnCount = firstRow?.content?.length || 1;
      const totalTableWidth = 9e3;
      const columnWidth = Math.floor(totalTableWidth / columnCount);
      const columnWidths = Array(columnCount).fill(columnWidth);
      const tableRows = node.content?.map((row) => {
        const cells = row.content?.map((cell, cellIndex) => {
          const cellParagraphs = cell.content?.map((para) => {
            const paraDir = para.attrs?.dir || cell.attrs?.dir || row.attrs?.dir || node.attrs?.dir;
            const isParaRTL = paraDir === "rtl" || isTableRTL;
            return new Paragraph({
              children: processTextContent(para.content || [], isParaRTL),
              bidirectional: isParaRTL ? true : void 0,
              alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {})
            });
          }) || [new Paragraph({ children: [] })];
          return new TableCell({
            children: cellParagraphs,
            width: {
              size: columnWidths[cellIndex] || columnWidth,
              type: WidthType.DXA
            }
          });
        }) || [];
        return new TableRow({ children: cells });
      }) || [];
      if (tableRows.length > 0) {
        context.documentChildren.push(
          new Table({
            rows: tableRows,
            columnWidths,
            layout: TableLayoutType.FIXED,
            visuallyRightToLeft: isTableRTL,
            width: { size: totalTableWidth, type: WidthType.DXA }
          })
        );
      }
      break;
    }
    case "blockquote": {
      for (const para of node.content || []) {
        const paraDir = para.attrs?.dir || nodeDir;
        const isParaRTL = paraDir === "rtl";
        if (para.type === "paragraph") {
          context.documentChildren.push(
            new Paragraph({
              children: processTextContent(para.content || [], isParaRTL),
              indent: { left: convertInchesToTwip(0.5) },
              bidirectional: isParaRTL ? true : void 0,
              alignment: isParaRTL ? AlignmentType.START : getAlignment(para.attrs || {}),
              shading: {
                type: ShadingType.SOLID,
                color: "F5F5F5",
                fill: "F5F5F5"
              }
            })
          );
        } else {
          await processNode(para, context);
        }
      }
      break;
    }
    case "codeBlock": {
      const codeLines = node.content?.map((c) => c.text || "").join("\n") || "";
      context.documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLines,
              font: { name: "Courier New" },
              size: "10pt",
              rightToLeft: isNodeRTL
            })
          ],
          shading: {
            type: ShadingType.SOLID,
            color: "F0F0F0",
            fill: "F0F0F0"
          },
          bidirectional: isNodeRTL ? true : void 0,
          alignment: isNodeRTL ? AlignmentType.START : void 0
        })
      );
      break;
    }
    case "horizontalRule":
      context.documentChildren.push(
        new Paragraph({
          thematicBreak: true
        })
      );
      break;
    case "hardBreak":
      context.documentChildren.push(new Paragraph({ children: [] }));
      break;
    default:
      if (node.content) {
        for (const child of node.content) {
          await processNode(child, context, listLevel);
        }
      }
  }
};
var getDocumentStyles = () => ({
  default: {
    document: {
      run: {
        font: "Calibri",
        size: "11pt"
      }
    },
    hyperlink: {
      run: {
        color: "0563C1",
        underline: { type: UnderlineType.SINGLE }
      }
    }
  }
});
var getNumberingConfig = () => ({
  config: [
    {
      reference: "ordered-list-numbering",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.25)
              }
            }
          }
        },
        {
          level: 1,
          format: LevelFormat.LOWER_LETTER,
          text: "%2.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: convertInchesToTwip(1),
                hanging: convertInchesToTwip(0.25)
              }
            }
          }
        },
        {
          level: 2,
          format: LevelFormat.LOWER_ROMAN,
          text: "%3.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: convertInchesToTwip(1.5),
                hanging: convertInchesToTwip(0.25)
              }
            }
          }
        },
        {
          level: 3,
          format: LevelFormat.DECIMAL,
          text: "%4.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: convertInchesToTwip(2),
                hanging: convertInchesToTwip(0.25)
              }
            }
          }
        }
      ]
    }
  ]
});

// src/utils/docx/index.ts
var generateDocxBlob = async (editor) => {
  if (!editor) return null;
  const json = editor.getJSON();
  const context = createProcessingContext();
  for (const node of json.content || []) {
    await processNode(node, context);
  }
  const doc = new Document({
    creator: "GoatEditor",
    title: "Document",
    styles: getDocumentStyles(),
    numbering: getNumberingConfig(),
    sections: [
      {
        children: context.documentChildren.length > 0 ? context.documentChildren : [new Paragraph({ children: [new TextRun("")] })]
      }
    ]
  });
  const blob = await Packer.toBlob(doc);
  return blob;
};
var exportToDocx = async (editor, filename = "document.docx") => {
  const blob = await generateDocxBlob(editor);
  if (blob) {
    saveAs(blob, filename);
  }
};
var LineHeightButton = () => {
  const { editor } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);
  const lineHeights = [
    { label: "Default", value: "normal" },
    { label: "Single", value: "1" },
    { label: "1.15", value: "1.15" },
    { label: "1.5", value: "1.5" },
    { label: "Double", value: "2" }
  ];
  return /* @__PURE__ */ jsxs(DropdownMenu, { open: isOpen, onOpenChange: setIsOpen, children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
      "button",
      {
        "data-testid": "toolbar-line-height",
        className: "h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
        children: /* @__PURE__ */ jsx(ListCollapseIcon, { className: "size-4" })
      }
    ) }),
    /* @__PURE__ */ jsx(DropdownMenuContent, { className: "p-1 flex flex-col gap-y-1", children: lineHeights.map(({ label, value }) => /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => {
          editor?.chain().focus().setLineHeight(value).run();
          setIsOpen(false);
        },
        className: cn(
          "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
          editor?.getAttributes("paragraph").lineHeight === value && "bg-neutral-200/80"
        ),
        children: /* @__PURE__ */ jsx("span", { className: "text-sm", children: label })
      },
      value
    )) })
  ] });
};
var FontSizeButton = () => {
  const { editor } = useEditorStore();
  const currentFontSize = editor?.getAttributes("textStyle").fontSize ? editor?.getAttributes("textStyle").fontSize.replace("px", "") : "16";
  const [fontSize, setFontSize] = useState(currentFontSize);
  const [inputValue, setInputvalue] = useState(fontSize);
  const [isEditing, setIsEditing] = useState(false);
  const updateFontSize = (newSize) => {
    const size = parseInt(newSize);
    if (!isNaN(size) && size > 0) {
      editor?.chain().focus().setFontSize(`${size}px`).run();
      setFontSize(newSize);
      setInputvalue(newSize);
      setIsEditing(false);
    }
  };
  const handleInputChange = (e) => {
    setInputvalue(e.target.value);
  };
  const handleInputBlur = () => {
    updateFontSize(inputValue);
  };
  const handleKeyDown = (e) => {
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
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-testid": "toolbar-font-size",
      className: "flex items-center gap-x-0.5",
      children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            "data-testid": "toolbar-font-size-decrease",
            onClick: decrement,
            className: "h-7 w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
            children: /* @__PURE__ */ jsx(MinusIcon, { className: "size-4" })
          }
        ),
        isEditing ? /* @__PURE__ */ jsx(
          Input,
          {
            "data-testid": "toolbar-font-size-input",
            type: "text",
            value: inputValue,
            onChange: handleInputChange,
            onBlur: handleInputBlur,
            onKeyDown: handleKeyDown,
            className: "h-7 w-10 text-sm text-center border border-neutral-400 rounded-sm bg-transparent focus:outline-none focus:ring-0"
          }
        ) : /* @__PURE__ */ jsx(
          "button",
          {
            "data-testid": "toolbar-font-size-value",
            onClick: () => {
              setIsEditing(true);
              setFontSize(currentFontSize);
            },
            className: "h-7 w-10 text-sm text-center border border-neutral-400 rounded-sm hover:bg-neutral-200/80",
            children: currentFontSize
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            "data-testid": "toolbar-font-size-increase",
            onClick: increment,
            className: "h-7 w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
            children: /* @__PURE__ */ jsx(PlusIcon, { className: "size-4" })
          }
        )
      ]
    }
  );
};
var ListButton = () => {
  const { editor } = useEditorStore();
  const lists = [
    {
      label: "Bullet List",
      icon: ListIcon,
      isActive: editor?.isActive("bulletList"),
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
      testId: "toolbar-list-bullet"
    },
    {
      label: "Ordered List",
      icon: ListOrderedIcon,
      isActive: editor?.isActive("orderedList"),
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
      testId: "toolbar-list-ordered"
    }
  ];
  return /* @__PURE__ */ jsx("div", { className: "flex items-center gap-x-0.5", children: lists.map(({ label, icon, onClick, isActive, testId }) => /* @__PURE__ */ jsx(
    ToolbarButton,
    {
      icon,
      onClick,
      isActive,
      testId
    },
    label
  )) });
};
var AlignButton = () => {
  const { editor } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);
  const alignments = [
    {
      label: "Align left",
      value: "left",
      icon: AlignLeftIcon,
      testId: "toolbar-align-left"
    },
    {
      label: "Align Center",
      value: "center",
      icon: AlignCenterIcon,
      testId: "toolbar-align-center"
    },
    {
      label: "Align Right",
      value: "right",
      icon: AlignRightIcon,
      testId: "toolbar-align-right"
    },
    {
      label: "Align Justified",
      value: "justify",
      icon: AlignJustifyIcon,
      testId: "toolbar-align-justify"
    }
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
  const CurrentAlignIcon = alignments.find((a) => a.value === currentAlignment)?.icon || AlignLeftIcon;
  return /* @__PURE__ */ jsxs(DropdownMenu, { open: isOpen, onOpenChange: setIsOpen, children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
      "button",
      {
        "data-testid": "toolbar-align",
        className: "h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
        children: /* @__PURE__ */ jsx(CurrentAlignIcon, { className: "size-4" })
      }
    ) }),
    /* @__PURE__ */ jsx(DropdownMenuContent, { className: "p-1 flex flex-row gap-x-1", children: alignments.map(({ label, value, icon: Icon, testId }) => /* @__PURE__ */ jsx(
      "button",
      {
        "data-testid": testId,
        onClick: () => {
          editor?.chain().focus().setTextAlign(value).run();
          setIsOpen(false);
        },
        className: cn(
          "flex items-center justify-center p-2 rounded-sm hover:bg-neutral-200/80",
          currentAlignment === value && "bg-blue-100 text-blue-700"
        ),
        title: label,
        children: /* @__PURE__ */ jsx(Icon, { className: "size-4" })
      },
      value
    )) })
  ] });
};
var TextDirectionButton = () => {
  const { editor } = useEditorStore();
  const getCurrentDirection = () => {
    if (!editor) return null;
    const attrs = editor.getAttributes("paragraph");
    return attrs.dir || null;
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-x-0.5", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        "data-testid": "toolbar-ltr",
        onClick: () => editor?.chain().focus().setTextDirection("ltr").run(),
        className: cn(
          "h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5",
          getCurrentDirection() === "ltr" && "bg-neutral-200/80"
        ),
        title: "Left to Right",
        children: /* @__PURE__ */ jsx(TextDirectionLtrIcon, { className: "size-4" })
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        "data-testid": "toolbar-rtl",
        onClick: () => editor?.chain().focus().setTextDirection("rtl").run(),
        className: cn(
          "h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5",
          getCurrentDirection() === "rtl" && "bg-neutral-200/80"
        ),
        title: "Right to Left",
        children: /* @__PURE__ */ jsx(TextDirectionRtlIcon, { className: "size-4" })
      }
    )
  ] });
};
var ImageButton = () => {
  const { editor } = useEditorStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const onChange = (src) => {
    editor?.chain().focus().setImage({ src }).run();
  };
  const onUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const imageUrl2 = URL.createObjectURL(file);
        onChange(imageUrl2);
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
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(DropdownMenu, { children: [
      /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
        "button",
        {
          "data-testid": "toolbar-image-button",
          className: "h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
          children: /* @__PURE__ */ jsx(ImageIcon, { className: "size-4" })
        }
      ) }),
      /* @__PURE__ */ jsxs(DropdownMenuContent, { children: [
        /* @__PURE__ */ jsxs(DropdownMenuItem, { "data-testid": "toolbar-image-upload", onClick: onUpload, children: [
          /* @__PURE__ */ jsx(UploadIcon, { className: "size-2 mr-2" }),
          "Upload"
        ] }),
        /* @__PURE__ */ jsxs(
          DropdownMenuItem,
          {
            "data-testid": "toolbar-image-url",
            onClick: () => setIsDialogOpen(true),
            children: [
              /* @__PURE__ */ jsx(SearchIcon, { className: "size-2 mr-2" }),
              "Paste image URL"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: isDialogOpen, onOpenChange: setIsDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { "data-testid": "image-url-dialog", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Insert image URL" }) }),
      /* @__PURE__ */ jsx(
        "input",
        {
          "data-testid": "image-url-input",
          placeholder: "Insert image URL",
          value: imageUrl,
          onChange: (e) => setImageUrl(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              handleImageUrlSubmit();
            }
          },
          className: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm"
        }
      ),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { "data-testid": "image-url-submit", onClick: handleImageUrlSubmit, children: "Submit" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            "data-testid": "image-url-cancel",
            onClick: () => setIsDialogOpen(false),
            children: "Cancel"
          }
        )
      ] })
    ] }) })
  ] });
};
var LinkButton = () => {
  const { editor } = useEditorStore();
  const [value, setValue] = useState("");
  const onChange = (href) => {
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setValue("");
  };
  return /* @__PURE__ */ jsxs(
    DropdownMenu,
    {
      onOpenChange: (open) => {
        if (open) {
          setValue(editor?.getAttributes("link").href || "");
        }
      },
      children: [
        /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
          "button",
          {
            "data-testid": "toolbar-link",
            className: "h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
            children: /* @__PURE__ */ jsx(Link2Icon, { className: "size-4" })
          }
        ) }),
        /* @__PURE__ */ jsxs(DropdownMenuContent, { className: "p-2.5 flex items-center gap-x-2", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              "data-testid": "toolbar-link-input",
              placeholder: "https://example.com",
              value,
              onChange: (e) => setValue(e.target.value)
            }
          ),
          /* @__PURE__ */ jsx(Button, { "data-testid": "toolbar-link-apply", onClick: () => onChange(value), children: "Apply" })
        ] })
      ]
    }
  );
};
var HighlightColorButton = () => {
  const { editor } = useEditorStore();
  const value = editor?.getAttributes("highlight").color || "#ffffff";
  const onChange = (color) => {
    editor?.chain().focus().setHighlight({ color: color.hex }).run();
  };
  return /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
      "button",
      {
        "data-testid": "toolbar-highlight-color",
        className: "h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
        children: /* @__PURE__ */ jsx(HighlighterIcon, { className: "size-4" })
      }
    ) }),
    /* @__PURE__ */ jsx(
      DropdownMenuContent,
      {
        "data-testid": "toolbar-highlight-color-picker",
        className: "p-0",
        children: /* @__PURE__ */ jsx(SketchPicker, { color: value, onChange })
      }
    )
  ] });
};
var TextColorButton = () => {
  const { editor } = useEditorStore();
  const value = editor?.getAttributes("textStyle").color || "#000000";
  const onChange = (color) => {
    editor?.chain().focus().setColor(color.hex).run();
  };
  return /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
      "button",
      {
        "data-testid": "toolbar-text-color",
        className: "h-7 min-w-7 shrink-0 flex flex-col items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
        children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs", children: "A" }),
          /* @__PURE__ */ jsx("div", { className: "h-0.5 w-full", style: { backgroundColor: value } })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(
      DropdownMenuContent,
      {
        "data-testid": "toolbar-text-color-picker",
        className: "p-0",
        children: /* @__PURE__ */ jsx(SketchPicker, { color: value, onChange })
      }
    )
  ] });
};
var HeadingLevelButton = () => {
  const { editor } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);
  const headings = [
    { label: "Normal text", value: 0, fontSize: "16px" },
    { label: "Heading 1", value: 1, fontSize: "32px" },
    { label: "Heading 2", value: 2, fontSize: "28px" },
    { label: "Heading 3", value: 3, fontSize: "24px" },
    { label: "Heading 4", value: 4, fontSize: "20px" },
    { label: "Heading 5", value: 5, fontSize: "18px" },
    { label: "Heading 6", value: 6, fontSize: "16px" }
  ];
  const getCurrentHeading = () => {
    for (let level = 1; level <= 5; level++) {
      if (editor?.isActive("heading", { level })) {
        return `heading ${level}`;
      }
    }
    return "Normal text";
  };
  return /* @__PURE__ */ jsxs(DropdownMenu, { open: isOpen, onOpenChange: setIsOpen, children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
      "button",
      {
        "data-testid": "toolbar-heading",
        className: "h-7 min-w-7 shrink-0 flex items-center justify-center rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
        children: [
          /* @__PURE__ */ jsx("span", { className: "truncate", children: getCurrentHeading() }),
          /* @__PURE__ */ jsx(ChevronDownIcon, { className: "ml-2 size-4 shrink-0" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(DropdownMenuContent, { className: "p-1 flex flex-col gap-y-1", children: headings.map(({ label, value, fontSize }) => /* @__PURE__ */ jsx(
      "button",
      {
        "data-testid": `toolbar-heading-${value}`,
        style: { fontSize },
        onClick: () => {
          if (value === 0) {
            editor?.chain().focus().setParagraph().run();
          } else {
            editor?.chain().focus().toggleHeading({ level: value }).run();
          }
          setIsOpen(false);
        },
        className: cn(
          "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
          value === 0 && !editor?.isActive("heading") || editor?.isActive("heading", { level: value }) && "bg-neutral-200/80"
        ),
        children: label
      },
      value
    )) })
  ] });
};
var FontFamilyButton = () => {
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
    { label: "MS Serif", value: "MS Serif" }
  ];
  return /* @__PURE__ */ jsxs(DropdownMenu, { open: isOpen, onOpenChange: setIsOpen, children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
      "button",
      {
        "data-testid": "toolbar-font-family",
        className: "h-7 w-[120px] shrink-0 flex items-center justify-between rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm",
        children: [
          /* @__PURE__ */ jsx("span", { className: "truncate", children: editor?.getAttributes("textStyle").fontFamily || "Arial" }),
          /* @__PURE__ */ jsx(ChevronDownIcon, { className: "ml-2 size-4 shrink-0" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(
      DropdownMenuContent,
      {
        "data-testid": "toolbar-font-family-dropdown",
        className: "p-1 flex flex-col gap-y-1",
        children: fonts.map(({ label, value }) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              editor?.chain().focus().setFontFamily(value).run();
              setIsOpen(false);
            },
            "data-testid": `toolbar-font-${value.toLowerCase().replace(/\s+/g, "-")}`,
            className: cn(
              "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
              editor?.getAttributes("textStyle").fontfamily === value && "bg-neutral-200/80"
            ),
            style: { fontFamily: value },
            children: /* @__PURE__ */ jsx("span", { className: "text-sm", children: label })
          },
          value
        ))
      }
    )
  ] });
};
var ToolbarButton = ({
  onClick,
  isActive,
  icon: Icon,
  testId
}) => {
  return /* @__PURE__ */ jsx(
    "button",
    {
      onClick,
      "data-testid": testId,
      className: cn(
        "text-sm h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
        isActive && "bg-neutral-200/80"
      ),
      children: /* @__PURE__ */ jsx(Icon, { className: "size-4" })
    }
  );
};
var ExportDocxButton = () => {
  const { editor } = useEditorStore();
  const onSaveDocx = () => {
    exportToDocx(editor);
  };
  return /* @__PURE__ */ jsx(
    "button",
    {
      "data-testid": "shortcut-export-docx",
      onClick: onSaveDocx,
      className: "text-sm h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
      title: "Export to Word (.docx)",
      children: /* @__PURE__ */ jsx(BsFileWord, { className: "size-4" })
    }
  );
};
var ExportPdfButton = () => {
  return /* @__PURE__ */ jsx(
    "button",
    {
      "data-testid": "shortcut-export-pdf",
      onClick: () => window.print(),
      className: "text-sm h-7 min-w-7 flex items-center justify-center rounded-sm hover:bg-neutral-200/80",
      title: "Export to PDF",
      children: /* @__PURE__ */ jsx(BsFilePdf, { className: "size-4" })
    }
  );
};
var Toolbar = ({ direction = "ltr", className }) => {
  const { editor } = useEditorStore();
  const sections = [
    [
      {
        label: "Undo",
        icon: Undo2Icon,
        onClick: () => editor?.chain().focus().undo().run(),
        testId: "toolbar-undo"
      },
      {
        label: "Redo",
        icon: Redo2Icon,
        onClick: () => editor?.chain().focus().redo().run(),
        testId: "toolbar-redo"
      },
      {
        label: "Print",
        icon: PrinterIcon,
        onClick: () => window.print(),
        testId: "toolbar-print"
      }
    ],
    [
      {
        label: "Bold",
        icon: BoldIcon,
        isActive: editor?.isActive("bold"),
        onClick: () => editor?.chain().focus().toggleBold().run(),
        testId: "toolbar-bold"
      },
      {
        label: "Italic",
        icon: ItalicIcon,
        isActive: editor?.isActive("italic"),
        onClick: () => editor?.chain().focus().toggleItalic().run(),
        testId: "toolbar-italic"
      },
      {
        label: "Underline",
        icon: UnderlineIcon,
        isActive: editor?.isActive("underline"),
        onClick: () => editor?.chain().focus().toggleUnderline().run(),
        testId: "toolbar-underline"
      }
    ]
  ];
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-testid": "toolbar",
      dir: direction,
      className: cn(
        "goat-editor-toolbar bg-[#F1F4F9] px-2.5 py-0.5 rounded-[24px] min-h-[40px] flex items-center gap-x-0.5 overflow-x-auto",
        className
      ),
      children: [
        sections[0].map((item) => /* @__PURE__ */ jsx(ToolbarButton, { ...item }, item.label)),
        /* @__PURE__ */ jsx(Separator, { orientation: "vertical", className: "h-6 bg-neutral-300" }),
        /* @__PURE__ */ jsx(FontFamilyButton, {}),
        /* @__PURE__ */ jsx(Separator, { orientation: "vertical", className: "h-6 bg-neutral-300" }),
        /* @__PURE__ */ jsx(HeadingLevelButton, {}),
        /* @__PURE__ */ jsx(Separator, { orientation: "vertical", className: "h-6 bg-neutral-300" }),
        /* @__PURE__ */ jsx(FontSizeButton, {}),
        /* @__PURE__ */ jsx(Separator, { orientation: "vertical", className: "h-6 bg-neutral-300" }),
        sections[1].map((item) => /* @__PURE__ */ jsx(ToolbarButton, { ...item }, item.label)),
        /* @__PURE__ */ jsx(TextColorButton, {}),
        /* @__PURE__ */ jsx(HighlightColorButton, {}),
        /* @__PURE__ */ jsx(Separator, { orientation: "vertical", className: "h-6 bg-neutral-300" }),
        /* @__PURE__ */ jsx(LinkButton, {}),
        /* @__PURE__ */ jsx(ImageButton, {}),
        /* @__PURE__ */ jsx(AlignButton, {}),
        /* @__PURE__ */ jsx(TextDirectionButton, {}),
        /* @__PURE__ */ jsx(LineHeightButton, {}),
        /* @__PURE__ */ jsx(ListButton, {}),
        /* @__PURE__ */ jsx(Separator, { orientation: "vertical", className: "h-6 bg-neutral-300" }),
        /* @__PURE__ */ jsx(ExportDocxButton, {}),
        /* @__PURE__ */ jsx(ExportPdfButton, {})
      ]
    }
  );
};
var markers = Array.from({ length: 83 }, (_, i) => i);
var Ruler = ({ width = 816 }) => {
  const [leftMargin, setLeftMargin] = useState(56);
  const [rightMargin, setRightMargin] = useState(56);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const rulerRef = useRef(null);
  const handleLeftMouseDown = () => {
    setIsDraggingLeft(true);
  };
  const handleRightMouseDown = () => {
    setIsDraggingRight(true);
  };
  const handleMouseMove = (e) => {
    const PAGE_WIDTH = width;
    const MININUM_SPACE = 100;
    if ((isDraggingLeft || isDraggingRight) && rulerRef.current) {
      const container = rulerRef.current.querySelector("#ruler-container");
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left;
        const rawPosition = Math.max(0, Math.min(PAGE_WIDTH, relativeX));
        if (isDraggingLeft) {
          const maxLeftPosition = PAGE_WIDTH - rightMargin - MININUM_SPACE;
          const newLeftPosition = Math.min(rawPosition, maxLeftPosition);
          setLeftMargin(newLeftPosition);
        } else if (isDraggingRight) {
          const maxRightPosition = PAGE_WIDTH - (leftMargin + MININUM_SPACE);
          const newRightPosition = Math.max(PAGE_WIDTH - rawPosition, 0);
          const constrainedRightPosition = Math.min(
            newRightPosition,
            maxRightPosition
          );
          setRightMargin(constrainedRightPosition);
        }
      }
    }
  };
  const handleMouseUp = () => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  };
  const handleLeftDoubleClick = () => {
    setLeftMargin(56);
  };
  const handleRightDoubleClick = () => {
    setRightMargin(56);
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: rulerRef,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      className: "goat-editor-ruler mx-auto h-6 border-b border-gray-300 flex items-end relative select-none print:hidden",
      style: { width: `${width}px` },
      children: /* @__PURE__ */ jsxs("div", { id: "ruler-container", className: "w-full h-full relative", children: [
        /* @__PURE__ */ jsx(
          Marker,
          {
            position: leftMargin,
            isLeft: true,
            isDragging: isDraggingLeft,
            onMouseDown: handleLeftMouseDown,
            onDoubleClick: handleLeftDoubleClick
          }
        ),
        /* @__PURE__ */ jsx(
          Marker,
          {
            position: rightMargin,
            isLeft: false,
            isDragging: isDraggingRight,
            onMouseDown: handleRightMouseDown,
            onDoubleClick: handleRightDoubleClick
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bottom-0 h-full", children: /* @__PURE__ */ jsx("div", { className: "relative h-full", style: { width: `${width}px` }, children: markers.map((marker) => {
          const position = marker * width / 82;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "absolute bottom-0",
              style: { left: `${position}px` },
              children: [
                marker % 10 === 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 w-[1px] h-2 bg-neutral-500" }),
                  /* @__PURE__ */ jsx("span", { className: "absolute bottom-2 text-[10px] text-neutral-500 transform -translate-x-1/2", children: marker / 10 + 1 })
                ] }),
                marker % 5 === 0 && marker % 10 !== 0 && /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 w-[1px] h-1.5 bg-neutral-500" }),
                marker % 5 !== 0 && /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 w-[1px] h-1 bg-neutral-500" })
              ]
            },
            marker
          );
        }) }) })
      ] })
    }
  );
};
var Marker = ({
  position,
  isLeft,
  isDragging,
  onMouseDown,
  onDoubleClick
}) => {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "absolute top-0 w-4 h-full cursor-ew-resize z-[5] group -ml-2",
      style: { [isLeft ? "left" : "right"]: `${position}px` },
      onMouseDown,
      onDoubleClick,
      children: [
        /* @__PURE__ */ jsx(FaCaretDown, { className: "absolute left-1/2 top-0 h-full fill-blue-500 transform -translate-x-1/2" }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "absolute left-1/2 top-4 transform -translate-x-1/2",
            style: {
              height: "100vh",
              width: "1px",
              transform: "scaleX(0.5)",
              backgroundColor: "#3b72f6",
              display: isDragging ? "block" : "none"
            }
          }
        )
      ]
    }
  );
};
var GoatEditor = ({ options = {} }) => {
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
    toolbarDirection
  } = options;
  const { setEditor } = useEditorStore();
  const [content, setContent] = useState(null);
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    } else {
      setContent("");
    }
  }, [initialContent]);
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
      "blockquote"
    ],
    defaultDirection
  });
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    autofocus: autoFocus,
    onCreate({ editor: editor2 }) {
      setEditor(editor2);
      onReady?.(editor2);
    },
    onDestroy() {
      setEditor(null);
      onDestroy?.();
    },
    onUpdate({ editor: editor2 }) {
      setEditor(editor2);
      onChange?.(editor2.getHTML(), editor2.getJSON());
    },
    onSelectionUpdate({ editor: editor2 }) {
      setEditor(editor2);
    },
    onTransaction({ editor: editor2 }) {
      setEditor(editor2);
    },
    onFocus({ editor: editor2 }) {
      setEditor(editor2);
    },
    onBlur({ editor: editor2 }) {
      setEditor(editor2);
    },
    onContentError({ editor: editor2 }) {
      setEditor(editor2);
    },
    editorProps: {
      attributes: {
        id: "goat-editor-content",
        "data-testid": "editor-content",
        style: `padding-left: 56px; padding-right: 56px; min-height: ${dimensions.height}px; width: ${dimensions.width}px;`,
        class: "focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col pt-10 pr-10 cursor-text"
      }
    },
    extensions: [
      StarterKit,
      LineHeightExtension,
      FontSizeExtension,
      textDirectionExtension,
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https"
      }),
      Color,
      Highlight.configure({
        multicolor: true
      }),
      FontFamily,
      TextStyle,
      Underline,
      Image,
      ImageResize,
      Table2,
      TableCell2,
      TableHeader,
      TableRow2,
      TaskItem.configure({
        nested: true
      }),
      TaskList,
      ...customExtensions
    ]
  });
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    } else if (editor && (!content || content === "")) {
      const isEmpty = editor.isEmpty;
      if (isEmpty) {
        editor.commands.setTextDirection(defaultDirection);
        editor.commands.setTextAlign(
          defaultDirection === "rtl" ? "right" : "left"
        );
      }
    }
  }, [editor, content, defaultDirection]);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn("goat-editor min-h-screen bg-[#FAFBFD]", className),
      "data-testid": "goat-editor",
      children: [
        showToolbar && /* @__PURE__ */ jsx("div", { className: "goat-editor-toolbar-wrapper flex flex-col px-4 pt-2 gap-y-2 fixed top-0 left-0 right-0 z-10 bg-[#FAFBFD] print:hidden", children: /* @__PURE__ */ jsx(
          Toolbar,
          {
            direction: toolbarDirection || defaultDirection,
            className: toolbarClassName
          }
        ) }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: cn(
              "goat-editor-content-wrapper print:pt-0",
              showToolbar && "pt-[60px]"
            ),
            children: /* @__PURE__ */ jsxs(
              "div",
              {
                id: "goat-editor-container",
                "data-testid": "editor-container",
                className: "size-full overflow-x-auto bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-visible",
                children: [
                  showRuler && /* @__PURE__ */ jsx(Ruler, { width: dimensions.width }),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: "min-w-max flex justify-center py-4 print:py-0 mx-auto print:w-full print:min-w-0",
                      style: { width: `${dimensions.width}px` },
                      children: /* @__PURE__ */ jsx(EditorContent, { editor })
                    }
                  )
                ]
              }
            )
          }
        )
      ]
    }
  );
};
async function getConverterModule() {
  const { getConverter, convertDocxToPdf, preInitialize } = await import('./zetajs-converter-FUL2UQPY.mjs');
  return { getConverter, convertDocxToPdf, preInitialize };
}
async function exportToPdf(editor, filename = "document.pdf", onProgress) {
  if (!editor) {
    onProgress?.({ status: "error", message: "Export failed", error: "No editor provided" });
    throw new Error("No editor provided");
  }
  try {
    onProgress?.({ status: "initializing", message: "Initializing PDF converter..." });
    const { getConverter } = await getConverterModule();
    const converter = getConverter();
    await converter.initialize();
    onProgress?.({ status: "generating-docx", message: "Generating document..." });
    const docxBlob = await generateDocxBlob(editor);
    if (!docxBlob) {
      throw new Error("Failed to generate DOCX");
    }
    onProgress?.({ status: "converting-to-pdf", message: "Converting to PDF..." });
    const baseName = filename.replace(/\.pdf$/i, "");
    const pdfBlob = await converter.convertDocxToPdf(docxBlob, baseName);
    onProgress?.({ status: "complete", message: "Download starting..." });
    const outputFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    saveAs(pdfBlob, outputFilename);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    onProgress?.({ status: "error", message: "Export failed", error: errorMessage });
    throw error;
  }
}
async function generatePdfBlob(editor, onProgress) {
  if (!editor) {
    onProgress?.({ status: "error", message: "Generation failed", error: "No editor provided" });
    return null;
  }
  try {
    onProgress?.({ status: "initializing", message: "Initializing PDF converter..." });
    const { getConverter } = await getConverterModule();
    const converter = getConverter();
    await converter.initialize();
    onProgress?.({ status: "generating-docx", message: "Generating document..." });
    const docxBlob = await generateDocxBlob(editor);
    if (!docxBlob) {
      throw new Error("Failed to generate DOCX");
    }
    onProgress?.({ status: "converting-to-pdf", message: "Converting to PDF..." });
    const pdfBlob = await converter.convertDocxToPdf(docxBlob, "document");
    onProgress?.({ status: "complete", message: "PDF generated" });
    return pdfBlob;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    onProgress?.({ status: "error", message: "Generation failed", error: errorMessage });
    throw error;
  }
}
async function preInitializePdfConverter() {
  const { preInitialize } = await getConverterModule();
  return preInitialize();
}
async function isPdfConverterReady() {
  try {
    const { getConverter } = await getConverterModule();
    return getConverter().isReady();
  } catch {
    return false;
  }
}

export { FontSizeExtension, GoatEditor, LineHeightExtension, Ruler, TextDirectionExtension, Toolbar, GoatEditor as default, exportToDocx, exportToPdf, generateDocxBlob, generatePdfBlob, isPdfConverterReady, preInitializePdfConverter, useEditorStore };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map