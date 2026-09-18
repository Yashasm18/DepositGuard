import { motion } from "motion/react";
import { useState } from "react";
import { Reveal, RevealText } from "./motion-primitives";

const POINTS = [
  { k: "No account", v: "Your owner opens a link. No sign-up, no app, no password to forget." },
  { k: "Read-only", v: "They can see every photograph and every finding. They cannot alter one." },
  { k: "Expires, and revocable", v: "The link stops working on a date you set, or the moment you switch it off." },
];

export default function Share() {
  const [copied, setCopied] = useState(false);
  // Illustrative rather than live, but the shape is the real one: SharePanel
  // builds `${window.location.origin}/#/share/${token}` where the token is a
  // secrets.token_urlsafe(24). The page should not advertise a link format the
  // router would reject — `#/share/:token` is the only route that exists.
  const url = "localhost:5173/#/share/nT8xK2vQ9pLmR4sW1dYbZ7cF3hJ6gA0e";

  return (
    <section className="relative border-y border-line bg-surface/20 py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="eyebrow mb-6">07 — Settling it</div>
        <h2 className="text-h2 max-w-[17ch]">
          <RevealText text="Send one link. Then stop arguing from" />{" "}
          <RevealText gradient text="memory." delay={0.2} />
        </h2>

        <div className="mt-16 grid min-w-0 gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="flex flex-col gap-8">
            {POINTS.map((p, i) => (
              <Reveal key={p.k} delay={i * 0.1}>
                <div className="flex gap-5 border-t border-line pt-5">
                  <span className="font-mono text-xs text-faint">0{i + 1}</span>
                  <div>
                    <h3 className="text-lg">{p.k}</h3>
                    <p className="mt-2 max-w-md text-[0.92rem] leading-relaxed text-muted">{p.v}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <div className="overflow-hidden rounded-2xl border border-line bg-ink shadow-2xl shadow-black/50">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <div className="ml-2 flex flex-1 items-center gap-2 rounded-md bg-surface px-2.5 py-1">
                  <svg viewBox="0 0 24 24" className="size-3 text-wear" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 118 0v3" />
                  </svg>
                  <span className="truncate font-mono text-[0.64rem] text-muted">{url}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(url).catch(() => {});
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    }}
                    className="ml-auto shrink-0 font-mono text-[0.6rem] text-brand-2"
                  >
                    {copied ? "copied" : "copy"}
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="eyebrow">Shared report</div>
                    <h4 className="mt-2 font-display text-2xl">4B, Koramangala 5th Block</h4>
                  </div>
                  <span className="rounded-full border border-unclear/40 bg-unclear/10 px-2.5 py-1 font-mono text-[0.62rem] text-unclear">
                    expires in 14 days
                  </span>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  {[
                    { c: "damage", t: "Water staining, north wall", r: "Agreed" },
                    { c: "preexisting", t: "Hairline crack, left of window", r: "Agreed" },
                    { c: "wear", t: "Scuffing along skirting", r: "Agreed" },
                    { c: "unclear", t: "Area behind the door", r: "Disputed" },
                  ].map((f, i) => (
                    <motion.div
                      key={f.t}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.09, duration: 0.5 }}
                      className="flex items-center gap-3 rounded-lg border border-line px-3.5 py-3"
                    >
                      <span className="size-2 rounded-full" style={{ background: `var(--color-${f.c})` }} />
                      <span className="truncate text-[0.82rem] text-muted">{f.t}</span>
                      <span
                        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 font-mono text-[0.6rem] ${
                          f.r === "Agreed" ? "bg-wear/12 text-wear" : "bg-damage/12 text-damage"
                        }`}
                      >
                        {f.r.toLowerCase()}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <p className="mt-5 font-mono text-[0.64rem] leading-relaxed text-faint">
                  owner responded 19 Sep · 3 agreed, 1 disputed with a comment
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
