import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useScroll,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Masked word reveal ───────────────────────────────────────────
   Each word sits inside its own clip box and slides up from behind the
   edge. Only transform/opacity animate, so this stays on the compositor.
   ---------------------------------------------------------------- */
export function RevealText({
  text,
  className = "",
  delay = 0,
  stagger = 0.045,
  as: As = "span",
  gradient = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  /** Paint the words with the brand gradient.
   *  Must be applied to the word span itself: `background-clip: text` on an
   *  ancestor does not paint through `inline-block` descendants, which is what
   *  every word here is. */
  gradient?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const reduce = useReducedMotion();
  const words = text.split(" ");

  return (
    <As className={className}>
      <span ref={ref} className="inline">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="inline-block"
            /* Masking without `overflow: hidden`, on purpose. An inline-block
               with overflow takes its BASELINE from its bottom margin edge
               rather than from its text, which knocks masked words off the
               baseline of the words beside them.
               Instead: padding grows the box clear of every ascender and
               descender, clip-path trims back to that padding box (a positive
               inset, so it stays valid), and the negative margin cancels the
               padding again in the line box. Baseline stays content-derived,
               so every word sits on the same line. */
            style={{ padding: "0.35em 0", margin: "-0.35em 0", clipPath: "inset(0)" }}
          >
            <motion.span
              className="inline-block"
              initial={reduce ? { opacity: 0 } : { y: "110%", opacity: 0 }}
              animate={
                inView
                  ? { y: "0%", opacity: 1 }
                  : reduce
                    ? { opacity: 0 }
                    : { y: "110%", opacity: 0 }
              }
              transition={{
                duration: reduce ? 0.2 : 0.9,
                delay: delay + i * (reduce ? 0 : stagger),
                ease: EASE,
              }}
            >
              {/* The gradient goes on a plain inline span, not on this
                  inline-block — see .text-gradient in site.css. This element
                  must stay inline-block because transform does not apply to
                  inline boxes, and the reveal animates one. */}
              {gradient ? <span className="text-gradient">{word}</span> : word}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </span>
    </As>
  );
}

/* ── Generic scroll-in reveal ─────────────────────────────────── */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: reduce ? 0.25 : 0.85, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Magnetic pointer attraction ──────────────────────────────── */
export function Magnetic({
  children,
  strength = 0.35,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── Count-up on enter ────────────────────────────────────────── */
export function Counter({
  to,
  prefix = "",
  suffix = "",
  duration = 1.6,
  className = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    // Reduced motion collapses the ramp to zero rather than skipping the loop,
    // so the value still arrives through the same rAF path.
    const ms = reduce ? 0 : duration * 1000;
    const step = (now: number) => {
      const t = ms === 0 ? 1 : Math.min(1, (now - start) / ms);
      // easeOutExpo — fast commitment, long settle. Reads as "counting up".
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/* ── Parallax helper ──────────────────────────────────────────── */
export function useParallax(range = 60): {
  ref: React.RefObject<HTMLDivElement | null>;
  y: MotionValue<number>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [range, -range]);
  return { ref, y };
}

export { EASE };
