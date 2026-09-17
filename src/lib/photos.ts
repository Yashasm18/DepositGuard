import { uploadData } from 'aws-amplify/storage';
import { client, type Phase, type Photo } from './client';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Shrinks a camera photo to a sensible size, fingerprints the exact bytes we
 * store, uploads them to the user's private evidence folder and records the
 * photo. The fingerprint is re-checked later by the compare function.
 */
export async function addEvidencePhoto(roomId: string, phase: Phase, file: File, note?: string): Promise<Photo> {
  const capturedAt = new Date(file.lastModified || Date.now()).toISOString();
  const blob = await resizeToJpeg(file);
  const sha256 = await sha256Hex(blob);
  const fileName = `${crypto.randomUUID()}.jpg`;

  const { path } = await uploadData({
    path: ({ identityId }) => `evidence/${identityId}/${roomId}/${phase}/${fileName}`,
    data: blob,
    options: { contentType: 'image/jpeg' },
  }).result;

  const { data, errors } = await client.models.Photo.create({
    roomId,
    phase,
    path,
    sha256,
    capturedAt,
    note: note?.trim() || undefined,
  });
  if (!data) throw new Error(errors?.[0]?.message ?? 'Could not save the photo.');
  return data;
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
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
