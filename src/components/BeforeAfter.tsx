import { useId, useState, type ReactNode } from 'react';

interface Props {
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  /** Optional highlight over the changed area, in 0..1 coordinates. */
  box?: { x: number; y: number; w: number; h: number } | null;
  /** 4 / 3 by default. */
  ratio?: string;
}

/**
 * Drag-to-compare slider: the move-out photo is revealed over the move-in
 * photo. Works with a mouse, touch and the keyboard (it's a range input).
 */
export function BeforeAfter({ before, after, beforeLabel = 'Move-in', afterLabel = 'Move-out', box, ratio }: Props) {
  // Open where the finding is, not at the midpoint. The move-out layer is
  // revealed rightward from the slider, so a box sitting right of centre stays
  // hidden behind the move-in photo; the report would announce new damage and
  // then show you the wall before it happened. Sit just left of the box so the
  // whole of it is revealed, while keeping some move-in visible for context.
  const [position, setPosition] = useState(() =>
    box ? Math.min(Math.max(box.x * 100 - 6, 0), 55) : 50,
  );
  const id = useId();

  return (
    <figure className="ba" style={{ ['--ba-pos' as string]: `${position}%`, aspectRatio: ratio ?? '4 / 3' }}>
      <div className="ba-layer">{before}</div>
      <div className="ba-layer ba-after">
        {after}
        {/* Inside the revealed layer, so the highlight only marks the "after" photo. */}
        {box && (
          <span
            className="ba-box"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
            }}
          />
        )}
      </div>
      <span className="ba-tag ba-tag-left">{beforeLabel}</span>
      <span className="ba-tag ba-tag-right">{afterLabel}</span>
      <span className="ba-handle" aria-hidden>
        <span className="ba-grip">⇄</span>
      </span>
      <label className="sr-only" htmlFor={id}>
        Reveal the {afterLabel.toLowerCase()} photo
      </label>
      <input
        id={id}
        className="ba-range"
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
      />
    </figure>
  );
}
