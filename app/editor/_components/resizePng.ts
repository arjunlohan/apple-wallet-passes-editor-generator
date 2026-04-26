/**
 * Browser-side PNG resizer. The editor calls this when a user uploads a
 * PNG whose dimensions don't match the slot's required size (e.g., they
 * dropped a 50×50 logo that needs to be 29×29 at @1x). Instead of
 * rejecting the file, we draw it to an off-screen canvas and re-encode
 * as PNG at the target size — "work with what the user gave us".
 *
 * Returns the resized bytes + a flag so the UI can show a non-blocking
 * hint ("resized from 50×50 to 29×29"). Keeps the file a PNG (canvas
 * toBlob preserves the lossless format). Never runs server-side.
 */
export interface ResizeResult {
  bytes: Uint8Array;
  resized: boolean;
  from?: { width: number; height: number };
  to: { width: number; height: number };
}

export async function resizePngToExact(
  sourceBytes: Uint8Array,
  target: { width: number; height: number },
): Promise<ResizeResult> {
  const { width: srcWidth, height: srcHeight } = await imageSize(sourceBytes);
  if (srcWidth === target.width && srcHeight === target.height) {
    return { bytes: sourceBytes, resized: false, to: target };
  }
  const encoded = await drawToCanvas(sourceBytes, target.width, target.height);
  return {
    bytes: encoded,
    resized: true,
    from: { width: srcWidth, height: srcHeight },
    to: target,
  };
}

/**
 * `max` rules (logo, strip, footer) — keep the aspect ratio and only
 * scale down if the image is larger than allowed. Pass-through when
 * the image already fits.
 */
export async function resizePngToFitMax(
  sourceBytes: Uint8Array,
  bounds: { maxWidth: number; maxHeight: number },
): Promise<ResizeResult> {
  const { width: srcWidth, height: srcHeight } = await imageSize(sourceBytes);
  if (srcWidth <= bounds.maxWidth && srcHeight <= bounds.maxHeight) {
    return {
      bytes: sourceBytes,
      resized: false,
      to: { width: srcWidth, height: srcHeight },
    };
  }
  const ratio = Math.min(bounds.maxWidth / srcWidth, bounds.maxHeight / srcHeight);
  const targetW = Math.max(1, Math.round(srcWidth * ratio));
  const targetH = Math.max(1, Math.round(srcHeight * ratio));
  const encoded = await drawToCanvas(sourceBytes, targetW, targetH);
  return {
    bytes: encoded,
    resized: true,
    from: { width: srcWidth, height: srcHeight },
    to: { width: targetW, height: targetH },
  };
}

async function imageSize(
  bytes: Uint8Array,
): Promise<{ width: number; height: number }> {
  const blob = new Blob([bytes as BlobPart], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("failed to decode PNG"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function drawToCanvas(
  sourceBytes: Uint8Array,
  targetW: number,
  targetH: number,
): Promise<Uint8Array> {
  const blob = new Blob([sourceBytes as BlobPart], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const out = await canvasToPngBytes(canvas);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to decode PNG"));
    img.src = url;
  });
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("canvas toBlob produced null"));
        blob
          .arrayBuffer()
          .then((buf) => resolve(new Uint8Array(buf)))
          .catch(reject);
      },
      "image/png",
    );
  });
}
