import { motion, useReducedMotion } from "motion/react";
import { Counter, Reveal, RevealText } from "./motion-primitives";

const STATS = [
  { value: 30000, prefix: "₹", suffix: "", label: "Typical amount a tenant writes off rather than fight for" },
  { value: 0, prefix: "", suffix: "", label: "Photos on an average phone that carry a date either side trusts" },
  { value: 100, prefix: "", suffix: "%", label: "Of the dispute decided by memory, volume and leverage" },
];

function Quote({
  side,
  who,
  line,
  delay,
}: {
  side: "left" | "right";
  who: string;
  line: string;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const dir = side === "left" ? -1 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: reduce ? 0 : dir * 60, rotate: reduce ? 0 : dir * 2.5 }}
      whileInView={{ opacity: 1, x: 0, rotate: dir * 1.2 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 ${
        side === "left" ? "md:mr-auto" : "md:ml-auto"
      }`}
    >
      <div className="eyebrow mb-3">{who}</div>
      <p className="font-display text-2xl leading-snug">{line}</p>
      <div
        className={`absolute -bottom-2 size-4 rotate-45 border-b border-line bg-surface ${
          side === "left" ? "left-8 border-l" : "right-8 border-r"
        }`}
      />
    </motion.div>
  );
}

export default function Problem() {
  return (
    <section id="problem" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-28 md:py-40">
      <div className="eyebrow mb-6">01 · The problem</div>

      <h2 className="text-h2 max-w-[19ch]">
        <RevealText text="At move-out, there is" />{" "}
        <RevealText gradient text="no record." delay={0.12} />{" "}
        <RevealText text="So the person holding the money wins." delay={0.2} />
      </h2>

      <Reveal delay={0.1}>
        <p className="mt-8 max-w-2xl text-[1.05rem] leading-relaxed text-muted">
          The owner walks through the flat, points at a mark on the wall, and names a
          number. You have a handful of photos somewhere in your camera roll: different
          rooms, different angles, different light, and dates nobody has any reason to
          believe. There is nothing to compare, so the argument is settled by whoever is
          more forceful. Usually that is the person still holding your deposit.
        </p>
      </Reveal>

      <div className="mt-20 grid gap-6 md:grid-cols-2">
        <Quote side="left" who="Tenant" line="“That crack was already there when I moved in.”" delay={0} />
        <Quote side="right" who="Owner" line="“It wasn’t. I’d have noticed.”" delay={0.18} />
      </div>

      <Reveal delay={0.2} className="mt-10 text-center">
        <span className="font-mono text-xs text-faint">
          ── no photograph, no date, no way to check ──
        </span>
      </Reveal>

      <div className="mt-24 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.1} className="bg-ink p-8">
            <div className="font-display text-5xl tracking-tight">
              {s.value === 0 ? (
                <span className="text-muted">Almost none</span>
              ) : (
                <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} />
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
