import { MAX_UPLOAD_BYTES } from '@/config/limits';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Returns a specific, human error message, or null when the file is acceptable. */
export function validateUpload(file: File, opts: { allowPdf: boolean }): string | null {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isPdf = file.type === 'application/pdf';
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    return 'HEIC photos are not supported yet. Set your camera to "Most compatible" (JPEG) or take a screenshot.';
  }
  if (!isImage && !(opts.allowPdf && isPdf)) {
    return opts.allowPdf ? 'Choose a photo (JPG, PNG or WebP) or a PDF.' : 'Choose a photo (JPG, PNG or WebP).';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB.`;
  }
  if (file.size === 0) return 'That file is empty.';
  return null;
}

/**
 * Re-encode an image through a canvas: resizes to `maxPx` on the long edge, applies EXIF
 * orientation, and drops all metadata (including GPS location).
 */
export async function reencodeImage(file: Blob, maxPx: number, type: 'image/jpeg' | 'image/webp', quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('Could not encode image');
  if (blob.type !== type) throw new Error(`This browser cannot save ${type}`);
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
