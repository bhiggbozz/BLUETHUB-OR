/**
 * Client-side photo compression for the question-scan upload flow.
 *
 * Phone cameras routinely produce 8-20MB photos that Cloudinary's direct
 * upload rejects with a 413 before the scan ever reaches the backend. This
 * downscales the longest edge and re-encodes as JPEG, trying progressively
 * smaller dimension/quality combinations until the result clears the target
 * size — stopping as soon as it does, so text stays as sharp as possible.
 */

const TARGET_BYTES = 4 * 1024 * 1024; // comfortably under Cloudinary's free-tier 10MB cap
const DIMENSION_STEPS = [2000, 1600, 1200]; // longest edge, px — plenty for OCR legibility
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5];

export interface CompressImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

function isHeic(file: File): boolean {
  if (HEIC_TYPES.has(file.type)) return true;
  // iOS Safari/Chrome often hand camera photos over with an empty mime type —
  // fall back to the extension so those still get decoded.
  if (!file.type) return /\.(heic|heif)$/i.test(file.name);
  return false;
}

/** Browser `<canvas>`/`createImageBitmap` can't decode HEIC — this uses
 * heic2any's WASM (libheif) decoder to get a JPEG blob first. iPhones default
 * to HEIC, so without this most iPhone photos would skip compression
 * entirely and could still 413 on upload. */
async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

function drawToCanvas(bitmap: ImageBitmap, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Skips files already under the target size. Falls back to the original
 * file untouched on any failure (e.g. a HEIC the browser's canvas can't
 * decode), so a compression problem never blocks the upload outright.
 */
export async function compressImageForUpload(file: File): Promise<CompressImageResult> {
  const originalSize = file.size;

  if (originalSize <= TARGET_BYTES) {
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }

  try {
    const sourceFile = isHeic(file) ? await convertHeicToJpeg(file) : file;
    const bitmap = await createImageBitmap(sourceFile);
    let best: Blob | null = null;

    for (const dimension of DIMENSION_STEPS) {
      const canvas = drawToCanvas(bitmap, dimension);
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (!blob) continue;
        best = blob;
        if (blob.size <= TARGET_BYTES) break;
      }
      if (best && best.size <= TARGET_BYTES) break;
    }

    bitmap.close();

    // The downscale/re-encode pass found nothing smaller than the source —
    // still worth keeping a HEIC->JPEG conversion, since that alone fixes
    // upload targets that reject the HEIC format outright.
    if (!best || best.size >= sourceFile.size) {
      const fellBackToConverted = sourceFile !== file;
      return {
        file: fellBackToConverted ? sourceFile : file,
        originalSize,
        compressedSize: sourceFile.size,
        wasCompressed: fellBackToConverted,
      };
    }

    const compressedFile = new File([best], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });

    return { file: compressedFile, originalSize, compressedSize: compressedFile.size, wasCompressed: true };
  } catch {
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }
}
