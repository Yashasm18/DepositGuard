import { getUrl } from 'aws-amplify/storage';
import { client, type Photo, type Room } from './client';

/**
 * Optional local comparison service (local-ai/server.py) for accounts
 * without Amazon Bedrock access. Enabled by setting VITE_LOCAL_AI_URL.
 */
export const LOCAL_AI_URL: string | undefined = import.meta.env.VITE_LOCAL_AI_URL;

export async function compareWithLocalAi(room: Room, photos: Photo[]): Promise<void> {
  await client.models.Room.update({ id: room.id, comparisonStatus: 'PROCESSING', comparisonError: null });
  try {
    const withUrls = await Promise.all(
      photos.map(async (p) => ({
        photoId: p.id,
        phase: p.phase,
        sha256: p.sha256,
        capturedAt: p.capturedAt,
        url: (await getUrl({ path: p.path, options: { expiresIn: 900 } })).url.toString(),
      })),
    );
    const res = await fetch(`${LOCAL_AI_URL}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: room.name, photos: withUrls }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? 'The local AI failed.');
    await client.models.Room.update({
      id: room.id,
      comparisonStatus: 'DONE',
      comparedAt: new Date().toISOString(),
      comparisonError: null,
      comparison: JSON.stringify(body),
    });
  } catch (err) {
    const message =
      err instanceof TypeError
        ? 'Could not reach the local AI service. Is local-ai/server.py running?'
        : err instanceof Error
          ? err.message
          : 'Comparison failed.';
    await client.models.Room.update({ id: room.id, comparisonStatus: 'FAILED', comparisonError: message });
    throw new Error(message);
  }
}
