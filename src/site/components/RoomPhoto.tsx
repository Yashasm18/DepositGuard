/**
 * The move-in / move-out demo pair.
 *
 * These are one stock photograph of an empty rented room (Unsplash licence,
 * no attribution required), with the move-out frame composited from the same
 * source, see tools/compose-room-photos.py. No stock library has a genuine
 * matched pair, which is precisely the gap the product exists to fill.
 *
 * The compositing follows the product's own semantics rather than being
 * decorative: the hairline crack is present in BOTH frames at the same
 * position, because it is the "already there at move-in" finding and has to
 * actually be there; the water stain appears only at move-out; and the two
 * frames carry slightly different exposure, so the claim that lighting-only
 * changes are ignored is one the demo exercises rather than asserts.
 */
const PHOTOS = {
  movein: {
    src: "/rooms/living-movein.jpg",
    alt: "Empty rented room photographed at move-in: a plain wall with a hairline crack to the left of the window.",
  },
  moveout: {
    src: "/rooms/living-moveout.jpg",
    alt: "The same room at move-out: the same hairline crack, plus water staining spreading up the wall from the skirting.",
  },
} as const;

export default function RoomPhoto({
  stage = "movein",
  className = "",
  priority = false,
}: {
  stage?: "movein" | "moveout";
  className?: string;
  /** The first frame a visitor sees should not be lazy-loaded. */
  priority?: boolean;
}) {
  const photo = PHOTOS[stage];
  return (
    <img
      src={photo.src}
      alt={photo.alt}
      width={1280}
      height={960}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={`object-cover ${className}`}
    />
  );
}
