import { useState } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { PropertyList } from './components/PropertyList';
import { PropertyDetail } from './components/PropertyDetail';

export default function App() {
  const { authStatus, user, signOut } = useAuthenticator((ctx) => [ctx.authStatus, ctx.user]);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  if (authStatus !== 'authenticated') {
    return (
      <div className="landing">
        <Hero />
        <div className="landing-auth">
          <Authenticator signUpAttributes={['email']} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setPropertyId(null)}>
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>DepositGuard</span>
        </button>
        <div className="topbar-right">
          <span className="muted">{user?.signInDetails?.loginId}</span>
          <button className="btn btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="container">
        {propertyId ? (
          <PropertyDetail propertyId={propertyId} onBack={() => setPropertyId(null)} />
        ) : (
          <PropertyList onOpen={setPropertyId} />
        )}
      </main>
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
        Photograph every room when you move in. Photograph it again when you move out. DepositGuard fingerprints
        each photo so it can't be quietly swapped, then uses AI to separate <strong>new damage</strong> from what was{' '}
        <strong>already there</strong>, in a report you and your owner can both read.
      </p>
      <ol className="steps">
        <li>
          <b>1</b> Move-in photos, timestamped and fingerprinted
        </li>
        <li>
          <b>2</b> Move-out photos of the same spots
        </li>
        <li>
          <b>3</b> AI before/after report to share with your owner
        </li>
      </ol>
    </section>
  );
}
