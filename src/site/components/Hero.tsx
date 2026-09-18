import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Magnetic, RevealText } from "./motion-primitives";

import { HeroCanvas } from "./HeroCanvas";

const HEX = "0123456789abcdef";

function HashChip() {
  const [hash, setHash] = useState("a7f3c1d9e2b84f06c5a1d7e39b24f8c0");
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    // Cosmetic scramble — signals "a fingerprint is being taken" without
    // pretending to be a real digest of anything.
    const id = setInterval(() => {
      setHash((h) => {
        const i = Math.floor(Math.random() * h.length);
        return h.slice(0, i) + HEX[Math.floor(Math.random() * 16)] + h.slice(i + 1);
      });
    }, 90);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="flex items-center gap-3 rounded-full border border-line glass px-3.5 py-2">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full rounded-full bg-brand-2 opacity-75 [animation:dg-pulse-ring_2s_ease-out_infinite]" />
        <span className="relative inline-flex size-1.5 rounded-full bg-brand-2" />
      </span>
      <span className="font-mono text-[0.68rem] text-faint">sha-256</span>
      <span className="font-mono text-[0.68rem] tracking-tight text-muted">{hash}…</span>
    </div>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.08]);

  return (
    <section id="top" ref={ref} className="relative min-h-[100svh] overflow-hidden">
      <motion.div style={{ scale }} className="absolute inset-0">
        {!reduce && <HeroCanvas />}
      </motion.div>

      <div className="absolute inset-0 bg-grid opacity-[0.55]" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/5 via-ink/35 to-ink" />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 pt-28 pb-20"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.8 }}
          className="eyebrow mb-7 flex flex-wrap items-center gap-x-3 gap-y-2"
        >
          <span>Security deposits · India</span>
          <span className="h-3 w-px bg-line" />
          <span>Runs entirely on your machine</span>
        </motion.div>

        <h1 className="text-display max-w-[15ch]">
          <RevealText text="Proof beats" delay={0.05} />
          <br />
          <RevealText gradient text="whoever argues" delay={0.16} />
          <br />
          <RevealText text="hardest." delay={0.3} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-xl text-[1.05rem] leading-relaxed text-muted"
        >
          You hand over ₹50,000 to ₹2,00,000 and nobody writes down what the place
          looked like. DepositGuard turns move-in day into sealed, timestamped
          evidence — so move-out is a comparison, not an argument.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.74, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Magnetic>
            <a
              href="#compare"
              className="group inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3.5 text-sm font-medium text-ink"
            >
              See a real comparison
              <svg viewBox="0 0 24 24" className="size-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </Magnetic>
          <Magnetic strength={0.2}>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3.5 text-sm text-paper transition-colors hover:border-paper/30 hover:bg-white/5"
            >
              How it works
            </a>
          </Magnetic>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-16 flex flex-wrap items-center gap-4"
        >
          <HashChip />
          <span className="font-mono text-[0.68rem] text-faint">
            2026-09-18 · 14:22:07 IST · sealed at capture
          </span>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        style={{ opacity }}
        className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center"
      >
        <div className="h-10 w-px overflow-hidden bg-white/10">
          <div className="h-full w-full bg-brand-2 [animation:dg-scan_2.4s_ease-in-out_infinite]" />
        </div>
      </motion.div>
    </section>
  );
}
