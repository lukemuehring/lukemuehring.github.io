import { useEffect, useMemo, useState } from "react";
import "./CheckerWipe.css";

/** Edge length of one square, in px. */
const CELL_PX = 56;
/** How long a single square takes to fill in. Must match --cell-ms in the stylesheet. */
const CELL_FILL_MS = 160;
/** Beat between the screen being covered and it starting to uncover. */
const HOLD_MS = 100;
/**
 * The uncover pass runs at this fraction of the cover pass - same delays, less time.
 * Coming back is the part nobody is waiting for, so it gets out of the way faster.
 */
const OUT_SCALE = 0.7;
/**
 * Ease-in on the wave: how far it has spread goes with time to this power, so it creeps
 * off the start and then accelerates. 1 is a constant speed; higher is a slower start
 * and a faster finish, in the same total time.
 */
const EASE_IN_POWER = 2;

type CheckerWipeProps = {
  /** Length of the cover pass; onCovered fires exactly at the end of it. */
  coverDuration?: number;
  /**
   * Run both passes from the edges in instead of the middle out - the way back undoing
   * the way there.
   */
  reverse?: boolean;
  /** Screen is fully covered - swap whatever is underneath now. */
  onCovered: () => void;
  /** The uncover pass has finished and the overlay can be unmounted. */
  onDone: () => void;
};

export default function CheckerWipe({
  coverDuration = 600,
  reverse = false,
  onCovered,
  onDone,
}: CheckerWipeProps) {
  const [covered, setCovered] = useState(false);

  // Measured once: the wipe lives for about a second, and the cells are fr-sized, so
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
    const lastStep = lastRing + 0.5;
    // The last square starts this long in, leaving it just enough time to fill.
    const spreadMs = Math.max(0, coverDuration - CELL_FILL_MS);

    const steps: Array<number> = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ring = Math.max(
          Math.abs(col - centerCol),
          Math.abs(row - centerRow),
        );
        // Every other square in a ring lags half a step, which is what makes the
        // leading edge read as a checkerboard instead of a solid expanding square.
        const checker = (col + row) % 2 === 0 ? 0 : 0.5;
        steps.push((reverse ? lastRing - ring : ring) + checker);
      }
    }

    // Measured from the first square to go rather than from 0: on an even grid the
    // middle squares sit half a ring out, and the ease would stretch that into a beat of
    // nothing right after the click.
    const firstStep = Math.min(...steps);
    // The ease run backwards: spread = time^power, so the time the wave reaches a square
    // is its share of the distance to the 1/power.
    const delays = steps.map(
      (step) =>
        ((step - firstStep) / (lastStep - firstStep)) ** (1 / EASE_IN_POWER) *
        spreadMs,
    );

    return { cols, rows, delays };
  }, [coverDuration, reverse]);

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        onCovered();
      }, coverDuration),
      setTimeout(() => {
        setCovered(true);
      }, coverDuration + HOLD_MS),
    ];

    return () => timers.forEach(clearTimeout);
    // Mounted for one transition and then thrown away, so the callbacks it was born
    // with are the right ones for its whole life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timed from when the uncover pass actually starts rather than from mount. Building
  // the page under the sheet can hold the main thread past the uncover's scheduled
  // start - on a phone, mounting the canvas page does - and a finish fixed to mount
  // then cut the pass short, so the squares still showing vanished all at once.
  useEffect(() => {
    if (!covered) return;
    const timer = setTimeout(() => {
      onDone();
    }, coverDuration * OUT_SCALE);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [covered]);

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
