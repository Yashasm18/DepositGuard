import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type Property } from '../lib/api';
import { formatInr } from '../lib/format';
import { RoomCard } from './RoomCard';
import { SharePanel } from './SharePanel';

const SUGGESTED_ROOMS = ['Living room', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony'];

export function PropertyDetail({ propertyId }: { propertyId: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    return api.property(propertyId).then(setProperty, (e) => setError(e.message));
  }, [propertyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Comparisons run in the background on the server; refresh until they finish.
  const processing = property?.rooms.some((r) => r.status === 'PROCESSING');
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(reload, 3000);
    return () => clearInterval(timer);
  }, [processing, reload]);

  async function addRoom(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await api.createRoom(propertyId, trimmed);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the room.');
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('room') as HTMLInputElement;
    addRoom(input.value);
    input.value = '';
  }

  if (!property) {
    return error ? <div className="alert alert-error">{error}</div> : <p className="muted">Loading…</p>;
  }

  const existing = new Set(property.rooms.map((r) => r.name.toLowerCase()));
  const details = [
    property.address,
    property.ownerName && `Owner: ${property.ownerName}`,
    property.depositAmount != null && `Deposit ${formatInr(property.depositAmount)}`,
    property.moveInDate && `Moved in ${property.moveInDate}`,
  ].filter(Boolean);

  return (
    <div className="stack">
      <a className="btn btn-ghost back" href="#">
        ← All homes
      </a>
      <div className="page-head">
        <div>
          <h2>{property.name}</h2>
          {details.length > 0 && <p className="muted">{details.join(' · ')}</p>}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <SharePanel propertyId={property.id} />

      <form className="card add-room" onSubmit={onSubmit}>
        <input name="room" maxLength={80} placeholder="Add a room, e.g. Master bedroom" aria-label="Room name" />
        <button className="btn btn-primary">Add room</button>
        <div className="chips">
          {SUGGESTED_ROOMS.filter((r) => !existing.has(r.toLowerCase())).map((r) => (
            <button type="button" key={r} className="chip" onClick={() => addRoom(r)}>
              + {r}
            </button>
          ))}
        </div>
      </form>

      {property.rooms.length === 0 && (
        <div className="empty">
          <p>
            <strong>No rooms yet.</strong>
          </p>
          <p className="muted">Add each room you want to document, then photograph it.</p>
        </div>
      )}
      {property.rooms.map((room) => (
        <RoomCard key={room.id} room={room} onChanged={reload} />
      ))}
    </div>
  );
}
