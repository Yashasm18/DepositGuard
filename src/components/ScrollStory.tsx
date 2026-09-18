const CHAPTERS = [
  {
    kicker: 'Day one',
    title: 'You move in and photograph everything',
    body: 'Each photo is fingerprinted the moment it is stored. The room is now on record, exactly as you found it.',
  },
  {
    kicker: 'Eleven months later',
    title: 'Life happens to the room',
    body: 'A stain spreads near the socket. A hairline crack opens above the door. Nobody remembers what was there on day one.',
  },
  {
    kicker: 'Move-out day',
    title: 'DepositGuard finds what actually changed',
    body: 'Your photos are compared with the ones from day one. Only the differences are marked, and lighting changes are ignored.',
  },
  {
    kicker: 'The conversation',
    title: 'One report you both work from',
    body: 'New damage, pre-existing issues and normal wear are separated. Your owner opens a link and agrees or disputes each line.',
  },
];

/**
 * Scroll-told story of a room between move-in and move-out. The scene is
 * pinned while the page scrolls, driven entirely by CSS scroll-driven
 * animations. Without support, or with reduced motion, it falls back to a
 * static scene with the chapters listed underneath.
 */
export function ScrollStory() {
  return (
    <section className="story" aria-label="How a deposit dispute usually goes">
      <div className="story-stage">
        <div className="story-scene">
          <StoryRoom />
          <span className="story-box" aria-hidden />
          <div className="story-finding" aria-hidden>
            <span className="badge badge-bad">New damage</span>
            <b>Wall paint · near the socket</b>
            <p className="small muted">Absent at move-in, clearly visible at move-out.</p>
            <span className="stamp">Owner disputed</span>
          </div>
        </div>

        <ol className="story-chapters">
          {CHAPTERS.map((c, i) => (
            <li key={c.title} className={`story-chapter c${i + 1}`}>
              <span className="kicker">{c.kicker}</span>
              <h3>{c.title}</h3>
              <p className="muted">{c.body}</p>
            </li>
          ))}
        </ol>

        <div className="story-progress" aria-hidden>
          <span />
        </div>
      </div>
    </section>
  );
}

function StoryRoom() {
  return (
    <svg viewBox="0 0 480 320" className="story-svg" role="img" aria-label="A rented room at move-in and at move-out">
      <defs>
        <linearGradient id="s-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f1e8" />
          <stop offset="100%" stopColor="#e7e0d0" />
        </linearGradient>
        <linearGradient id="s-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#caa276" />
          <stop offset="100%" stopColor="#a8815a" />
        </linearGradient>
        <radialGradient id="s-stain">
          <stop offset="35%" stopColor="#5f4c31" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#5f4c31" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g className="layer-back">
        <rect width="480" height="250" fill="url(#s-wall)" />
        <rect y="250" width="480" height="70" fill="url(#s-floor)" />
        <rect y="242" width="480" height="10" fill="#ddd6c6" />
        <rect x="330" y="60" width="96" height="182" rx="5" fill="#a97d52" stroke="#8a6440" strokeWidth="4" />
        <circle cx="344" cy="160" r="5" fill="#f0d27a" />
        <rect x="46" y="52" width="120" height="100" rx="6" fill="#dcebfa" stroke="#9aa9b8" strokeWidth="6" />
        <line x1="106" y1="52" x2="106" y2="152" stroke="#9aa9b8" strokeWidth="5" />
        <line x1="46" y1="102" x2="166" y2="102" stroke="#9aa9b8" strokeWidth="5" />
        <rect x="236" y="170" width="26" height="18" rx="3" fill="#f1ece0" stroke="#c9c0ac" strokeWidth="2" />
        <circle cx="243" cy="179" r="2" fill="#c9c0ac" />
        <circle cx="255" cy="179" r="2" fill="#c9c0ac" />
      </g>

      <g className="story-damage">
        <ellipse cx="243" cy="205" rx="44" ry="30" fill="url(#s-stain)" />
        <path d="M356 42 l7 26 l-9 20 l11 26" fill="none" stroke="#8a7a60" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g className="layer-front">
        <rect x="60" y="196" width="150" height="54" rx="8" fill="#4b5f58" />
        <rect x="68" y="182" width="58" height="20" rx="6" fill="#5c7269" />
        <rect x="140" y="182" width="58" height="20" rx="6" fill="#5c7269" />
        <rect x="250" y="214" width="70" height="36" rx="4" fill="#8d6b4a" />
      </g>

      <rect width="480" height="320" fill="url(#s-light)" className="layer-light" />
    </svg>
  );
}
