import { parseDimension, extractStyleDimensions } from "./style-utils";

/**
 * Determine image type from source URL or data URI
 */
export const getImageType = (src: string): "png" | "jpg" | "gif" | "bmp" => {
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

/**
 * Load image via canvas as fallback for CORS-restricted images
 */
export const loadImageViaCanvas = (
  src: string
): Promise<ArrayBuffer | null> => {
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
            blob
              .arrayBuffer()
              .then(resolve)
              .catch(() => resolve(null));
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

/**
 * Fetch image data as ArrayBuffer from various sources
 * Handles data URIs, blob URLs, and regular URLs
 */
export const fetchImageAsArrayBuffer = async (
  src: string
): Promise<ArrayBuffer | null> => {
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

/**
 * Get image dimensions using createImageBitmap (more efficient)
 * Falls back to DOM Image element if not supported
 */
export const getImageDimensionsFromBlob = async (
  blob: Blob
): Promise<{ width: number; height: number }> => {
  // Try createImageBitmap first (more efficient, no DOM rendering needed)
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bmp = await createImageBitmap(blob);
      const { width, height } = bmp;
      bmp.close(); // Free memory
      return { width, height };
    } catch {
      // Fall through to DOM fallback
    }
  }

  // Fallback to DOM Image element
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = document.createElement("img");
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
};

/**
 * Get actual image dimensions by loading the image
 */
export const getActualImageDimensions = (
  src: string
): Promise<{ naturalWidth: number; naturalHeight: number } | null> => {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

/**
 * Calculate final image dimensions with aspect ratio preservation
 * and max width constraint
 */
export const calculateFinalImageDimensions = async (
  attrs: Record<string, unknown>,
  src: string,
  knownDimensions?: { width: number; height: number }
): Promise<{ width: number; height: number }> => {
  const maxWidth = 600;

  // First try to get dimensions from attrs - check multiple possible attribute names
  let width: number | null = null;
  let height: number | null = null;

  // Check containerStyle attribute (used by tiptap-extension-resize-image)
  if (attrs?.containerStyle && typeof attrs.containerStyle === "string") {
    const containerStyleDims = extractStyleDimensions(attrs.containerStyle);
    if (containerStyleDims.width) width = containerStyleDims.width;
    if (containerStyleDims.height) height = containerStyleDims.height;
  }

  // Check style attribute
  if (attrs?.style && typeof attrs.style === "string") {
    const styleDims = extractStyleDimensions(attrs.style);
    if (styleDims.width) width = styleDims.width;
    if (styleDims.height) height = styleDims.height;
  }

  // Check direct width/height attributes
  const attrWidth = parseDimension(attrs?.width);
  const attrHeight = parseDimension(attrs?.height);
  if (attrWidth) width = attrWidth;
  if (attrHeight) height = attrHeight;

  // Check data-* attributes (common for resizable images)
  const dataWidth = parseDimension(attrs?.["data-width"]);
  const dataHeight = parseDimension(attrs?.["data-height"]);
  if (dataWidth) width = dataWidth;
  if (dataHeight) height = dataHeight;

  // Check resized* attributes
  const resizedWidth = parseDimension(attrs?.resizedWidth);
  const resizedHeight = parseDimension(attrs?.resizedHeight);
  if (resizedWidth) width = resizedWidth;
  if (resizedHeight) height = resizedHeight;

  // Check previewWidth (BlockNote style)
  const previewWidth = parseDimension(attrs?.previewWidth);
  if (previewWidth) width = previewWidth;

  // If we have both dimensions from attrs, use them
  if (width && height) {
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }
    return { width: Math.round(width), height: Math.round(height) };
  }

  // Use known dimensions if provided
  let naturalWidth = knownDimensions?.width;
  let naturalHeight = knownDimensions?.height;

  // If we don't have natural dimensions, try to get them
  if (!naturalWidth || !naturalHeight) {
    const actualDims = await getActualImageDimensions(src);
    if (actualDims) {
      naturalWidth = actualDims.naturalWidth;
      naturalHeight = actualDims.naturalHeight;
    }
  }

  if (naturalWidth && naturalHeight) {
    const aspectRatio = naturalHeight / naturalWidth;

    if (width && !height) {
      // We have width, calculate height preserving aspect ratio
      height = Math.round(width * aspectRatio);
    } else if (height && !width) {
      // We have height, calculate width preserving aspect ratio
      width = Math.round(height / aspectRatio);
    } else {
      // No dimensions provided - use natural dimensions but cap at maxWidth
      width = naturalWidth;
      height = naturalHeight;
    }

    // Apply max width constraint while preserving aspect ratio
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  // Fallback if we can't load the image
  if (!width) width = 300;
  if (!height) height = 300;

  if (width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }

  return { width: Math.round(width), height: Math.round(height) };
};
