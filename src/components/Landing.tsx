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
 * Same contract as before — App renders this whenever there is no user, and it
 * calls onSignedIn once the account exists. Everything under src/site is the
 * marketing surface; the sign-in itself is still the app's own AuthForm, so
 * there is exactly one place where authentication happens.
 */
export function Landing({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  return (
    <div className="dg-site">
      <SmoothScroll />
      <Grain />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Problem />
        <HowItWorks />
        <CompareDemo />
        <Engine />
        <Trust />
        <Share />
        <Close auth={<AuthForm onSignedIn={onSignedIn} />} />
      </main>
    </div>
  );
}
