import type { ReactNode } from 'react';
import { Magnetic, Reveal, RevealText } from './motion-primitives';

/**
 * Closing call to action. The `auth` slot takes the app's real AuthForm, so
 * the landing ends at an actual account rather than at a link to one — unless
 * the visitor already has one, in which case asking them to sign up again
 * would be the wrong thing to put in front of them.
 */
export default function Close({
  user,
  auth,
}: {
  user: { email: string; name?: string } | null;
  auth: ReactNode;
}) {
  return (
    <>
      <section id="start" className="relative scroll-mt-24 overflow-hidden px-6 py-32 md:py-44">
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/12 blur-[140px]" />

        {/* minmax gives the form a hard 26rem floor instead of a bare fraction,
            so it cannot be squeezed into a column too narrow for its own
            labels and tab row. */}
        <div className="relative mx-auto grid min-w-0 max-w-6xl gap-14 lg:grid-cols-[1fr_minmax(26rem,1fr)] lg:items-center">
          <div>
            <h2 className="text-display-2">
              <RevealText text="Photograph the place" />
              <br />
              <RevealText gradient text="before you unpack." delay={0.14} />
            </h2>
            <Reveal delay={0.12}>
              <p className="mt-8 max-w-xl text-[1.05rem] leading-relaxed text-muted">
                Twenty minutes on move-in day, against ₹10,000 to ₹30,000 at move-out
                and a conversation you cannot win. The evidence only exists if you make
                it while the place is still empty.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <ul className="mt-8 flex flex-col gap-3">
                {(user
                  ? [
                      'Your account and every photograph stay on this machine.',
                      'Pick up where you left off, or add another home you rent.',
                      'Share a report with your owner whenever you are ready.',
                    ]
                  : [
                      'The account is created on this machine. Nothing is registered with us.',
                      'Add the home you rent, then photograph a single wall to start.',
                      'You can share a report with your owner whenever you are ready.',
                    ]
                ).map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[0.92rem] text-muted">
                    <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-brand-2" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-10">
                <Magnetic strength={0.2}>
                  <a
                    href="#compare"
                    className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3.5 text-sm transition-colors hover:bg-white/5"
                  >
                    Replay the comparison first
                  </a>
                </Magnetic>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            {user ? (
              <div className="rounded-2xl border border-line bg-surface p-7">
                <div className="eyebrow mb-4">Already signed in</div>
                <p className="text-[0.95rem] leading-relaxed text-muted">
                  You are signed in as{' '}
                  <span className="text-paper">{user.email}</span>. Your evidence
                  is where you left it.
                </p>
                <Magnetic>
                  <a
                    href="#/homes"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3.5 text-sm font-medium text-ink"
                  >
                    Go to my homes
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </Magnetic>
              </div>
            ) : (
              auth
            )}
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-brand to-brand-2">
                <svg viewBox="0 0 24 24" className="size-3.5 text-ink" fill="none" stroke="currentColor" strokeWidth="2.6">
                  <path d="M12 3l7 3v6c0 4.2-2.8 7.5-7 9-4.2-1.5-7-4.8-7-9V6l7-3z" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-sm font-medium">DepositGuard</span>
            </div>
            <p className="mt-4 max-w-sm text-[0.82rem] leading-relaxed text-faint">
              Evidence for security deposits, built for Indian rentals. Runs on your own
              machine. Not legal advice — a record you can put in front of someone.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[0.68rem] text-faint">
            <span>Strands Agents</span>
            <span>Cedar</span>
            <span>SHA-256</span>
            <span>Local-first</span>
          </div>
        </div>
        <div className="border-t border-line px-6 py-5">
          <p className="mx-auto max-w-6xl font-mono text-[0.66rem] text-faint">
            Built for First Commit (WeMakeDevs × AWS)
          </p>
        </div>
      </footer>
    </>
  );
}
