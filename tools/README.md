# tools

## compose-room-photos.py

Builds the landing page's move-in / move-out demo pair.

```bash
python3 tools/compose-room-photos.py   # needs Pillow
```

Reads `public/rooms/source-room.jpg` and writes `living-movein.jpg` and
`living-moveout.jpg` beside it.

### Why the move-out frame is composited

No stock library has a genuine matched move-in / move-out pair; that absence
is the gap DepositGuard exists to fill. So the move-out frame is built from the
same photograph, following the product's own semantics rather than being
decorative:

- the **hairline crack** appears in *both* frames at the same position, because
  it is the "already there at move-in" finding and therefore has to actually be
  there;
- the **water stain** appears only at move-out; that is the new damage;
- **skirting scuff** is faint at move-in and heavier at move-out;
- the two frames carry **slightly different exposure and white balance**, so
  "ignores changes that are only lighting" is a claim the demo exercises rather
  than asserts.

The detection-box coordinates in `CompareDemo.tsx` and `HowItWorks.tsx` are
percentages measured against the 1280×960 output. **If you change the geometry
here, re-measure them.**

### Photo credit

`source-room.jpg`; empty interior, [Unsplash](https://unsplash.com/photos/an-empty-room-with-white-walls-and-wood-floors-1692133220749).
Used under the [Unsplash Licence](https://unsplash.com/license): free to use,
no permission or attribution required. Credited here as a courtesy and so the
provenance is recorded.

To use your own photographs instead, replace `source-room.jpg` and re-run the
script, or drop in your own `living-movein.jpg` / `living-moveout.jpg` and
skip it entirely.
