import { useEffect, useState } from 'react';
import { api, type User } from './lib/api';
import { AuthForm } from './components/AuthForm';
import { PropertyList } from './components/PropertyList';
import { PropertyDetail } from './components/PropertyDetail';
import { SharedView } from './components/SharedView';

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const shareToken = hash.match(/^#\/share\/([\w-]+)$/)?.[1];
  const propertyId = hash.match(/^#\/homes\/(\w+)$/)?.[1];
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (shareToken) return;
    api.me().then(setUser, () => setUser(null));
  }, [shareToken]);

  if (shareToken) return <SharedView token={shareToken} />;
  if (user === undefined) return <div className="center muted">Loading…</div>;

  if (!user) {
    return (
      <div className="landing">
        <Hero />
        <div className="landing-auth">
          <AuthForm onSignedIn={setUser} />
        </div>
      </div>
    );
  }

  async function signOut() {
    await api.signOut().catch(() => {});
    window.location.hash = '';
    setUser(null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#">
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
      <main className="container">
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

function Hero() {
  return (
    <section className="hero">
      <div className="brand brand-lg">
        <img src="/favicon.svg" alt="" width={40} height={40} />
        <span>DepositGuard</span>
      </div>
      <h1>Get your full deposit back, with proof.</h1>
      <p>
        Photograph every room when you move in, and again when you move out. DepositGuard fingerprints each photo so
        it can't be quietly swapped, finds exactly what changed, and uses AI to separate <strong>new damage</strong>{' '}
        from what was <strong>already there</strong>. Share the report with your owner so you can settle it together.
      </p>
      <ol className="steps">
        <li>
          <b>1</b> Move-in photos, timestamped and fingerprinted
        </li>
        <li>
          <b>2</b> Move-out photos of the same spots
        </li>
        <li>
          <b>3</b> A before/after report your owner can agree or dispute
        </li>
      </ol>
      <p className="small muted">Private by design: your photos and data stay on this computer.</p>
    </section>
  );
}
