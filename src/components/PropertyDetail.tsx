import { useEffect, useState, type FormEvent } from 'react';
import { client, type Property, type Room } from '../lib/client';
import { RoomCard } from './RoomCard';

const SUGGESTED_ROOMS = ['Living room', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony'];

export function PropertyDetail({ propertyId, onBack }: { propertyId: string; onBack: () => void }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.models.Property.get({ id: propertyId }).then(({ data }) => setProperty(data));
    const sub = client.models.Room.observeQuery({ filter: { propertyId: { eq: propertyId } } }).subscribe({
      next: ({ items }) => setRooms([...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))),
      error: (e) => setError(String(e?.message ?? e)),
    });
    return () => sub.unsubscribe();
  }, [propertyId]);

  async function addRoom(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { errors } = await client.models.Room.create({ propertyId, name: trimmed, comparisonStatus: 'NOT_STARTED' });
    if (errors?.length) setError(errors[0].message);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('room') as HTMLInputElement;
    addRoom(input.value);
    input.value = '';
  }

  const existing = new Set(rooms.map((r) => r.name.toLowerCase()));

  return (
    <div className="stack">
      <button className="btn btn-ghost back" onClick={onBack}>
        ← All homes
      </button>
      <div>
        <h2>{property?.name ?? 'Loading…'}</h2>
        {property && (
          <p className="muted">
            {[property.address, property.ownerName && `Owner: ${property.ownerName}`, property.moveInDate && `Moved in ${property.moveInDate}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card add-room" onSubmit={onSubmit}>
        <input name="room" placeholder="Add a room, e.g. Master bedroom" />
        <button className="btn btn-primary">Add room</button>
        <div className="chips">
          {SUGGESTED_ROOMS.filter((r) => !existing.has(r.toLowerCase())).map((r) => (
            <button type="button" key={r} className="chip" onClick={() => addRoom(r)}>
              + {r}
            </button>
          ))}
        </div>
      </form>

      {rooms.length === 0 && <p className="muted">No rooms yet. Add the rooms you want to document.</p>}
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
