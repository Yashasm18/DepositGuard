/**
 * Synthetic "photographs" of a rented room, drawn as SVG.
 *
 * Real listing photos would carry someone's actual home into a marketing page,
 * which is exactly what this product exists to avoid. These are parametric
 * instead: the same room renders at `stage="movein"` and `stage="moveout"`,
 * and the move-out pass layers on the defects the demo talks about.
 */
export type RoomKey = "living" | "kitchen" | "bath";

const ROOMS: Record<
  RoomKey,
  { label: string; wall: [string, string]; floor: string; accent: string }
> = {
  living: { label: "Living room · north wall", wall: ["#3a3f4a", "#22262e"], floor: "#3b2f26", accent: "#525a68" },
  kitchen: { label: "Kitchen · counter run", wall: ["#3d4249", "#23272c"], floor: "#2e3238", accent: "#5a6068" },
  bath: { label: "Bathroom · shower wall", wall: ["#39424a", "#1f262c"], floor: "#2b3238", accent: "#4e5a63" },
};

export default function RoomPhoto({
  room = "living",
  stage = "movein",
  className = "",
}: {
  room?: RoomKey;
  stage?: "movein" | "moveout";
  className?: string;
}) {
  const c = ROOMS[room];
  const uid = `${room}-${stage}`;
  const after = stage === "moveout";

  return (
    <svg
      viewBox="0 0 800 560"
      className={className}
      role="img"
      aria-label={`${c.label}, ${after ? "move-out" : "move-in"} photograph`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`wall-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={c.wall[0]} />
          <stop offset="100%" stopColor={c.wall[1]} />
        </linearGradient>
        <radialGradient id={`light-${uid}`} cx="0.24" cy="0.16" r="0.85">
          <stop offset="0%" stopColor="#fff" stopOpacity={after ? 0.16 : 0.22} />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`stain-${uid}`} cx="0.5" cy="0.45" r="0.5">
          <stop offset="0%" stopColor="#6b4a2f" stopOpacity="0.92" />
          <stop offset="60%" stopColor="#7a5636" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7a5636" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft-${uid}`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`tex-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.08" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* wall */}
      <rect width="800" height="560" fill={`url(#wall-${uid})`} />
      <rect width="800" height="560" fill={`url(#light-${uid})`} />

      {/* window light spill — the lighting differs between the two visits,
          which is precisely the thing the matcher has to ignore */}
      <path
        d={after ? "M0 0 L300 0 L210 470 L0 470 Z" : "M0 0 L340 0 L250 470 L0 470 Z"}
        fill="#fff"
        opacity={after ? 0.035 : 0.06}
        filter={`url(#soft-${uid})`}
      />

      {/* floor + skirting */}
      <rect y="470" width="800" height="90" fill={c.floor} />
      <rect y="452" width="800" height="20" fill={c.accent} opacity="0.5" />
      <rect y="470" width="800" height="3" fill="#000" opacity="0.35" />

      {room === "kitchen" && (
        <>
          <rect x="60" y="300" width="680" height="16" rx="3" fill={c.accent} opacity="0.75" />
          <rect x="60" y="316" width="680" height="140" fill="#000" opacity="0.18" />
          <rect x="300" y="340" width="4" height="92" fill="#000" opacity="0.3" />
          <rect x="520" y="340" width="4" height="92" fill="#000" opacity="0.3" />
        </>
      )}
      {room === "bath" && (
        <g opacity="0.3">
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={i} x={90 + i * 92} y="120" width="86" height="330" fill="none" stroke="#fff" strokeWidth="1.5" />
          ))}
        </g>
      )}
      {room === "living" && (
        <>
          <rect x="520" y="90" width="210" height="150" rx="2" fill="#000" opacity="0.22" />
          <rect x="520" y="90" width="210" height="150" rx="2" fill="none" stroke={c.accent} strokeWidth="6" />
        </>
      )}

      {/* ── Pre-existing: present in BOTH passes ───────────────── */}
      <g opacity="0.85">
        <path
          d="M170 150 q14 40 4 76 q-8 30 8 58"
          fill="none"
          stroke="#161a1f"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path d="M174 226 q10 16 22 22" fill="none" stroke="#161a1f" strokeWidth="1.6" opacity="0.6" />
      </g>

      {/* ── Wear and tear: faint in move-in, slightly more in move-out ── */}
      <ellipse cx="640" cy="430" rx="70" ry="14" fill="#000" opacity={after ? 0.24 : 0.14} filter={`url(#soft-${uid})`} />

      {/* ── New damage: move-out only ──────────────────────────── */}
      {after && (
        <>
          <ellipse cx="420" cy="250" rx="86" ry="66" fill={`url(#stain-${uid})`} />
          <ellipse cx="446" cy="286" rx="30" ry="20" fill="#6b4a2f" opacity="0.4" filter={`url(#soft-${uid})`} />
          <path
            d="M690 180 l-16 64 l22 -10 l-14 58"
            fill="none"
            stroke="#12161a"
            strokeWidth="2.2"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </>
      )}

      {/* photographic grain over everything */}
      <rect width="800" height="560" filter={`url(#tex-${uid})`} opacity="0.5" />
      <rect width="800" height="560" fill="#000" opacity={after ? 0.06 : 0} />
    </svg>
  );
}

export const ROOM_LABELS = ROOMS;
