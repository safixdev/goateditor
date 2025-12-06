# @greengoat/editor

A rich-text editor built with TipTap, Radix UI, and Tailwind CSS.

## Installation

```bash
npm install @greengoat/editor
```

## Usage

```tsx
import GoatEditor, { exportToDocx, exportToPdf, useEditorStore } from "@greengoat/editor";
import "@greengoat/editor/styles.css";

function App() {
  const handleChange = (html: string, json: object) => {
    console.log("Content changed:", html);
  };

  const handleExportDocx = () => {
    const { editor } = useEditorStore.getState();
    exportToDocx(editor);
  };

  const handleExportPdf = async () => {
    const { editor } = useEditorStore.getState();
    await exportToPdf(editor, "document.pdf");
  };

  return (
    <div>
      <GoatEditor
        options={{
          initialContent: "<p>Hello World</p>",
          showToolbar: true,
          showRuler: true,
          defaultDirection: "ltr",
          onChange: handleChange,
        }}
      />
      <button onClick={handleExportDocx}>Export to DOCX</button>
      <button onClick={handleExportPdf}>Export to PDF</button>
    </div>
  );
}
```

## Props

### `GoatEditorOptions`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialContent` | `string` | `""` | Initial HTML content to load into the editor |
| `showToolbar` | `boolean` | `true` | Show/hide the toolbar |
| `showRuler` | `boolean` | `true` | Show/hide the ruler |
| `defaultDirection` | `"ltr" \| "rtl"` | `"ltr"` | Default text direction |
| `placeholder` | `string` | - | Editor placeholder text |
| `className` | `string` | - | Custom CSS class for the editor container |
| `toolbarClassName` | `string` | - | Custom CSS class for the toolbar |
| `onChange` | `(html: string, json: object) => void` | - | Callback when content changes |
| `onReady` | `(editor: Editor) => void` | - | Callback when editor is ready |
| `onDestroy` | `() => void` | - | Callback when editor is destroyed |
| `extensions` | `any[]` | `[]` | Custom TipTap extensions to add |
| `editable` | `boolean` | `true` | Whether the editor is editable |
| `autoFocus` | `boolean` | `false` | Auto-focus the editor on mount |
| `dimensions` | `{ width?: number; height?: number }` | `{ width: 816, height: 1054 }` | Document dimensions in pixels |
| `toolbarDirection` | `"ltr" \| "rtl"` | - | Text direction for the toolbar layout |

## Accessing the Editor Instance

