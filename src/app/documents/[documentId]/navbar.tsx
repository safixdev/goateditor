"use client";

import Link from "next/link";
import Image from "next/image";
import { BsFilePdf, BsFileWord } from "react-icons/bs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { saveAs } from "file-saver"; 
import {
  BoldIcon,
  ImportIcon,
  FileIcon,
  FileJsonIcon,
  FilePenIcon,
  FilePlus,
  FileTextIcon,
  FileUpIcon,
  GlobeIcon,
  ItalicIcon,
  PrinterIcon,
  Redo2Icon,
  RemoveFormattingIcon,
  StrikethroughIcon,
  TextIcon,
  TrashIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

import { DocumentInput } from "./document-input";
import { useEditorStore } from "@/store/use-editor-store";
import { useState } from "react";

export const Navbar = () => {
  const { editor } = useEditorStore();

  const insertTable = ({ rows, cols }: { rows: number; cols: number }) => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: false })
      .run();
  };

  const onDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const onSaveJSON = () => {
    if (!editor) return;

    const content = editor.getJSON();
    const blob = new Blob([JSON.stringify(content)], {
      type: "application/json",
    });
    onDownload(blob, "document.json"); //TODO: Use document name
  };

  const onSaveHTML = () => {
    if (!editor) return;

    const content = editor.generateHTML();
    const blob = new Blob([content], {
      type: "text/html",
    });
    onDownload(blob, "document.html"); //TODO: Use document name
  };

  const onSaveText = () => {
    if (!editor) return;

    const content = editor.getHTML();
    const blob = new Blob([content], {
      type: "text/plain",
    });
    onDownload(blob, "document.txt"); //TODO: Use document name
  };

  const onSaveDocx = async () => {
    if (!editor) return;

    const json = editor.getJSON();
    console.log("Editor JSON for DOCX export:", JSON.stringify(json, null, 2));
    const children: (Paragraph | Table)[] = [];

    // Direction is now per-paragraph, read from node.attrs.dir

    // Helper function to detect image type from src
    const getImageType = (src: string): "png" | "jpg" | "gif" | "bmp" => {
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
      const ext = src.split('.').pop()?.toLowerCase().split('?')[0];
      if (ext === "jpg" || ext === "jpeg") return "jpg";
      if (ext === "gif") return "gif";
      if (ext === "bmp") return "bmp";
      return "png";
    };

    // Helper function to fetch image and convert to ArrayBuffer
    const fetchImageAsArrayBuffer = async (src: string): Promise<ArrayBuffer | null> => {
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

    // Helper function to load image via canvas (handles CORS)
    const loadImageViaCanvas = (src: string): Promise<ArrayBuffer | null> => {
      return new Promise((resolve) => {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
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
            }, 'image/png');
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    // Helper function to parse dimension value (handles "300px", "300", 300, etc.)
    const parseDimension = (value: unknown): number | null => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    // Helper function to extract dimensions from style string
    const extractStyleDimensions = (style: string): { width: number | null; height: number | null } => {
      let width: number | null = null;
      let height: number | null = null;
      
      const widthMatch = style.match(/width:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
      if (widthMatch) {
        width = parseFloat(widthMatch[1]);
      }
      
      const heightMatch = style.match(/height:\s*(\d+(?:\.\d+)?)(px|%|em|rem)?/i);
      if (heightMatch) {
        height = parseFloat(heightMatch[1]);
      }
      
      return { width, height };
    };

    // Helper function to extract alignment from style string
    const extractStyleAlignment = (style: string): string | null => {
      const floatMatch = style.match(/float:\s*(left|right)/i);
      if (floatMatch) {
        return floatMatch[1].toLowerCase();
      }
      
      if (style.includes('margin: 0 auto') || style.includes('margin:0 auto') || 
          (style.includes('margin-left: auto') && style.includes('margin-right: auto'))) {
        return 'center';
      }
      
      if (style.includes('display: block') && style.includes('auto')) {
        return 'center';
      }
      
      const textAlignMatch = style.match(/text-align:\s*(left|center|right)/i);
      if (textAlignMatch) {
        return textAlignMatch[1].toLowerCase();
      }
      
      return null;
    };

    // Helper function to get image dimensions - preserves actual size
    const getImageDimensions = (attrs: Record<string, unknown>): { width: number; height: number } => {
      const maxWidth = 600;
      let width: number | null = null;
      let height: number | null = null;
      
      // First, try to get from style attribute
      if (attrs?.style && typeof attrs.style === 'string') {
        const styleDims = extractStyleDimensions(attrs.style);
        if (styleDims.width) width = styleDims.width;
        if (styleDims.height) height = styleDims.height;
      }
      
      // Direct attributes take precedence
      const attrWidth = parseDimension(attrs?.width);
      const attrHeight = parseDimension(attrs?.height);
      if (attrWidth) width = attrWidth;
      if (attrHeight) height = attrHeight;
      
      // Default dimensions if nothing found
      if (!width) width = 300;
      if (!height) height = 200;
      
      console.log("Image dimensions extracted:", { 
        originalWidth: width, 
        originalHeight: height, 
        fromStyle: attrs?.style,
        attrWidth: attrs?.width,
        attrHeight: attrs?.height
      });
      
      // Scale down proportionally if too wide
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }
      
      return { width: Math.round(width), height: Math.round(height) };
    };

    // Helper function to get image alignment from attributes
    const getImageAlignment = (attrs: Record<string, unknown>): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined => {
      if (attrs?.align) {
        const align = (attrs.align as string).toLowerCase();
        if (align === 'center') return AlignmentType.CENTER;
        if (align === 'right') return AlignmentType.RIGHT;
        if (align === 'left') return AlignmentType.LEFT;
      }
      
      if (attrs?.style && typeof attrs.style === 'string') {
        const styleAlign = extractStyleAlignment(attrs.style);
        if (styleAlign === 'center') return AlignmentType.CENTER;
        if (styleAlign === 'right') return AlignmentType.RIGHT;
        if (styleAlign === 'left') return AlignmentType.LEFT;
      }
      
      if (attrs?.textAlign) {
        const align = (attrs.textAlign as string).toLowerCase();
        if (align === 'center') return AlignmentType.CENTER;
        if (align === 'right') return AlignmentType.RIGHT;
        if (align === 'left') return AlignmentType.LEFT;
      }
      
      return undefined;
    };


    // Helper function to process text content with marks
    const processTextContent = (
      content: Array<{ type: string; text?: string; marks?: Array<{ type: string }> }>,
      isRTL: boolean = false
    ): TextRun[] => {
      if (!content) return [new TextRun({ text: "", rightToLeft: isRTL })];
      
      return content.map((item) => {
        if (item.type === "text") {
          const marks = item.marks || [];
          const isBold = marks.some((m) => m.type === "bold");
          const isItalic = marks.some((m) => m.type === "italic");
          const isUnderline = marks.some((m) => m.type === "underline");
          const isStrike = marks.some((m) => m.type === "strike");
          
          return new TextRun({
            text: item.text || "",
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? {} : undefined,
            strike: isStrike,
            rightToLeft: isRTL,
          });
        }
        return new TextRun({ text: "", rightToLeft: isRTL });
      });
    };

    // Helper function to get alignment
    const getAlignment = (attrs: Record<string, unknown>): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined => {
      if (!attrs?.textAlign) return undefined;
      const alignMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
        left: AlignmentType.LEFT,
        center: AlignmentType.CENTER,
        right: AlignmentType.RIGHT,
        justify: AlignmentType.JUSTIFIED,
      };
      return alignMap[attrs.textAlign as string];
    };

    // Helper function to check if a node is an image
    const isImageNode = (node: { type: string }): boolean => {
      return node.type === "image" || node.type === "resizableImage" || node.type === "imageResize";
    };

    // Helper function to create image paragraph
    const createImageParagraph = async (
      item: { type: string; attrs?: Record<string, unknown> },
      parentAlignment?: (typeof AlignmentType)[keyof typeof AlignmentType]
    ): Promise<Paragraph | null> => {
      const src = item.attrs?.src as string;
      if (!src) {
        console.warn("Image node has no src:", item);
        return null;
      }
      
      console.log("Creating image paragraph with attrs:", item.attrs);
      
      const imageData = await fetchImageAsArrayBuffer(src);
      if (!imageData) {
        console.warn("Failed to fetch image data for:", src.substring(0, 100));
        return null;
      }
      
      const { width, height } = getImageDimensions(item.attrs || {});
      const imageType = getImageType(src);
      
      const imageAlignment = getImageAlignment(item.attrs || {});
      const finalAlignment = imageAlignment || parentAlignment;
      
      console.log("Final image settings:", { width, height, imageType, alignment: finalAlignment });
      
      return new Paragraph({
        children: [
          new ImageRun({
            data: imageData,
            transformation: { width, height },
            type: imageType,
          }),
        ],
        alignment: finalAlignment,
      });
    };

    // Process each node in the document
    type DocNode = {
      type: string;
      attrs?: Record<string, unknown>;
      content?: DocNode[];
      text?: string;
      marks?: Array<{ type: string }>;
    };

    const processNode = async (node: DocNode): Promise<void> => {
      switch (node.type) {
        case "paragraph": {
          const hasImage = node.content?.some((item) => isImageNode(item));
          const baseAlignment = getAlignment(node.attrs || {});
          
          // Get direction from paragraph attributes (per-paragraph RTL support)
          const nodeDir = node.attrs?.dir as string | undefined;
          const isNodeRTL = nodeDir === "rtl";
          
          // For RTL: bidirectional + START alignment (START = right side in RTL mode)
          const rtlOptions = isNodeRTL ? {
            bidirectional: true,
            alignment: AlignmentType.START,
          } : {};
          
          console.log("Creating paragraph - dir:", nodeDir, "isRTL:", isNodeRTL, "options:", rtlOptions);
          
          if (hasImage) {
            for (const item of node.content || []) {
              if (isImageNode(item)) {
                const imgParagraph = await createImageParagraph(item, getAlignment(node.attrs || {}));
                if (imgParagraph) children.push(imgParagraph);
              } else if (item.type === "text") {
                children.push(
                  new Paragraph({
                    children: [new TextRun({ text: item.text || "", rightToLeft: isNodeRTL })],
                    alignment: isNodeRTL ? AlignmentType.RIGHT : baseAlignment,
                    ...rtlOptions,
                  })
                );
              }
            }
          } else {
            const textRuns = processTextContent(
              (node.content || []) as Array<{ type: string; text?: string; marks?: Array<{ type: string }> }>,
              isNodeRTL
            );
            children.push(
              new Paragraph({
                children: textRuns,
                alignment: isNodeRTL ? AlignmentType.RIGHT : baseAlignment,
                ...rtlOptions,
              })
            );
          }
          break;
        }

        case "image":
        case "resizableImage":
        case "imageResize": {
          const imgParagraph = await createImageParagraph(node);
          if (imgParagraph) children.push(imgParagraph);
          break;
        }

        case "heading": {
          const level = (node.attrs?.level as number) || 1;
          const headingLevelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
            1: HeadingLevel.HEADING_1,
            2: HeadingLevel.HEADING_2,
            3: HeadingLevel.HEADING_3,
            4: HeadingLevel.HEADING_4,
            5: HeadingLevel.HEADING_5,
            6: HeadingLevel.HEADING_6,
          };
          // Get direction from heading attributes
          const headingDir = node.attrs?.dir as string | undefined;
          const isHeadingRTL = headingDir === "rtl";
          
          children.push(
            new Paragraph({
              children: processTextContent(
                (node.content || []) as Array<{ type: string; text?: string; marks?: Array<{ type: string }> }>,
                isHeadingRTL
              ),
              heading: headingLevelMap[level] || HeadingLevel.HEADING_1,
              bidirectional: isHeadingRTL ? true : undefined,
              alignment: isHeadingRTL ? AlignmentType.START : getAlignment(node.attrs || {}),
            })
          );
          break;
        }

        case "bulletList":
        case "orderedList": {
          // Get direction from list attributes
          const listDir = node.attrs?.dir as string | undefined;
          const isListRTL = listDir === "rtl";
          
          for (const listItem of node.content || []) {
            // Check listItem direction too
            const itemDir = (listItem.attrs?.dir as string | undefined) || listDir;
            const isItemRTL = itemDir === "rtl";
            
            for (const para of listItem.content || []) {
              // Check paragraph direction (most specific)
              const paraDir = (para.attrs?.dir as string | undefined) || itemDir;
              const isParaRTL = paraDir === "rtl";
              
              children.push(
                new Paragraph({
                  children: processTextContent(
                    (para.content || []) as Array<{ type: string; text?: string; marks?: Array<{ type: string }> }>,
                    isParaRTL
                  ),
                  bullet: node.type === "bulletList" ? { level: 0 } : undefined,
                  numbering: node.type === "orderedList" ? { reference: "default-numbering", level: 0 } : undefined,
                  bidirectional: isParaRTL ? true : undefined,
                  alignment: isParaRTL ? AlignmentType.START : undefined,
                })
              );
            }
          }
          break;
        }

        case "table": {
          const rows = node.content?.map((row) => {
            const cells = row.content?.map((cell) => {
              const cellContent = cell.content?.flatMap((para) => 
                processTextContent((para.content || []) as Array<{ type: string; text?: string; marks?: Array<{ type: string }> }>)
              ) || [];
              return new TableCell({
                children: [new Paragraph({ children: cellContent })],
                width: { size: 100 / (row.content?.length || 1), type: WidthType.PERCENTAGE },
              });
            }) || [];
            return new TableRow({ children: cells });
          }) || [];
          
          if (rows.length > 0) {
            children.push(new Table({ rows }));
          }
          break;
        }

        case "blockquote": {
          // Get direction from blockquote attributes
          const blockquoteDir = node.attrs?.dir as string | undefined;
          
          for (const para of node.content || []) {
            const paraDir = (para.attrs?.dir as string | undefined) || blockquoteDir;
            const isParaRTL = paraDir === "rtl";
            
            children.push(
              new Paragraph({
                children: processTextContent(
                  (para.content || []) as Array<{ type: string; text?: string; marks?: Array<{ type: string }> }>,
                  isParaRTL
                ),
                indent: { left: 720 },
                bidirectional: isParaRTL ? true : undefined,
                alignment: isParaRTL ? AlignmentType.START : undefined,
              })
            );
          }
          break;
        }

        case "codeBlock": {
          const codeText = node.content?.map((c) => c.text || "").join("\n") || "";
          // Get direction from codeBlock attributes
          const codeDir = node.attrs?.dir as string | undefined;
          const isCodeRTL = codeDir === "rtl";
          
          children.push(
            new Paragraph({
              children: [new TextRun({ text: codeText, font: "Courier New", rightToLeft: isCodeRTL })],
              bidirectional: isCodeRTL ? true : undefined,
              alignment: isCodeRTL ? AlignmentType.START : undefined,
            })
          );
          break;
        }

        case "horizontalRule":
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "─".repeat(50) })],
            })
          );
          break;

        default:
          if (node.content) {
            for (const child of node.content) {
              await processNode(child);
            }
          }
      }
    };

    // Process all nodes
    for (const node of (json.content || []) as DocNode[]) {
      await processNode(node);
    }

    // Create the document
    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "default-numbering",
            levels: [
              {
                level: 0,
                format: "decimal",
                text: "%1.",
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
      sections: [
        {
          children: children.length > 0 ? children : [new Paragraph({ children: [new TextRun({ text: "" })] })],
        },
      ],
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "document.docx");
  };

  // State to hold dynamic row and column values
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);

  const handleInsertTable = () => {
    insertTable({ rows, cols });
  };

  // State to track full screen status
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    const element = document.documentElement; // Or any specific element you want to make fullscreen

    if (
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    ) {
      // If already in fullscreen, exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }

      setIsFullScreen(false); // Update the state to reflect exiting fullscreen
    } else {
      // If not in fullscreen, request fullscreen
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen();
      }

      setIsFullScreen(true); // Update the state to reflect entering fullscreen
    }
  };

  return (
    <nav data-testid="navbar" className="flex items-center justify-between">
      <div className="flex gap-2 items-center">
        <Link href="/" data-testid="navbar-logo">
          <Image
            src="/IITG_Logo_20241210_01.png"
            alt="Logo"
            width={36}
            height={36}
          />
        </Link>
        <div className="flex flex-col">
          <DocumentInput />
          <div className="flex">
            <Menubar className="border-none bg-transparent shadow-none h-auto p-0">
              {/* File Menu */}
              <MenubarMenu>
                <MenubarTrigger data-testid="menu-file" className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  File
                </MenubarTrigger>
                <MenubarContent className="print:hidden">
                  <MenubarSub>
                    <MenubarSubTrigger data-testid="menu-file-save">
                      <FileIcon className="size-4 mr-2" />
                      Save
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarItem data-testid="menu-file-save-docx" onClick={onSaveDocx}>
                        <BsFileWord className="size-4 mr-2" />
                        Word (.docx)
                      </MenubarItem>
                      <MenubarItem data-testid="menu-file-save-pdf" onClick={() => window.print()}>
                        <BsFilePdf className="size-4 mr-2" />
                        PDF
                      </MenubarItem>
                      <MenubarItem data-testid="menu-file-save-text" onClick={onSaveText}>
                        <FileTextIcon className="size-4 mr-2" />
                        Text
                      </MenubarItem>
                    </MenubarSubContent>
                  </MenubarSub>
                  <MenubarItem data-testid="menu-file-import">
                    <ImportIcon className="size-4 mr-2" />
                    Import / Open
                  </MenubarItem>
                  <MenubarItem data-testid="menu-file-new">
                    <FilePlus className="size-4 mr-2" />
                    New Document
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem data-testid="menu-file-rename">
                    <FilePenIcon className="size-4 mr-2" />
                    Rename
                  </MenubarItem>
                  <MenubarItem data-testid="menu-file-remove">
                    <TrashIcon className="size-4 mr-2" />
                    Remove
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem data-testid="menu-file-print" onClick={() => window.print()}>
                    <PrinterIcon className="size-4 mr-2" />
                    Print <MenubarShortcut>⌘P</MenubarShortcut>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Edit Menu */}
              <MenubarMenu>
                <MenubarTrigger data-testid="menu-edit" className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Edit
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarItem
                    data-testid="menu-edit-undo"
                    onClick={() => editor?.chain().focus().undo().run()}
                  >
                    <Undo2Icon className="size-4 mr-2" />
                    Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem
                    data-testid="menu-edit-redo"
                    onClick={() => editor?.chain().focus().redo().run()}
                  >
                    <Redo2Icon className="size-4 mr-2" />
                    Redo <MenubarShortcut>⌘Y</MenubarShortcut>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Insert Menu */}
              <MenubarMenu>
                <MenubarTrigger data-testid="menu-insert" className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Insert
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarSub>
                    <MenubarSubTrigger data-testid="menu-insert-table">Table</MenubarSubTrigger>
                    <MenubarSubContent>
                      <div className="p-2">
                        <div className="mb-2">
                          <label htmlFor="rows" className="text-sm">
                            Rows:
                          </label>
                          <input
                            type="number"
                            id="rows"
                            data-testid="menu-insert-table-rows"
                            value={rows}
                            onChange={(e) => setRows(Number(e.target.value))}
                            min="1"
                            className="ml-2 p-1 border rounded-sm"
                          />
                        </div>
                        <div className="mb-2">
                          <label htmlFor="cols" className="text-sm">
                            Columns:
                          </label>
                          <input
                            type="number"
                            id="cols"
                            data-testid="menu-insert-table-cols"
                            value={cols}
                            onChange={(e) => setCols(Number(e.target.value))}
                            min="1"
                            className="ml-2 p-1 border rounded-sm"
                          />
                        </div>
                        <MenubarItem
                          data-testid="menu-insert-table-submit"
                          onClick={handleInsertTable}
                          className="text-sm p-1 hover:bg-muted"
                        >
                          Insert Table ({rows} X {cols})
                        </MenubarItem>
                      </div>
                    </MenubarSubContent>
                  </MenubarSub>
                </MenubarContent>
              </MenubarMenu>
              {/* Format Menu */}
              <MenubarMenu>
                <MenubarTrigger data-testid="menu-format" className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Format
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarSub>
                    <MenubarSubTrigger data-testid="menu-format-text">
                      <TextIcon className="size-4 mr-2" />
                      Text
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarItem
                        data-testid="menu-format-bold"
                        onClick={() =>
                          editor?.chain().focus().toggleBold().run()
                        }
                      >
                        <BoldIcon className="size-4 mr-2" />
                        Bold <MenubarShortcut>⌘B</MenubarShortcut>
                      </MenubarItem>
                      <MenubarItem
                        data-testid="menu-format-italic"
                        onClick={() =>
                          editor?.chain().focus().toggleItalic().run()
                        }
                      >
                        <ItalicIcon className="size-4 mr-2" />
                        Italic <MenubarShortcut>⌘I</MenubarShortcut>
                      </MenubarItem>
                      <MenubarItem
                        data-testid="menu-format-underline"
                        onClick={() =>
                          editor?.chain().focus().toggleUnderline().run()
                        }
                      >
                        <UnderlineIcon className="size-4 mr-2" />
                        Underline <MenubarShortcut>⌘U</MenubarShortcut>
                      </MenubarItem>
                      <MenubarItem
                        data-testid="menu-format-strikethrough"
                        onClick={() =>
                          editor?.chain().focus().toggleStrike().run()
                        }
                      >
                        <StrikethroughIcon className="size-4 mr-2" />
                        Strikethrough
                      </MenubarItem>
                    </MenubarSubContent>
                  </MenubarSub>
                  <MenubarItem
                    data-testid="menu-format-clear"
                    onClick={() =>
                      editor?.chain().focus().unsetAllMarks().run()
                    }
                  >
                    <RemoveFormattingIcon className="size-4 mr-2" />
                    Clear formatting
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Translate Menu */}
              <MenubarMenu>
                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Translate
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>
                    <Link href="/translate/assames/">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">অ</span>
                        Assamese
                      </div>
                    </Link>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Switch Format Menu */}
              <MenubarMenu>
                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Switch Format
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>
                    <FileJsonIcon className="size-4 mr-2" />
                    Switch Format
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              {/* Full Screen Menu */}
              <MenubarMenu>
                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                  Full Screen
                </MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={toggleFullScreen}>
                    <FileUpIcon className="size-4 mr-2" />
                    Toggle Full Screen
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </div>
        </div>
      </div>
      {/* Quick Export Buttons for LLM Agent Testing */}
      <div className="flex items-center gap-2">
        <button
          data-testid="shortcut-export-docx"
          onClick={onSaveDocx}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          title="Export to Word (.docx)"
        >
          <BsFileWord className="size-4" />
          Export DOCX
        </button>
        <button
          data-testid="shortcut-export-pdf"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          title="Export to PDF"
        >
          <BsFilePdf className="size-4" />
          Export PDF
        </button>
      </div>
    </nav>
  );
};
