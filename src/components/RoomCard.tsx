import { useEffect, useState, type ChangeEvent } from 'react';
import { client, parseReport, type Phase, type Photo, type Room } from '../lib/client';
import { addEvidencePhoto } from '../lib/photos';
import { PhotoThumb } from './PhotoThumb';
import { ComparisonReportView } from './ComparisonReport';

const PHASES: { phase: Phase; title: string; hint: string }[] = [
  { phase: 'MOVE_IN', title: 'Move-in', hint: 'Take these on the day you move in.' },
  { phase: 'MOVE_OUT', title: 'Move-out', hint: 'Stand in the same spots when you leave.' },
];

export function RoomCard({ room: initialRoom }: { room: Room }) {
  const [room, setRoom] = useState(initialRoom);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState<Phase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setRoom(initialRoom), [initialRoom]);

  useEffect(() => {
    const sub = client.models.Photo.observeQuery({ filter: { roomId: { eq: room.id } } }).subscribe({
      next: ({ items }) => setPhotos([...items].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))),
      error: (e) => setError(String(e?.message ?? e)),
    });
    return () => sub.unsubscribe();
  }, [room.id]);

  // The comparison runs in the background; poll until it finishes.
  useEffect(() => {
    if (room.comparisonStatus !== 'PROCESSING') return;
    const timer = setInterval(async () => {
      const { data } = await client.models.Room.get({ id: room.id });
      if (data && data.comparisonStatus !== 'PROCESSING') setRoom(data);
    }, 3000);
    return () => clearInterval(timer);
  }, [room.id, room.comparisonStatus]);

  async function onFiles(phase: Phase, e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(phase);
    setError(null);
    try {
      for (const file of files) {
        await addEvidencePhoto(room.id, phase, file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(null);
    }
  }

  async function compare() {
    setError(null);
    setRoom({ ...room, comparisonStatus: 'PROCESSING', comparisonError: null });
    const { errors } = await client.mutations.compareRoom({ roomId: room.id });
    if (errors?.length) {
      setError(errors[0].message);
      setRoom({ ...room, comparisonStatus: 'FAILED' });
    }
  }

  const byPhase = (phase: Phase) => photos.filter((p) => p.phase === phase);
  const canCompare = byPhase('MOVE_IN').length > 0 && byPhase('MOVE_OUT').length > 0;
  const processing = room.comparisonStatus === 'PROCESSING';
  const report = room.comparisonStatus === 'DONE' ? parseReport(room.comparison) : null;

  return (
    <section className="card room">
      <div className="room-head">
        <h3>{room.name}</h3>
        <button className="btn btn-primary" disabled={!canCompare || processing} onClick={compare}>
          {processing ? 'Comparing…' : report ? 'Compare again' : 'Compare before / after'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {room.comparisonStatus === 'FAILED' && room.comparisonError && (
        <div className="alert alert-error">{room.comparisonError}</div>
      )}

      <div className="phases">
        {PHASES.map(({ phase, title, hint }) => {
          const list = byPhase(phase);
          return (
            <div key={phase} className="phase">
              <div className="phase-head">
                <div>
                  <h4>
                    {title} <span className="count">{list.length}</span>
                  </h4>
                  <p className="small muted">{hint}</p>
                </div>
                <label className={`btn btn-secondary ${uploading ? 'disabled' : ''}`}>
                  {uploading === phase ? 'Uploading…' : '+ Add photos'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    hidden
                    disabled={!!uploading}
                    onChange={(e) => onFiles(phase, e)}
                  />
                </label>
              </div>
              <div className="thumbs">
                {list.length === 0 && <div className="thumb-empty">No photos yet</div>}
                {list.map((p, i) => (
                  <PhotoThumb key={p.id} photo={p} label={`${title} ${i + 1}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {processing && (
        <div className="processing">
          <span className="spinner" /> Checking photo fingerprints and comparing with Claude on Amazon Bedrock…
        </div>
      )}
      {report && <ComparisonReportView report={report} comparedAt={room.comparedAt} photos={photos} />}
    </section>
  );
}