The editor uses a [Zustand](https://github.com/pmndrs/zustand) store to expose the TipTap editor instance. This allows you to call the full TipTap API from anywhere in your application.

### Inside React Components (Hook)

```tsx
import { useEditorStore } from "@greengoat/editor";

function MyComponent() {
  const { editor } = useEditorStore();

  const handleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  return <button onClick={handleBold}>Toggle Bold</button>;
}
```

### Outside React Components (Imperative)

Use `getState()` for synchronous access outside of React's render cycle:

```tsx
import { useEditorStore } from "@greengoat/editor";

// In an event handler, utility function, or anywhere outside React
function insertTextAtCursor(text: string) {
  const { editor } = useEditorStore.getState();
  editor?.chain().focus().insertContent(text).run();
}

// Example: Export handler
function handleExport() {
  const { editor } = useEditorStore.getState();
  if (editor) {
    const html = editor.getHTML();
    const json = editor.getJSON();
    // ... do something with content
  }
}
```

### Common Editor Operations

```tsx
const { editor } = useEditorStore.getState();

// Content
editor?.commands.setContent("<p>New content</p>");  // Set HTML
editor?.commands.setContent(jsonDoc);               // Set JSON
editor?.commands.clearContent();                    // Clear
const html = editor?.getHTML();                     // Get HTML
const json = editor?.getJSON();                     // Get JSON

// Formatting
editor?.chain().focus().toggleBold().run();
editor?.chain().focus().toggleItalic().run();
editor?.chain().focus().setTextAlign("center").run();

// Selection
editor?.commands.selectAll();
editor?.commands.focus("end");

// State
const isActive = editor?.isActive("bold");
const canUndo = editor?.can().undo();
```

## Getting the TipTap JSON Output

There are two ways to get the editor's JSON output:

### 1. Via the `onChange` callback

The `onChange` callback receives both HTML and JSON representations of the content:

```tsx
<GoatEditor
  options={{
    onChange: (html, json) => {
      console.log("HTML:", html);
      console.log("JSON:", json);
      // json is the TipTap ProseMirror document structure
    },
  }}
/>
```

### 2. Via the editor store

You can access the editor instance directly using `useEditorStore`:

```tsx
import { useEditorStore } from "@greengoat/editor";

function MyComponent() {
  const { editor } = useEditorStore();

  const getJson = () => {
    if (editor) {
      const json = editor.getJSON();
      console.log(json);
    }
  };

  return <button onClick={getJson}>Get JSON</button>;
}
```

Or from outside a React component:

```tsx
import { useEditorStore } from "@greengoat/editor";

const { editor } = useEditorStore.getState();
const json = editor?.getJSON();
```

## Loading JSON Content

You can load JSON content into the editor using `editor.commands.setContent()`. This method accepts both HTML strings and TipTap JSON objects.

### Loading JSON via the editor store

```tsx
import { useEditorStore } from "@greengoat/editor";

function LoadJsonButton() {
  const { editor } = useEditorStore();

  const loadJson = () => {
    if (!editor) return;

    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello from JSON!" }],
        },
      ],
    };

    editor.commands.setContent(json);
  };

  return <button onClick={loadJson}>Load JSON</button>;
}
```

### Loading JSON from outside React

```tsx
import { useEditorStore } from "@greengoat/editor";

function loadJsonToEditor(json: object) {
  const { editor } = useEditorStore.getState();
  if (editor) {
    editor.commands.setContent(json);
  }
}
```

### Options

The `setContent` method accepts an optional second parameter for options:

```tsx
editor.commands.setContent(json, {
  emitUpdate: true, // Trigger the onChange callback (default: false)
});
```

## Exports

### Components

- `GoatEditor` - Main editor component (also default export)
- `Toolbar` - Standalone toolbar component
- `Ruler` - Standalone ruler component

### Utilities

- `exportToDocx(editor, filename?)` - Export editor content to DOCX file
- `generateDocxBlob(editor)` - Generate DOCX blob without downloading
- `exportToPdf(editor, filename?, onProgress?)` - Export editor content to PDF file
- `generatePdfBlob(editor, onProgress?)` - Generate PDF blob without downloading
- `preInitializePdfConverter()` - Pre-initialize LibreOffice WASM for faster first export
- `isPdfConverterReady()` - Check if the PDF converter is initialized

### Custom Extensions

- `FontSizeExtension` - Font size control
- `LineHeightExtension` - Line height control
- `TextDirectionExtension` - LTR/RTL text direction control

### Hooks

- `useEditorStore` - Zustand store for accessing the TipTap editor instance. Use the hook inside React components, or `useEditorStore.getState()` for imperative access outside React.

### Types

- `ExportPdfStatus` - Status union type: `'idle' | 'initializing' | 'generating-docx' | 'converting-to-pdf' | 'complete' | 'error'`
- `ExportPdfProgress` - Progress callback object type with `status`, `message`, and optional `error`

## PDF Export Configuration

PDF export uses LibreOffice WebAssembly (LOWA) via [zetajs](https://github.com/nicognaW/nicognaw-zetajs) to convert documents to PDF client-side. This requires specific server configuration for `SharedArrayBuffer` support.

### Required HTTP Headers

Your server must send these headers on all pages that use PDF export:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Framework Configuration Examples

#### Next.js

Add to `next.config.js` or `next.config.ts`:

```ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### Vite

Add to `vite.config.ts`:

```ts
export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
```

#### Express

```js
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});
```

#### Nginx

```nginx
add_header Cross-Origin-Opener-Policy same-origin;
add_header Cross-Origin-Embedder-Policy require-corp;
```

### PDF Export Usage

```tsx
import { exportToPdf, generatePdfBlob, preInitializePdfConverter } from "@greengoat/editor";

// Export with automatic download
const { editor } = useEditorStore.getState();
await exportToPdf(editor, "document.pdf");

// Or get the blob for custom handling
const pdfBlob = await generatePdfBlob(editor);

// Optional: Pre-initialize for faster first export
// Call this early (e.g., on page load) to warm up the converter
await preInitializePdfConverter();

// Track progress during export
await exportToPdf(editor, "document.pdf", (progress) => {
  console.log(progress.status); // 'initializing' | 'generating-docx' | 'converting-to-pdf' | 'complete' | 'error'
  console.log(progress.message);
});
```

### Performance Notes

- The LibreOffice WASM files (~50MB) are loaded from the ZetaOffice CDN on first use
- The converter code (~60KB) is lazy-loaded only when PDF export is first called
- First export may take 10-30 seconds (WASM download + initialization)
- Subsequent exports are much faster (2-5 seconds)
- Consider calling `preInitializePdfConverter()` during idle time to improve UX

## Styling

The package exports a CSS file that must be imported for the editor to render correctly:

```tsx
import "@greengoat/editor/styles.css";
```

### Theming

The editor uses CSS variables for theming. You can override these variables in your CSS:

```css
:root {
  --goat-editor-background: 0 0% 100%;
  --goat-editor-foreground: 0 0% 3.9%;
  --goat-editor-primary: 0 0% 9%;
  --goat-editor-primary-foreground: 0 0% 98%;
  /* ... more variables */
}
```

## License

MIT

