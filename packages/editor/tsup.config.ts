import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  // Enable splitting for code-splitting with dynamic imports (lazy loading)
  // This creates separate chunks for dynamically imported modules like pdf/zetajs-embedded
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
  minify: false,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  // Configure loaders for different file types
  loader: {
    ".xml": "text",
    ".ttf": "dataurl",
  },
  // Include font files as assets
  publicDir: false,
});

