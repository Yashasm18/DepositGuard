import { Suspense, lazy, useEffect, useState } from 'react';
import { api, type User } from './lib/api';
import { PropertyList } from './components/PropertyList';
import { PropertyDetail } from './components/PropertyDetail';
import { SharedView } from './components/SharedView';

// The landing pulls in the animation libraries (motion, gsap, lenis) and the
// hero's WebGL. The app itself needs none of it, so it is split out and only
// fetched when the landing is actually shown.
const Landing = lazy(() =>
  import('./components/Landing').then((m) => ({ default: m.Landing })),
);

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

/**
 * Routes:
 *   #                 the landing page; the front door, for everyone
 *   #/homes           your homes (requires an account)
 *   #/homes/:id       one home (requires an account)
 *   #/share/:token    a read-only report, opened by an owner with no account
 *
 * The landing is a route rather than a signed-out fallback on purpose. Keyed
 * off auth state, anyone with a live session would never see it again; they
 * would open the app and land straight in the upload screens.
 */
export default function App() {
  const hash = useHash();
  const shareToken = hash.match(/^#\/share\/([\w-]+)$/)?.[1];
  const inApp = /^#\/homes(\/|$)/.test(hash);
  const propertyId = hash.match(/^#\/homes\/(\w+)$/)?.[1];
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (shareToken) return;
    api.me().then(setUser, () => setUser(null));
  }, [shareToken]);

  // An app route reached without an account goes back to the front door.
  useEffect(() => {
    if (inApp && user === null) window.location.hash = '';
  }, [inApp, user]);

  if (shareToken) return <SharedView token={shareToken} />;
  if (user === undefined) return <div className="center muted">Loading…</div>;

  if (!inApp) {
    return (
      <Suspense fallback={<div className="center muted">Loading…</div>}>
        <Landing
          user={user}
          onSignedIn={(signedIn) => {
            setUser(signedIn);
            window.location.hash = '#/homes';
          }}
        />
      </Suspense>
    );
  }

  // The redirect above is in flight.
  if (!user) return <div className="center muted">Loading…</div>;

  async function signOut() {
    await api.signOut().catch(() => {});
    window.location.hash = '';
    setUser(null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/homes">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>DepositGuard</span>
        </a>
        <div className="topbar-right">
          <span className="muted hide-sm">{user.email}</span>
          <button className="btn btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="dg-container">
        {propertyId ? (
          <PropertyDetail propertyId={propertyId} />
        ) : (
          <PropertyList onOpen={(id) => (window.location.hash = `#/homes/${id}`)} />
        )}
      </main>
      <footer className="footer muted small">
        Runs on your machine · AI review with Strands Agents · access rules with Cedar
      </footer>
    </div>
  );
}
