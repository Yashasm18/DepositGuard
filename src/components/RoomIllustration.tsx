/** Simple drawn room used on the landing page, so no photos of real homes are needed. */
export function RoomIllustration({ damaged = false }: { damaged?: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="room-illu" role="img" aria-label={damaged ? 'Room at move-out' : 'Room at move-in'}>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3efe6" />
          <stop offset="100%" stopColor="#e6e0d2" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a074" />
          <stop offset="100%" stopColor="#b08a5f" />
        </linearGradient>
        <radialGradient id="stain">
          <stop offset="40%" stopColor="#6b5638" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#6b5638" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <rect width="400" height="230" fill="url(#wall)" />
      <rect y="230" width="400" height="70" fill="url(#floor)" />
      <rect x="18" y="232" width="364" height="4" fill="#00000018" />

      {/* window */}
      <rect x="40" y="55" width="110" height="95" rx="6" fill="#dbeafe" stroke="#94a3b8" strokeWidth="6" />
      <line x1="95" y1="55" x2="95" y2="150" stroke="#94a3b8" strokeWidth="5" />
      <line x1="40" y1="102" x2="150" y2="102" stroke="#94a3b8" strokeWidth="5" />

      {/* door */}
      <rect x="280" y="70" width="86" height="160" rx="5" fill="#a97d52" stroke="#8a6440" strokeWidth="4" />
      <circle cx="292" cy="155" r="5" fill="#f0d27a" />

      {/* skirting */}
      <rect y="220" width="400" height="10" fill="#d9d2c2" />

      {damaged && (
        <>
          <ellipse cx="205" cy="150" rx="46" ry="34" fill="url(#stain)" />
          <path d="M243 62 l8 30 l-10 22 l12 28" fill="none" stroke="#7b6a52" strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
