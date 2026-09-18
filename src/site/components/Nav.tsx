import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#how", label: "How it works" },
  { href: "#compare", label: "The comparison" },
  { href: "#engine", label: "Under the hood" },
  { href: "#aws", label: "Built on" },
];

export default function Nav() {
  const { scrollY } = useScroll();
  const [lifted, setLifted] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setLifted(v > 40));

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav
        className={`flex w-full max-w-5xl items-center gap-2 rounded-full border px-3 py-2 transition-all duration-500 ${
          lifted ? "glass border-line shadow-2xl shadow-black/40" : "border-transparent"
        }`}
      >
        <a href="#top" className="flex items-center gap-2.5 pl-1.5 pr-3">
          <span className="relative grid size-7 place-items-center rounded-md bg-gradient-to-br from-brand to-brand-2">
            <svg viewBox="0 0 24 24" className="size-4 text-ink" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 3l7 3v6c0 4.2-2.8 7.5-7 9-4.2-1.5-7-4.8-7-9V6l7-3z" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[0.95rem] font-medium tracking-tight">DepositGuard</span>
        </a>

        <ul className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="group relative rounded-full px-3 py-1.5 text-[0.8rem] text-muted transition-colors hover:text-paper"
              >
                {l.label}
                <span className="absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-brand-2 transition-transform duration-500 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#start"
          className="ml-auto rounded-full bg-paper px-4 py-2 text-[0.8rem] font-medium text-ink transition-transform duration-300 hover:scale-[1.04] md:ml-2"
        >
          Start a record
        </a>
      </nav>
    </motion.header>
  );
}
