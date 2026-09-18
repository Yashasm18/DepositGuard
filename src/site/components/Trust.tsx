import { motion } from "motion/react";
import { Reveal, RevealText, useParallax } from "./motion-primitives";

const CEDAR = [
  { t: "// The owner's link can read the report. That is all it can do.", c: "comment" },
  { t: "permit (", c: "kw" },
  { t: "  principal in Role::\"owner\",", c: "" },
  { t: "  action   in [Action::\"viewReport\", Action::\"respondToFinding\"],", c: "" },
  { t: "  resource == Tenancy::\"blr-koramangala-4b\"", c: "" },
  { t: ") when {", c: "kw" },
  { t: "  context.link.revoked == false &&", c: "" },
  { t: "  context.now < context.link.expiresAt", c: "" },
  { t: "};", c: "kw" },
  { t: "", c: "" },
  { t: "// Evidence is the tenant's alone to add, re-seal or remove.", c: "comment" },
  { t: "forbid (", c: "kw" },
  { t: "  principal in Role::\"owner\",", c: "" },
  { t: "  action   in [Action::\"addPhoto\", Action::\"deletePhoto\", Action::\"reseal\"],", c: "" },
  { t: "  resource", c: "" },
  { t: ");", c: "kw" },
];

function CodeBlock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#0a0c10]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-damage/60" />
        <span className="size-2.5 rounded-full bg-unclear/60" />
        <span className="size-2.5 rounded-full bg-wear/60" />
        <span className="ml-2 font-mono text-[0.68rem] text-faint">policies/sharing.cedar</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[0.72rem] leading-[1.75]">
        {CEDAR.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ delay: i * 0.035, duration: 0.4 }}
            className={
              l.c === "comment" ? "text-faint" : l.c === "kw" ? "text-brand" : "text-muted"
            }
          >
            {l.t || " "}
          </motion.div>
        ))}
      </pre>
    </div>
  );
}

const LOCAL = [
  { k: "Your database", v: "SQLite on your disk. Not a row leaves it." },
  { k: "Your photographs", v: "Never uploaded. These are pictures of the inside of someone's home." },
  { k: "Your model", v: "The vision model runs locally. No prompt, no crop, no image is sent anywhere." },
  { k: "Your link", v: "Read-only, expiring, revocable the moment you want it gone." },
];

export default function Trust() {
  const { ref, y } = useParallax(40);

  return (
    <>
      {/* ── Local-first ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-line bg-surface/30 py-28 md:py-40">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="eyebrow mb-6">05 — Where it runs</div>
              <h2 className="text-h2 max-w-[14ch]">
                <RevealText text="Nothing is uploaded." />
              </h2>
              <Reveal delay={0.08}>
                <p className="mt-7 max-w-lg text-[1.05rem] leading-relaxed text-muted">
                  Everything happens on your laptop: the database, the photographs, the
                  model. Not as a privacy slogan — as a straightforward consequence of what
                  this evidence is. It is the inside of somebody&rsquo;s home, room by room,
                  with the date attached. That does not belong on someone else&rsquo;s server.
                </p>
              </Reveal>
            </div>

            <motion.div ref={ref} style={{ y }} className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {LOCAL.map((l, i) => (
                <Reveal key={l.k} delay={i * 0.08} className="bg-ink p-6">
                  <div className="font-mono text-[0.68rem] text-brand-2">{l.k}</div>
                  <p className="mt-3 text-[0.88rem] leading-relaxed text-muted">{l.v}</p>
                </Reveal>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── AWS open source ─────────────────────────────────── */}
      <section id="aws" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28 md:py-40">
        <div className="eyebrow mb-6">06 — Built on</div>
        <h2 className="text-h2 max-w-[20ch]">
          <RevealText text="Two open-source pieces from AWS do the load-bearing work." />
        </h2>

        <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6">
            <Reveal>
              <article className="rounded-2xl border border-line bg-surface/50 p-7">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand/15 font-mono text-xs text-brand">SA</span>
                  <h3 className="font-display text-2xl">Strands Agents</h3>
                </div>
                <p className="mt-4 text-[0.92rem] leading-relaxed text-muted">
                  AWS&rsquo;s open-source agent SDK runs the review. It takes each pair of
                  crops, drives the local vision model, and turns the answer into a
                  structured finding — classification, confidence and reasoning — instead
                  of a paragraph of prose someone has to interpret.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["tool calling", "structured output", "local model provider", "per-region loop"].map((t) => (
                    <span key={t} className="rounded-full border border-line px-2.5 py-1 font-mono text-[0.64rem] text-faint">
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            </Reveal>

            <Reveal delay={0.1}>
              <article className="rounded-2xl border border-line bg-surface/50 p-7">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-2/15 font-mono text-xs text-brand-2">CD</span>
                  <h3 className="font-display text-2xl">Cedar</h3>
                </div>
                <p className="mt-4 text-[0.92rem] leading-relaxed text-muted">
                  Who may do what is a policy, not an <code className="font-mono text-[0.85em] text-paper">if</code> statement
                  buried in a handler. The tenant owns the evidence. The owner&rsquo;s link
                  reads and responds, nothing more, and stops working when it expires or
                  when the tenant revokes it. The rules sit in one file you can read.
                </p>
              </article>
            </Reveal>
          </div>

          <Reveal delay={0.06}>
            <CodeBlock />
          </Reveal>
        </div>
      </section>
    </>
  );
}
