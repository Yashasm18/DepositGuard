import { useEffect, useState, type FormEvent } from 'react';
import { api, type PropertySummary } from '../lib/api';
import { formatInr } from '../lib/format';

export function PropertyList({ onOpen }: { onOpen: (id: string) => void }) {
  const [properties, setProperties] = useState<PropertySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.properties().then(setProperties, (e) => setError(e.message));
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const deposit = String(form.get('depositAmount') || '');
    setSaving(true);
    setError(null);
    try {
      const { id } = await api.createProperty({
        name: String(form.get('name')),
        address: String(form.get('address') || '') || null,
        ownerName: String(form.get('ownerName') || '') || null,
        moveInDate: String(form.get('moveInDate') || '') || null,
        depositAmount: deposit ? Number(deposit) : null,
      });
      onOpen(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the home.');
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h2>Your homes</h2>
        <p className="muted">Add the place you rent, then document it room by room.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="dg-grid">
        {properties === null && !error && <div className="card muted">Loading…</div>}
        {properties?.map((p) => (
          <button key={p.id} className="card card-link" onClick={() => onOpen(p.id)}>
            <h3>{p.name}</h3>
            {p.address && <p className="muted">{p.address}</p>}
            <p className="small">
              {p.roomCount} room{p.roomCount === 1 ? '' : 's'}
              {p.depositAmount != null ? ` · Deposit ${formatInr(p.depositAmount)}` : ''}
              {p.moveInDate ? ` · Moved in ${p.moveInDate}` : ''}
            </p>
          </button>
        ))}
      </div>

      <form className="card form" onSubmit={create}>
        <h3>Add a home</h3>
        <label>
          Name
          <input name="name" required maxLength={120} placeholder="e.g. 2BHK, Koramangala" />
        </label>
        <label>
          Address
          <input name="address" maxLength={300} placeholder="Flat, building, area" />
        </label>
        <div className="row">
          <label>
            Owner / landlord name
            <input name="ownerName" maxLength={120} placeholder="Optional" />
          </label>
          <label>
            Security deposit (₹)
            <input name="depositAmount" type="number" min={0} step={500} placeholder="e.g. 50000" />
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
