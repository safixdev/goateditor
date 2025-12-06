# @greengoat/editor

A rich-text editor built with TipTap, Radix UI, and Tailwind CSS.

## Installation

```bash
npm install @greengoat/editor
```

## Usage

```tsx
import GoatEditor, { exportToDocx, useEditorStore } from "@greengoat/editor";
import "@greengoat/editor/styles.css";

function App() {
  const handleChange = (html: string, json: object) => {
    console.log("Content changed:", html);
  };

  const handleExport = () => {
    const { editor } = useEditorStore.getState();
    exportToDocx(editor);
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
      <button onClick={handleExport}>Export to DOCX</button>
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

## Exports

### Components

- `GoatEditor` - Main editor component (also default export)
- `Toolbar` - Standalone toolbar component
- `Ruler` - Standalone ruler component

### Utilities

- `exportToDocx(editor)` - Export editor content to DOCX file
- `exportToPdf()` - Export to PDF (triggers browser print dialog)

### Custom Extensions

- `FontSizeExtension` - Font size control
- `LineHeightExtension` - Line height control
- `TextDirectionExtension` - LTR/RTL text direction control

### Hooks

- `useEditorStore` - Zustand store for accessing the editor instance

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

