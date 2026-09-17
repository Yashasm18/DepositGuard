import { useEffect, useState } from 'react';
import { api, type ShareLink } from '../lib/api';
import { formatDate } from '../lib/format';

/** Lets the tenant send a read-only report link to the owner, and revoke it. */
export function SharePanel({ propertyId }: { propertyId: string }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.shares(propertyId).then(setLinks, () => {});
  }, [propertyId]);

  async function create() {
    setError(null);
    try {
      const link = await api.createShare(propertyId);
      setFresh(`${window.location.origin}/#/share/${link.token}`);
      setCopied(false);
      setLinks(await api.shares(propertyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the link.');
    }
  }

  async function revoke(id: string) {
    await api.revokeShare(id);
    setFresh(null);
    setLinks(await api.shares(propertyId));
  }

  async function copy() {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh);
    setCopied(true);
  }

  const active = links.filter((l) => !l.revoked && l.expiresAt * 1000 > Date.now());

  return (
    <section className="card share">
      <div className="share-head">
        <div>
          <h3>Share with your owner</h3>
          <p className="small muted">
            The owner can view the reports and agree or dispute each finding. They can't change any evidence.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={create}>
          Create share link
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {fresh && (
        <div className="share-link">
          <input readOnly value={fresh} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn btn-primary" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <p className="small muted full">Copy it now. For safety, the full link isn't shown again.</p>
        </div>
      )}
      {active.length > 0 && (
        <ul className="share-list small">
          {active.map((l) => (
            <li key={l.id}>
              <span>Link created {new Date(l.createdAt).toLocaleDateString('en-IN')}, valid until {formatDate(l.expiresAt)}</span>
              <button className="link-btn" onClick={() => revoke(l.id)}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
