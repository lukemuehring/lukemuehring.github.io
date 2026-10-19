import { useEffect, useMemo, useState } from "react";
import "./CheckerWipe.css";

/** Edge length of one square, in px. */
const CELL_PX = 56;
/** How long a single square takes to fill in. Must match --cell-ms in the stylesheet. */
const CELL_FILL_MS = 220;
/** Beat between the screen being covered and it starting to uncover. */
const HOLD_MS = 140;
/**
 * The uncover pass runs at this fraction of the cover pass - same delays, less time.
 * Coming back is the part nobody is waiting for, so it gets out of the way faster.
 */
const OUT_SCALE = 0.7;

type CheckerWipeProps = {
  /** Length of the cover pass; onCovered fires exactly at the end of it. */
  coverDuration?: number;
  /** Screen is fully covered - swap whatever is underneath now. */
  onCovered: () => void;
  /** The uncover pass has finished and the overlay can be unmounted. */
  onDone: () => void;
};

export default function CheckerWipe({
  coverDuration = 1000,
  onCovered,
  onDone,
}: CheckerWipeProps) {
  const [covered, setCovered] = useState(false);

  // Measured once: the wipe lives for about two seconds, and the cells are fr-sized, so
  // a resize mid-wipe stretches the grid rather than needing it rebuilt.
  const grid = useMemo(() => {
    const cols = Math.max(1, Math.ceil(window.innerWidth / CELL_PX));
    const rows = Math.max(1, Math.ceil(window.innerHeight / CELL_PX));
    const centerCol = (cols - 1) / 2;
    const centerRow = (rows - 1) / 2;

    // Chebyshev distance, so the fill spreads as squares rather than as a circle - it
    // reads as a grid growing, which is what the tiles underneath look like.
    const lastRing = Math.max(centerCol, centerRow);
    // The +0.5 is the checker offset below: without it the half-step laggards in the
    // outermost ring would still be filling after coverDuration had elapsed.
    const ringMs = Math.max(0, (coverDuration - CELL_FILL_MS) / (lastRing + 0.5));

    const delays: number[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ring = Math.max(
          Math.abs(col - centerCol),
          Math.abs(row - centerRow),
        );
        // Every other square in a ring lags half a step, which is what makes the
        // leading edge read as a checkerboard instead of a solid expanding square.
        const checker = (col + row) % 2 === 0 ? 0 : 0.5;
        delays.push((ring + checker) * ringMs);
      }
    }

    return { cols, rows, delays };
  }, [coverDuration]);

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        onCovered();
      }, coverDuration),
      setTimeout(() => {
        setCovered(true);
      }, coverDuration + HOLD_MS),
      setTimeout(
        () => {
          onDone();
        },
        coverDuration + HOLD_MS + coverDuration * OUT_SCALE,
      ),
    ];

    return () => timers.forEach(clearTimeout);
    // Mounted for one transition and then thrown away, so the callbacks it was born
    // with are the right ones for its whole life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`checker-wipe ${covered ? "checker-wipe--out" : ""}`}
      style={
        {
          gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
          gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
          "--cell-ms": `${CELL_FILL_MS}ms`,
          "--checker-scale": covered ? OUT_SCALE : 1,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {grid.delays.map((delay, i) => (
        <span
          key={i}
          className="checker-wipe__cell"
          style={{ "--d": `${delay}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
