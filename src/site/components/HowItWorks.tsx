import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import RoomPhoto from "./RoomPhoto";
import { RevealText } from "./motion-primitives";

const STEPS = [
  {
    n: "01",
    title: "Move in. Photograph each room.",
    body: "Walk the flat once. Every photo is stamped with the moment it was taken and given a SHA-256 fingerprint on the spot. Change a single pixel afterwards and the fingerprint no longer matches — so nothing can be quietly swapped in later.",
    chip: "sealed · 14:22:07 IST",
    render: <RoomPhoto room="living" stage="movein" className="size-full" />,
  },
  {
    n: "02",
    title: "Move out. Photograph the same spots.",
    body: "The app shows you each move-in frame and you line the new shot up against it. Same wall, same corner, roughly the same distance. If the angle drifts too far, it tells you before you leave the room rather than after.",
    chip: "matched to frame #04",
    render: <RoomPhoto room="living" stage="moveout" className="size-full" />,
  },
  {
    n: "03",
    title: "Compare. Every difference, sorted.",
    body: "The two sets are lined up and every change is found and labelled: new damage, already there at move-in, normal wear and tear, or not enough evidence to say. You get a report. Your owner gets a link to the same report.",
    chip: "4 findings · 1 disputed",
    render: (
      <div className="relative size-full">
        <RoomPhoto room="living" stage="moveout" className="size-full" />
        <div className="absolute inset-0">
          <span className="absolute left-[40%] top-[34%] size-[24%] rounded-lg border-2 border-damage shadow-[0_0_0_9999px_rgba(7,8,10,0.45)]" />
          <span className="absolute left-[16%] top-[22%] h-[30%] w-[10%] rounded-lg border-2 border-preexisting" />
          <span className="absolute left-[72%] top-[68%] h-[14%] w-[20%] rounded-lg border-2 border-wear" />
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Pinned horizontal travel — desktop, motion-friendly visitors only.
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const panels = gsap.utils.toArray<HTMLElement>(".hiw-panel");

        // xPercent is relative to the animated element's OWN width. Each panel
        // is exactly one viewport wide, so animating the panels (not the 300%-
        // wide track) makes -100 * (n - 1) mean "n - 1 viewports of travel".
        const tween = gsap.to(panels, {
          xPercent: -100 * (panels.length - 1),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            pin: true,
            scrub: 0.8,
            // one viewport of scroll distance per panel
            end: () => "+=" + window.innerHeight * (panels.length - 1) * 1.15,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });

        // Each panel's copy settles in as it arrives at centre. containerAnimation
        // re-maps the trigger's start/end onto horizontal position instead of
        // vertical scroll, so "left center" means "this panel's left edge reaches
        // the middle of the screen".
        panels.forEach((panel, i) => {
          if (i === 0) return;
          gsap.from(panel.querySelectorAll(".hiw-in"), {
            y: 40,
            opacity: 0,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: panel,
              containerAnimation: tween,
              start: "left center",
              toggleActions: "play none none reverse",
            },
          });
        });

        gsap.to(".hiw-progress", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, scrub: true, start: "top top", end: "bottom bottom" },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="how" className="scroll-mt-24 bg-surface/30">
      <div className="mx-auto max-w-6xl px-6 pt-28 md:pt-40">
        <div className="eyebrow mb-6">02 — How it works</div>
        <h2 className="text-h2 max-w-[16ch]">
          <RevealText text="Three steps, and the argument is over." />
        </h2>
      </div>

      <div ref={root} className="relative mt-16 overflow-hidden md:mt-24">
        <div className="absolute inset-x-0 top-0 z-20 h-px bg-line">
          <div className="hiw-progress h-px origin-left scale-x-0 bg-gradient-to-r from-brand to-brand-2" />
        </div>

        <div
          ref={track}
          className="hiw-track flex flex-col gap-16 px-6 pb-28 md:h-[100svh] md:w-[300%] md:flex-row md:gap-0 md:px-0 md:pb-0"
        >
          {STEPS.map((s) => (
            <article
              key={s.n}
              className="hiw-panel flex w-full shrink-0 flex-col justify-center gap-10 md:h-full md:w-1/3 md:px-14 lg:flex-row lg:items-center"
            >
              <div className="hiw-in flex-1 lg:max-w-sm">
                <div className="font-mono text-sm text-brand-2">{s.n}</div>
                <h3 className="mt-4 font-display text-3xl leading-tight md:text-4xl">{s.title}</h3>
                <p className="mt-5 text-[0.95rem] leading-relaxed text-muted">{s.body}</p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[0.68rem] text-faint">
                  <span className="size-1.5 rounded-full bg-brand-2" />
                  {s.chip}
                </div>
              </div>

              <div className="hiw-in relative aspect-[4/3] w-full flex-1 overflow-hidden rounded-2xl border border-line bg-black lg:max-w-md">
                {s.render}
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
