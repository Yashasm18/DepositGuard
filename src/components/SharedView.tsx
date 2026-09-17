import { useCallback, useEffect, useState } from 'react';
import { api, type Property, type Verdict } from '../lib/api';
import { formatDate, formatInr } from '../lib/format';
import { ComparisonReportView } from './ComparisonReport';

/** Read-only report page for the owner / landlord, opened from a share link. */
export function SharedView({ token }: { token: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const source = { kind: 'share', token } as const;

  const reload = useCallback(
    () => api.shared(token).then(setProperty, () => setError('This link is not valid, has expired, or was revoked.')),
    [token],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  async function respond(roomId: string, findingId: string, verdict: Verdict, comment?: string) {
    await api.respond(token, roomId, findingId, verdict, comment);
    await reload();
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>DepositGuard</span>
        </span>
        <span className="badge badge-info">Owner view</span>
      </header>
      <main className="container">
        {error && <div className="alert alert-error">{error}</div>}
        {!property && !error && <p className="muted">Loading…</p>}
        {property && (
          <div className="stack">
            <div>
              <h2>{property.name}</h2>
              <p className="muted">
                {[
                  property.address,
                  property.depositAmount != null && `Deposit ${formatInr(property.depositAmount)}`,
                  property.expiresAt && `Link valid until ${formatDate(property.expiresAt)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="card intro">
              Your tenant shared these move-in and move-out reports. Review each finding and choose{' '}
              <strong>Agree</strong> or <strong>Dispute</strong>. You can't change the photos or the report.
            </div>
            {property.rooms.filter((r) => r.report).length === 0 && (
              <p className="muted">No reports have been prepared yet.</p>
            )}
            {property.rooms
              .filter((r) => r.report)
              .map((room) => (
                <section key={room.id} className="card room">
                  <h3>{room.name}</h3>
                  <ComparisonReportView
                    report={room.report!}
                    comparedAt={room.comparedAt}
                    photos={room.photos}
                    responses={room.responses}
                    source={source}
                    onRespond={(findingId, verdict, comment) => respond(room.id, findingId, verdict, comment)}
                  />
                </section>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
