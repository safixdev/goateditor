import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Required headers for SharedArrayBuffer (needed for LibreOffice WASM / zetajs)
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
