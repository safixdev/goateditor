# Goat Editor

A Next.js-based document editor using TipTap.

## Project Structure

This is a monorepo containing:

- **Root (`/`)** - Next.js application for local development and testing
- **`packages/editor`** - Standalone `@goat/editor` npm package

## Development

### Initial Setup

This project uses git submodules for reference (located in `submodules/`):

- **`docx`** - DOCX generation library source
- **`tiptap`** - TipTap editor source and demos (`submodules/tiptap/demos`)
- **`BlockNote`** - Reference for DOCX export architecture (`submodules/BlockNote/packages/xl-docx-exporter/`)

To set them up:

```bash
git submodule update --init --recursive
```

Then install all dependencies:

```bash
npm install
```

### Running the Next.js App

```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) to view the editor.

### Developing the @goat/editor Package

The editor package is located in `packages/editor/`.

**Build the package:**

```bash
npm run build:editor
```

**Watch mode (auto-rebuild on changes):**

```bash
npm run dev:editor
```

**Build from package directory:**

```bash
cd packages/editor
npm run build
```

### Testing Package Changes

After building the editor package, the Next.js app will automatically use the updated local version. Simply rebuild the package and refresh your browser.

## Publishing @goat/editor

### Pre-Publish Checklist

1. Update the version in `packages/editor/package.json`
2. Ensure the build is clean:
   ```bash
   npm run build:editor
   ```
3. Review what will be published:
   ```bash
   cd packages/editor && npm pack --dry-run
   ```

### Publishing

```bash
cd packages/editor

# Publish (first time or new version)
npm publish --access public

# Or bump version and publish
npm version patch && npm publish --access public
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build the Next.js app |
| `npm run build:editor` | Build the @goat/editor package |
| `npm run dev:editor` | Watch mode for @goat/editor |
| `npm run lint` | Run ESLint |
