import { useReducedMotion } from "motion/react";

const ITEMS = [
  "“that crack was already there”",
  "₹18,000 deducted",
  "“it wasn’t”",
  "no dated photos",
  "“repainting charges”",
  "₹25,000 deducted",
  "“the tap was always loose”",
  "deposit withheld 4 months",
  "“show me proof”",
  "₹12,000 deducted",
];

export default function Marquee() {
  const reduce = useReducedMotion();

  return (
    <div className="relative overflow-hidden border-y border-line bg-surface/40 py-4">
      <div
        className="flex w-max gap-10 will-change-transform"
        style={
          reduce
            ? undefined
            : { animation: "dg-marquee 42s linear infinite" }
        }
      >
        {/* two identical runs: the second covers the seam as the first exits */}
        {[0, 1].map((run) => (
          <div key={run} className="flex shrink-0 gap-10" aria-hidden={run === 1}>
            {ITEMS.map((t, i) => (
              <span key={i} className="flex items-center gap-10 whitespace-nowrap text-sm text-faint">
                {t}
                <span className="size-1 rounded-full bg-brand/40" />
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}
