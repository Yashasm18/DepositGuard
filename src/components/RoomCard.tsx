import { useState, type ChangeEvent } from 'react';
import { api, type Phase, type Room } from '../lib/api';
import { addEvidencePhoto } from '../lib/photos';
import { PhotoThumb } from './PhotoThumb';
import { ComparisonReportView } from './ComparisonReport';

const PHASES: { phase: Phase; title: string; hint: string }[] = [
  { phase: 'MOVE_IN', title: 'Move-in', hint: 'Take these on the day you move in.' },
  { phase: 'MOVE_OUT', title: 'Move-out', hint: 'Stand in the same spots when you leave.' },
];

const TENANT = { kind: 'tenant' } as const;

export function RoomCard({ room, onChanged }: { room: Room; onChanged: () => Promise<unknown> }) {
  const [uploading, setUploading] = useState<Phase | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      await onChanged();
    }
  }

  async function compare() {
    setError(null);
    try {
      await api.compare(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the comparison.');
    }
    await onChanged();
  }

  async function removePhoto(photoId: string) {
    if (!window.confirm('Delete this photo? This removes it from the evidence.')) return;
    await api.deletePhoto(photoId).catch((err) => setError(err.message));
    await onChanged();
  }

  async function removeRoom() {
    if (!window.confirm(`Delete ${room.name} and all its photos?`)) return;
    await api.deleteRoom(room.id).catch((err) => setError(err.message));
    await onChanged();
  }

  const byPhase = (phase: Phase) => room.photos.filter((p) => p.phase === phase);
  const moveIn = byPhase('MOVE_IN').length;
  const moveOut = byPhase('MOVE_OUT').length;
  const canCompare = moveIn > 0 && moveOut > 0;
  const processing = room.status === 'PROCESSING';
  const step = room.report ? 3 : moveIn === 0 ? 0 : moveOut === 0 ? 1 : 2;

  return (
    <section className="card room">
      <div className="room-head">
        <div>
          <h3>{room.name}</h3>
          <ol className="progress" aria-label="Progress">
            {['Move-in photos', 'Move-out photos', 'Report'].map((label, i) => (
              <li key={label} className={i < step ? 'done' : i === step ? 'current' : ''}>
                {label}
              </li>
            ))}
          </ol>
        </div>
        <div className="room-actions">
          <button className="btn btn-primary" disabled={!canCompare || processing} onClick={compare}>
            {processing ? 'Comparing…' : room.report ? 'Compare again' : 'Compare before / after'}
          </button>
          <button className="btn btn-ghost btn-icon" title="Delete room" aria-label="Delete room" onClick={removeRoom}>
            ✕
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {room.status === 'FAILED' && room.error && <div className="alert alert-error">{room.error}</div>}

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
                <label className={`btn btn-secondary ${uploading || processing ? 'disabled' : ''}`}>
                  {uploading === phase ? 'Uploading…' : '+ Add photos'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    disabled={!!uploading || processing}
                    onChange={(e) => onFiles(phase, e)}
                  />
                </label>
              </div>
              <div className="thumbs">
                {list.length === 0 && <div className="thumb-empty">No photos yet</div>}
                {list.map((p, i) => (
                  <PhotoThumb
                    key={p.id}
                    photo={p}
                    label={`${title} ${i + 1}`}
                    source={TENANT}
                    onDelete={processing ? undefined : () => removePhoto(p.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {processing && (
        <div className="processing">
          <span className="spinner" />
          <div>
            <strong>Reviewing the photos on this computer…</strong>
            <p className="small">
              Checking fingerprints, finding what changed, then asking the local AI (Strands Agents + Ollama) about
              each change. This takes about a minute.
            </p>
          </div>
        </div>
      )}
      {room.report && !processing && (
        <ComparisonReportView
          report={room.report}
          comparedAt={room.comparedAt}
          photos={room.photos}
          responses={room.responses}
          source={TENANT}
        />
      )}
    </section>
  );
}
