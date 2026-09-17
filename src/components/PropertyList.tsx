import { useEffect, useState, type FormEvent } from 'react';
import { client, type Property } from '../lib/client';

export function PropertyList({ onOpen }: { onOpen: (id: string) => void }) {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sub = client.models.Property.observeQuery().subscribe({
      next: ({ items }) => setProperties([...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      error: (e) => setError(String(e?.message ?? e)),
    });
    return () => sub.unsubscribe();
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    const { data, errors } = await client.models.Property.create({
      name: String(form.get('name')),
      address: String(form.get('address') || '') || undefined,
      ownerName: String(form.get('ownerName') || '') || undefined,
      moveInDate: String(form.get('moveInDate') || '') || undefined,
    });
    setSaving(false);
    if (!data) {
      setError(errors?.[0]?.message ?? 'Could not create the property.');
      return;
    }
    onOpen(data.id);
  }

  return (
    <div className="stack">
      <div>
        <h2>Your homes</h2>
        <p className="muted">Add the place you rent, then document it room by room.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid">
        {properties === null && <div className="card muted">Loading…</div>}
        {properties?.map((p) => (
          <button key={p.id} className="card card-link" onClick={() => onOpen(p.id)}>
            <h3>{p.name}</h3>
            {p.address && <p className="muted">{p.address}</p>}
            <p className="small">
              {p.ownerName ? `Owner: ${p.ownerName}` : 'Owner not added'}
              {p.moveInDate ? ` · Moved in ${p.moveInDate}` : ''}
            </p>
          </button>
        ))}
      </div>

      <form className="card form" onSubmit={create}>
        <h3>Add a home</h3>
        <label>
          Name
          <input name="name" required placeholder="e.g. 2BHK, Koramangala" />
        </label>
        <label>
          Address
          <input name="address" placeholder="Flat, building, area" />
        </label>
        <div className="row">
          <label>
            Owner / landlord name
            <input name="ownerName" placeholder="Optional" />
          </label>
          <label>
            Move-in date
            <input name="moveInDate" type="date" />
          </label>
        </div>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add home'}
        </button>
      </form>
    </div>
  );
}
