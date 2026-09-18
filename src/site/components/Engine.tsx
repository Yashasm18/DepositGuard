import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { Reveal, RevealText } from "./motion-primitives";

const STAGES = [
  {
    k: "01",
    title: "Re-check the seals",
    body: "Before anything is compared, every photograph on both sides is hashed again and checked against the fingerprint recorded at capture. The report states plainly whether all of them still match. If one doesn't, you find out at the top of the page, not in a footnote.",
    tag: "sha-256 · 12/12 verified",
  },
  {
    k: "02",
    title: "Line the two frames up",
    body: "Move-out photos are never taken from exactly the same spot. The pair is registered onto a common view, and if the viewpoint has drifted too far to compare honestly, that pair is flagged instead of analysed.",
    tag: "Δangle 3.1° · within tolerance",
  },
  {
    k: "03",
    title: "Find what changed — without AI",
    body: "Plain image comparison does the detection: a lighting-invariant difference across the aligned pair, producing a handful of small candidate regions. No model has been asked anything yet. This is the step that keeps the whole thing fast and reproducible.",
    tag: "4 candidate regions · 180 ms",
    highlight: true,
  },
  {
    k: "04",
    title: "Ask the model only about those regions",
    body: "Each candidate region is cropped from both photographs and handed to a vision model side by side, with one question: what changed here, and is it damage, pre-existing, or wear? A small local model is far more accurate on a 200×200 crop than on a whole room — and far faster.",
    tag: "local vision model · 4 calls",
    highlight: true,
  },
  {
    k: "05",
    title: "Write it down, with its reasoning",
    body: "Every finding carries the two crops it was drawn from, the classification, a confidence, and the sentence explaining it. Anything the photographs can't settle is labelled unclear rather than guessed at.",
    tag: "report · shareable · read-only",
  },
];

export default function Engine() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 65%", "end 65%"] });
  const line = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });
  const scaleY = useTransform(line, [0, 1], [0, 1]);

  return (
    <section id="engine" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28 md:py-40">
      <div className="eyebrow mb-6">04 — Under the hood</div>
      <h2 className="text-h2 max-w-[20ch]">
        <RevealText text="The trick is that the AI goes" />{" "}
        <RevealText gradient text="second." delay={0.18} />
      </h2>
      <Reveal delay={0.08}>
        <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-muted">
          Handing a whole room photograph to a vision model and asking &ldquo;what&rsquo;s
          different?&rdquo; is slow and unreliable. So ordinary image comparison finds the
          changed areas first, and the model is only ever asked about those — a few small
          crops, side by side. Cheap detection, expensive judgement, in that order.
        </p>
      </Reveal>

      <div ref={ref} className="relative mt-20 pl-8 md:pl-14">
        {/* the spine */}
        <div className="absolute left-[3px] top-2 bottom-2 w-px bg-line md:left-[11px]">
          <motion.div
            style={{ scaleY, originY: 0 }}
            className="h-full w-px bg-gradient-to-b from-brand to-brand-2"
          />
        </div>

        <ol className="flex flex-col gap-14">
          {STAGES.map((s, i) => (
            <Reveal key={s.k} delay={i * 0.05}>
              <li className="relative">
                <span
                  className={`absolute -left-8 top-1.5 grid size-[9px] place-items-center rounded-full md:-left-14 ${
                    s.highlight ? "bg-brand-2" : "bg-faint"
                  }`}
                >
                  {s.highlight && (
                    <span className="absolute size-[9px] rounded-full bg-brand-2 [animation:dg-pulse-ring_2.4s_ease-out_infinite]" />
                  )}
                </span>
                <div className="flex flex-wrap items-baseline gap-x-4">
                  <span className="font-mono text-xs text-faint">{s.k}</span>
                  <h3 className="font-display text-2xl md:text-3xl">{s.title}</h3>
                </div>
                <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted">{s.body}</p>
                <span className="mt-4 inline-block rounded-full border border-line px-3 py-1 font-mono text-[0.66rem] text-faint">
                  {s.tag}
                </span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
