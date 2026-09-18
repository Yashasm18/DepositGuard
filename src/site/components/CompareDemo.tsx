import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import RoomPhoto from "./RoomPhoto";
import { Reveal, RevealText } from "./motion-primitives";

type Verdict = "damage" | "preexisting" | "wear" | "unclear";

const VERDICT = {
  damage: { label: "New damage", color: "var(--color-damage)", cls: "text-damage border-damage" },
  preexisting: { label: "Already there at move-in", color: "var(--color-preexisting)", cls: "text-preexisting border-preexisting" },
  wear: { label: "Normal wear and tear", color: "var(--color-wear)", cls: "text-wear border-wear" },
  unclear: { label: "Not enough evidence", color: "var(--color-unclear)", cls: "text-unclear border-unclear" },
} as const;

type Finding = {
  id: string;
  verdict: Verdict;
  title: string;
  reason: string;
  chargeable: string;
  confidence: number;
  box: { x: number; y: number; w: number; h: number };
};

const FINDINGS: Finding[] = [
  {
    id: "F-01",
    verdict: "damage",
    title: "Water staining, north wall above skirting",
    reason:
      "Nothing at this location in the move-in frame. The discolouration spreads outward from a point, which reads as a leak rather than a mark.",
    chargeable: "Chargeable — arose during tenancy",
    confidence: 0.94,
    box: { x: 26, y: 44, w: 25, h: 22 },
  },
  {
    id: "F-02",
    verdict: "preexisting",
    title: "Hairline crack, left of the window",
    reason:
      "Present in the move-in frame at the same position and the same length. The tenant cannot be charged for a crack the photographs show on day one.",
    chargeable: "Not chargeable — documented at move-in",
    confidence: 0.97,
    box: { x: 21, y: 19, w: 8, h: 30 },
  },
  {
    id: "F-03",
    verdict: "wear",
    title: "Scuffing along the skirting board",
    reason:
      "Light, evenly distributed abrasion at foot height across the whole run. Consistent with twenty-two months of ordinary use.",
    chargeable: "Not chargeable — fair wear and tear",
    confidence: 0.88,
    box: { x: 55, y: 62, w: 23, h: 8 },
  },
  {
    id: "F-04",
    verdict: "unclear",
    title: "Through the doorway, left of frame",
    reason:
      "The doorway falls at a different angle between the two visits and the space beyond it is largely in shadow. The comparison cannot be made honestly, so the report says so rather than guessing.",
    chargeable: "Undetermined — re-photograph to resolve",
    confidence: 0.41,
    box: { x: 2, y: 42, w: 15, h: 28 },
  },
];

