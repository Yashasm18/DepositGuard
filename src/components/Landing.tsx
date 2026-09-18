import type { User } from '../lib/api';
import { AuthForm } from './AuthForm';
import { BeforeAfter } from './BeforeAfter';
import { RoomIllustration } from './RoomIllustration';
import { ScrollStory } from './ScrollStory';

const STEPS = [
  {
    title: 'Photograph at move-in',
    body: 'Room by room, from the doorway and each corner. Every photo is fingerprinted the moment it is stored, so it can never be quietly swapped.',
    icon: '📸',
  },
  {
    title: 'Photograph again at move-out',
    body: 'Stand in the same spots. DepositGuard pairs each photo with its move-in twin and ignores changes that are only lighting.',
    icon: '🔁',
  },
  {
    title: 'Share the report',
    body: 'New damage, pre-existing issues and normal wear, each with the changed area circled. Your owner opens a link and agrees or disputes.',
    icon: '🤝',
  },
];

const FAQ = [
  {
    q: 'Do my photos leave my computer?',
    a: 'No. The app, the database, the photos and the AI model all run on your machine. Nothing is uploaded to any cloud service.',
  },
  {
    q: 'What stops someone editing a photo later?',
    a: 'Every photo is fingerprinted (SHA-256) by the server from the exact bytes it stores. Before each comparison the fingerprints are re-checked, and the report says whether they still match.',
  },
  {
    q: 'Can my owner change the report?',
    a: 'No. A share link is read-only: the owner can view the report and mark each finding as agreed or disputed. Access rules are enforced by Cedar policies, and you can revoke a link at any time.',
  },
  {
    q: 'Is the AI always right?',
    a: 'No, and it does not have to be. It points at what changed and suggests a label; the photos sit next to every finding so both sides can judge, and the owner can dispute anything.',
  },
];

export function Landing({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  return (
    <div className="landing-page">
      <header className="landing-bar">
        <span className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>DepositGuard</span>
        </span>
        <a className="btn btn-primary" href="#start">
          Get started
        </a>
      </header>

      <section className="hero-full">
        <div className="hero-copy">
          <span className="pill">Runs entirely on your laptop</span>
          <h1>
            Get your full deposit back, <em>with proof</em>.
          </h1>
          <p className="lede">
            Landlords in India hold ₹50,000 or more of your money and decide at the end what counts as “damage”.
            DepositGuard records the condition of every room on day one, compares it on the day you leave, and gives
            both sides one report to agree on.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary btn-lg" href="#start">
              Start documenting
            </a>
            <a className="btn btn-ghost btn-lg" href="#how">
              See how it works
            </a>
          </div>
          <p className="small muted">No account with us. No cloud. No bill.</p>
        </div>
        <div className="hero-demo reveal">
          <BeforeAfter
            before={<RoomIllustration />}
            after={<RoomIllustration damaged />}
            box={{ x: 0.4, y: 0.38, w: 0.27, h: 0.3 }}
          />
          <p className="small muted center-text">Drag to compare</p>
          <div className="verdict-card">
            <span className="badge badge-bad">New damage</span>
            <div>
              <b>Wall paint · middle of the wall</b>
              <p className="small muted">A dark stain is visible at move-out and absent in the move-in photo.</p>
            </div>
          </div>
        </div>
      </section>

      <ScrollStory />

      <section className="section" id="how">
        <h2 className="section-title reveal">Three steps, and you are covered</h2>
        <div className="steps-grid">
          {STEPS.map((step, i) => (
            <article className="step-card reveal" key={step.title}>
              <span className="step-num">{i + 1}</span>
              <span className="step-icon" aria-hidden>
                {step.icon}
              </span>
              <h3>{step.title}</h3>
              <p className="muted">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section band">
        <div className="split">
          <div className="reveal">
            <h2 className="section-title">A report both sides can trust</h2>
            <ul className="ticks">
              <li>Every finding shows the two photos and circles the area that changed.</li>
              <li>Damage that was already there at move-in is called out, so you are not charged for it.</li>
              <li>Normal wear and tear is separated from real damage.</li>
              <li>Fingerprints prove no photo was edited after it was taken.</li>
              <li>Your owner replies inside the report: agreed, or disputed with a comment.</li>
            </ul>
          </div>
          <div className="report-mock reveal" aria-hidden>
            <div className="mock-head">
              <span className="badge badge-bad">Possible new damage</span>
              <span className="small muted">Bedroom</span>
            </div>
            <p className="small">
              Found 1 possible new damage item, 1 issue already there at move-in, and 2 spots with no change. 6 of 6
              photos match their fingerprints.
            </p>
            <div className="mock-row bad">
              <span className="badge badge-bad">New damage</span> Wall paint · middle left
            </div>
            <div className="mock-row info">
              <span className="badge badge-info">Already there</span> Door frame · chipped corner
            </div>
            <div className="mock-row good">
              <span className="badge badge-good">Owner agrees</span> Floor · no change
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="split">
          <div className="privacy-card reveal">
            <h3>Private by design</h3>
            <p className="muted">
              Photographs of your home are personal. DepositGuard keeps them on your own machine: a local database, a
              local folder, and a local AI model. The only thing that ever leaves is the report link you choose to
              send.
            </p>
            <ul className="tech">
              <li>
                <b>Strands Agents</b> runs the AI review with a vision model on your laptop
              </li>
              <li>
                <b>Cedar</b> decides who may see or change anything, including expiring owner links
              </li>
              <li>
                <b>SHA-256</b> fingerprints, re-checked before every comparison
              </li>
            </ul>
          </div>
          <div className="reveal">
            <h2 className="section-title">Questions</h2>
            <div className="faq">
              {FAQ.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p className="muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section start" id="start">
        <div className="start-inner">
          <div className="reveal">
            <h2 className="section-title">Start with one room</h2>
            <p className="muted">
              Create an account on this machine, add the home you rent, and photograph a single wall. The whole thing
              takes five minutes, and it is the cheapest insurance on a ₹50,000 deposit.
            </p>
          </div>
          <div className="reveal">
            <AuthForm onSignedIn={onSignedIn} />
          </div>
        </div>
      </section>

      <footer className="footer muted small">
        DepositGuard · built for First Commit (WeMakeDevs × AWS) · runs locally with Strands Agents and Cedar
      </footer>
    </div>
  );
}
