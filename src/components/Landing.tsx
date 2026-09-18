import type { User } from '../lib/api';
import { AuthForm } from './AuthForm';

import '../site/site.css';
import SmoothScroll from '../site/components/SmoothScroll';
import Grain from '../site/components/Grain';
import Nav from '../site/components/Nav';
import Hero from '../site/components/Hero';
import Marquee from '../site/components/Marquee';
import Problem from '../site/components/Problem';
import HowItWorks from '../site/components/HowItWorks';
import CompareDemo from '../site/components/CompareDemo';
import Engine from '../site/components/Engine';
import Trust from '../site/components/Trust';
import Share from '../site/components/Share';
import Close from '../site/components/Close';

/**
 * The signed-out landing page.
 *
 * This is the front door at `#`, shown to everyone; signed in or not, rather
 * than a fallback for signed-out visitors. Everything under src/site is the
 * marketing surface; the sign-in itself is still the app's own AuthForm, so
 * there is exactly one place where authentication happens.
 */
export function Landing({
  user,
  onSignedIn,
}: {
  /** null when signed out. Signed-in visitors still see the landing; it is
   *  the front door, but are offered their homes rather than a sign-up form. */
  user: User | null;
  onSignedIn: (user: User) => void;
}) {
  return (
    <div className="dg-site">
      <SmoothScroll />
      <Grain />
      <Nav signedIn={!!user} />
      <main>
        <Hero />
        <Marquee />
        <Problem />
        <HowItWorks />
        <CompareDemo />
        <Engine />
        <Trust />
        <Share />
        <Close user={user} auth={<AuthForm onSignedIn={onSignedIn} />} />
      </main>
    </div>
  );
}