/* ── Draggable before/after viewer ───────────────────────────── */
function Viewer({
  split,
  setSplit,
  active,
  analysed,
  onPick,
}: {
  split: number;
  setSplit: (n: number) => void;
  active: string | null;
  analysed: boolean;
  onPick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback(
    (clientX: number) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setSplit(Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100)));
    },
    [setSplit],
  );

  useEffect(() => {
    const up = () => (dragging.current = false);
    const mv = (e: PointerEvent) => dragging.current && move(e.clientX);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", mv);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", mv);
    };
  }, [move]);

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-2xl border border-line bg-black"
      onPointerDown={(e) => {
        dragging.current = true;
        move(e.clientX);
      }}
    >
      {/* move-out sits underneath; move-in is clipped over the top */}
      <RoomPhoto stage="moveout" priority className="absolute inset-0 size-full" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <RoomPhoto stage="movein" priority className="absolute inset-0 size-full" />
      </div>

      {/* detection overlay */}
      <AnimatePresence>
        {analysed &&
          FINDINGS.map((f, i) => {
            const on = active === f.id;
            return (
              <motion.button
                key={f.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPick(f.id);
                }}
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.13, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute cursor-pointer rounded-lg border-2 transition-shadow"
                style={{
                  left: `${f.box.x}%`,
                  top: `${f.box.y}%`,
                  width: `${f.box.w}%`,
                  height: `${f.box.h}%`,
                  borderColor: VERDICT[f.verdict].color,
                  borderStyle: f.verdict === "unclear" ? "dashed" : "solid",
                  boxShadow: on ? `0 0 0 3px color-mix(in oklab, ${VERDICT[f.verdict].color} 28%, transparent)` : "none",
                  background: on ? `color-mix(in oklab, ${VERDICT[f.verdict].color} 12%, transparent)` : "transparent",
                }}
                aria-label={`${VERDICT[f.verdict].label}: ${f.title}`}
              >
                <span
                  className="absolute -top-[1.35rem] left-0 rounded px-1.5 py-0.5 font-mono text-[0.6rem] font-medium text-ink"
                  style={{ background: VERDICT[f.verdict].color }}
                >
                  {f.id}
                </span>
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* the handle */}
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%` }}>
        <div className="absolute inset-y-0 -left-px w-0.5 bg-paper/90" />
        <div className="absolute top-1/2 -left-5 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-paper text-ink shadow-lg">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[0.62rem] tracking-wide text-paper backdrop-blur">
        MOVE-IN · 12 Nov 2024
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[0.62rem] tracking-wide text-paper backdrop-blur">
        MOVE-OUT · 18 Sep 2026
      </span>

      {!analysed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-black/70 px-3 py-1.5 text-[0.7rem] text-muted backdrop-blur">
            Drag to wipe between the two visits
          </span>
        </div>
      )}
    </div>
  );
}

export default function CompareDemo() {
  // Opens showing most of the move-out frame: the water stain sits at 26–51%
  // across, so a centred divider would hide the very thing worth looking at.
  const [split, setSplit] = useState(30);
  const [active, setActive] = useState<string | null>(null);
  const [analysed, setAnalysed] = useState(false);
  const [running, setRunning] = useState(false);
  const [owner, setOwner] = useState(false);
  const [responses, setResponses] = useState<Record<string, "agree" | "dispute">>({});
  const reduce = useReducedMotion();

  const run = () => {
    if (running) return;
    setRunning(true);
    setActive(null);
    setAnalysed(false);
    setTimeout(
      () => {
        setAnalysed(true);
        setRunning(false);
      },
      reduce ? 120 : 1500,
    );
  };

  return (
    <section id="compare" className="relative scroll-mt-24 border-y border-line bg-surface/20 py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="eyebrow mb-6">03 — The comparison</div>
        <h2 className="text-h2 max-w-[18ch]">
          <RevealText text="Both of you look at" />{" "}
          <RevealText gradient text="the same evidence." delay={0.14} />
        </h2>
        <Reveal delay={0.08}>
          <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-muted">
            This is the real interface, with a sample tenancy loaded. Wipe between the
            two visits, run the comparison, then switch to the owner&rsquo;s view — the
            read-only link they open without an account.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-12 overflow-hidden rounded-3xl border border-line bg-ink">
            {/* toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 rounded-full border border-wear/30 bg-wear/10 px-3 py-1.5">
                <svg viewBox="0 0 24 24" className="size-3.5 text-wear" fill="none" stroke="currentColor" strokeWidth="2.6">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-mono text-[0.66rem] text-wear">12/12 fingerprints match</span>
              </div>

              <div className="ml-auto flex items-center rounded-full border border-line p-0.5">
                {(["Tenant", "Owner link"] as const).map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setOwner(i === 1)}
                    className={`relative rounded-full px-3.5 py-1.5 text-[0.75rem] transition-colors ${
                      owner === (i === 1) ? "text-ink" : "text-muted hover:text-paper"
                    }`}
                  >
                    {owner === (i === 1) && (
                      <motion.span
                        layoutId="viewpill"
                        className="absolute inset-0 rounded-full bg-paper"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{t}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={run}
                disabled={running}
                className="rounded-full bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-[0.78rem] font-medium text-ink transition-opacity disabled:opacity-60"
              >
                {running ? "Comparing…" : analysed ? "Run again" : "Run comparison"}
              </button>
            </div>

            <div className="grid min-w-0 gap-6 p-4 lg:grid-cols-[1.25fr_1fr] lg:p-6">
              <div className="relative">
                <Viewer
                  split={split}
                  setSplit={setSplit}
                  active={active}
                  analysed={analysed}
                  onPick={(id) => setActive((a) => (a === id ? null : id))}
                />
                {running && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-brand-2/25 to-transparent [animation:dg-scan_1.5s_ease-in-out]" />
                  </div>
                )}
                <p className="mt-3 font-mono text-[0.66rem] text-faint">
                  Living room · north wall · frame #04 · aligned, Δangle 3.1°
                </p>
              </div>

              {/* findings */}
              <div className="flex flex-col">
                <AnimatePresence mode="wait">
                  {!analysed ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line p-10 text-center"
                    >
                      <div>
                        <p className="text-sm text-muted">
                          {running ? "Aligning frames and isolating changed regions…" : "No findings yet."}
                        </p>
                        {!running && (
                          <button onClick={run} className="mt-3 text-sm text-brand-2 underline underline-offset-4">
                            Run the comparison
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.ul key="list" className="flex flex-col gap-2.5">
                      {FINDINGS.map((f, i) => {
                        const v = VERDICT[f.verdict];
                        const on = active === f.id;
                        return (
                          <motion.li
                            key={f.id}
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <button
                              onClick={() => setActive(on ? null : f.id)}
                              className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                                on ? "border-paper/25 bg-white/[0.04]" : "border-line hover:border-paper/15"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="size-2 shrink-0 rounded-full" style={{ background: v.color }} />
                                <span className="text-[0.7rem] font-medium" style={{ color: v.color }}>
                                  {v.label}
                                </span>
                                <span className="ml-auto font-mono text-[0.62rem] text-faint">
                                  {f.id} · {(f.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="mt-2 text-[0.85rem] leading-snug">{f.title}</p>

                              <AnimatePresence initial={false}>
                                {on && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <p className="pt-2.5 text-[0.8rem] leading-relaxed text-muted">{f.reason}</p>
                                    <p className="mt-2 font-mono text-[0.66rem]" style={{ color: v.color }}>
                                      {f.chargeable}
                                    </p>

                                    {owner && (
                                      <div className="mt-3 flex gap-2">
                                        {(["agree", "dispute"] as const).map((r) => (
                                          <span
                                            key={r}
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setResponses((s) => ({ ...s, [f.id]: r }));
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" || e.key === " ") {
                                                e.stopPropagation();
                                                setResponses((s) => ({ ...s, [f.id]: r }));
                                              }
                                            }}
                                            className={`cursor-pointer rounded-full border px-3 py-1 text-[0.72rem] capitalize transition-colors ${
                                              responses[f.id] === r
                                                ? r === "agree"
                                                  ? "border-wear bg-wear/15 text-wear"
                                                  : "border-damage bg-damage/15 text-damage"
                                                : "border-line text-muted hover:text-paper"
                                            }`}
                                          >
                                            {r}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </button>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>

                {analysed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 rounded-xl border border-line bg-surface/60 p-3.5"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-[0.75rem] text-muted">Defensible deduction</span>
                      <span className="font-display text-2xl">₹4,500</span>
                    </div>
                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.span
                        className="bg-damage"
                        initial={{ width: 0 }}
                        animate={{ width: "18%" }}
                        transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                      <motion.span
                        className="bg-white/10"
                        initial={{ width: 0 }}
                        animate={{ width: "82%" }}
                        transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <p className="mt-2.5 text-[0.72rem] leading-relaxed text-faint">
                      Of the ₹25,000 originally proposed, one finding survives the
                      photographs. The rest is either documented at move-in or fair wear.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {/* legend */}
        <Reveal delay={0.1}>
          <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
            {(Object.keys(VERDICT) as Verdict[]).map((k) => (
              <li key={k} className="flex items-center gap-2 text-[0.8rem] text-muted">
                <span className="size-2.5 rounded-full" style={{ background: VERDICT[k].color }} />
                {VERDICT[k].label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
