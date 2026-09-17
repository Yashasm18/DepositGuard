import { api, type Phase, type Photo } from './api';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.88;

/**
 * Shrinks a camera photo to a sensible size and uploads it. The server
 * fingerprints (SHA-256) the exact bytes it stores and re-checks them
 * before every comparison.
 */
export async function addEvidencePhoto(roomId: string, phase: Phase, file: File): Promise<Photo> {
  const capturedAt = new Date(file.lastModified || Date.now()).toISOString();
  return api.uploadPhoto(roomId, phase, await resizeToJpeg(file), capturedAt);
}

async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo.'))), 'image/jpeg', JPEG_QUALITY),
  );
}
