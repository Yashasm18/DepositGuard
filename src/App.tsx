import { useEffect, useState } from 'react';
import { api, type User } from './lib/api';
import { Landing } from './components/Landing';
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

  if (!user) return <Landing onSignedIn={setUser} />;

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
