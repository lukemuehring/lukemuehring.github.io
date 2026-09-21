import { useCallback, useEffect, useRef, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import "./Nav.css";
import { useTheme } from "../../context/ThemeContext";
import type { Controller } from "../../types/Controller";
import type { Player } from "../../types/Player";

/**
 * Each link walks the character to a spot in the game world instead of routing away.
 * Targets are fractions of the walkable floor rather than absolute coordinates, so they
 * stay on solid ground when the floor is widened (see Controller.targetForFraction).
 *
 * Must stay in ascending target order - the underline interpolates across them.
 */
const NAV_ITEMS = [
  { label: "BLOG", target: 0.15 },
  { label: "PROJECTS", target: 0.45 },
  { label: "ABOUT", target: 0.75 },
] as const;

/**
 * How close the character has to be to a target for that item to light up. Being between
 * two spots highlights neither - the red means "you are here", not "you are nearest
 * here". Targets sit 3000px apart today, so these windows never overlap.
 */
const HIGHLIGHT_RADIUS_PX = 400;

/** Where a button sits inside the menu, in px relative to the menu box. */
type Box = { left: number; width: number };

/** An in-flight nav walk: where the bar and character both started, and where they're headed. */
type Walk = { index: number; box: Box; x: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpBox = (a: Box, b: Box, t: number): Box => ({
  left: lerp(a.left, b.left, t),
  width: lerp(a.width, b.width, t),
});

/**
 * Where the bar sits for a character standing at world x: blended between the two items
 * they're between, pinned to the ends outside that range. Used whenever no nav walk is
 * running, which is what makes the bar track arrow-key walking.
 */
function boxForWorldX(boxes: Box[], worlds: number[], x: number): Box {
  if (x <= worlds[0]) return boxes[0];
  if (x >= worlds[worlds.length - 1]) return boxes[boxes.length - 1];
  let i = 0;
  while (i < worlds.length - 2 && x > worlds[i + 1]) i++;
  const span = worlds[i + 1] - worlds[i];
  return lerpBox(boxes[i], boxes[i + 1], span === 0 ? 0 : (x - worlds[i]) / span);
}

/** Index of the item the character is standing at, or null if they're between spots. */
function itemAt(worlds: number[], x: number): number | null {
  let best: number | null = null;
  let bestDistance = HIGHLIGHT_RADIUS_PX;
  worlds.forEach((world, i) => {
    const distance = Math.abs(x - world);
    if (distance <= bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

type NavProps = {
  IsNavMenuOpenRef?: React.RefObject<boolean>;
  onRefChange?: () => void;
  PlayerRef?: React.RefObject<Player | null>;
  ControllerRef?: React.RefObject<Controller | null>;
};

export default function Nav({
  IsNavMenuOpenRef,
  onRefChange,
  PlayerRef,
  ControllerRef,
}: NavProps) {
  const [isActive, setIsActive] = useState(false);
  const { darkMode, toggle } = useTheme();

  const menuRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const underlineRef = useRef<SVGSVGElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  /** Button boxes, cached so the per-frame loop never forces a layout. */
  const boxesRef = useRef<Box[] | null>(null);
  const walkRef = useRef<Walk | null>(null);
  /** Last box the bar was drawn at, so the next walk can start from it. */
  const currentBoxRef = useRef<Box | null>(null);
  /** Which item is lit up, or null when the character is between spots. */
  const highlightRef = useRef<number | null>(null);
  /** The bar stays hidden until the nav is first used or the character reaches a spot. */
  const engagedRef = useRef(false);

  const worldTargets = useCallback((): number[] | null => {
    const controller = ControllerRef?.current;
    if (!controller) return null;
    return NAV_ITEMS.map((item) => controller.targetForFraction(item.target));
  }, [ControllerRef]);

  const onClose = () => {
    setIsActive(false);
    if (IsNavMenuOpenRef) IsNavMenuOpenRef.current = false;
    if (onRefChange) onRefChange();
  };

  const handleMenuToggle = () => {
    setIsActive((prev) => {
      const newState = !prev;
      if (IsNavMenuOpenRef) IsNavMenuOpenRef.current = newState; // update IsNavMenuOpenRef so we can derive IsUserInputAllowedRef in App.tsx
      if (onRefChange) onRefChange(); // update App.tsx IsUserInputAllowedRef to block user input if nav menu is open.
      return newState;
    });
  };

  // Listen for ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const measureBoxes = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const m = menu.getBoundingClientRect();
    const boxes = NAV_ITEMS.map((_, i) => {
      const btn = btnRefs.current[i];
      if (!btn) return null;
      const b = btn.getBoundingClientRect();
      return { left: b.left - m.left, width: b.width };
    });
    boxesRef.current = boxes.every(Boolean) ? (boxes as Box[]) : null;

    // A stored walk origin is in the old coordinate space, so rebase it or the bar jumps.
    const walk = walkRef.current;
    const worlds = worldTargets();
    if (walk && worlds && boxesRef.current) {
      walk.box = boxForWorldX(boxesRef.current, worlds, walk.x);
    }
  }, [worldTargets]);

  /**
   * Runs every frame. Two jobs:
   *
   *  - Light up whichever item the character is standing at.
   *  - Place the bar. During a nav walk that is a straight blend from where the bar
   *    started to the destination button, so the bar and the character report the exact
   *    same progress. Otherwise it is derived from the character's position, which is
   *    what lets arrow-key walking move the bar too.
   *
   * Those two mappings disagree by a few percent mid-walk (the buttons are not spaced in
   * proportion to their world targets), which is why the walk gets its own.
   */
  const sync = useCallback(() => {
    const svg = underlineRef.current;
    const rect = rectRef.current;
    const boxes = boxesRef.current;
    const player = PlayerRef?.current;
    const controller = ControllerRef?.current;
    const worlds = worldTargets();
    if (!svg || !rect || !boxes) return;

    if (player && worlds) {
      const at = itemAt(worlds, player.x);
      highlightRef.current = at;
      if (at !== null) engagedRef.current = true;

      // Applied every frame rather than on change: any re-render (dark mode, opening the
      // menu) rewrites className from the JSX below, which would otherwise drop it.
      // classList.toggle with an explicit force is a no-op when already correct.
      NAV_ITEMS.forEach((_, i) => {
        const btn = btnRefs.current[i];
        if (!btn) return;
        btn.classList.toggle("selected", i === at);
        if (i === at) btn.setAttribute("aria-current", "true");
        else btn.removeAttribute("aria-current");
      });
    }

    // Walked off the end of the floor. MyCanvas drops the character and respawns them a
    // second later, so reset the nav to its first-load state rather than leaving the bar
    // parked at wherever they fell off.
    if (player && controller && player.y > controller.floor.height) {
      engagedRef.current = false;
      walkRef.current = null;
      currentBoxRef.current = null;
    }

    if (!engagedRef.current) {
      svg.style.width = "0px";
      rect.setAttribute("width", "0");
      return;
    }

    const walk = walkRef.current;
    let box: Box;

    if (walk && player && worlds && controller && controller.autoWalkTargetX !== null) {
      const span = worlds[walk.index] - walk.x;
      const progress =
        span === 0 ? 1 : Math.min(1, Math.max(0, (player.x - walk.x) / span));
      box = lerpBox(walk.box, boxes[walk.index], progress);
    } else if (player && worlds) {
      walkRef.current = null;
      box = boxForWorldX(boxes, worlds, player.x);
    } else {
      box = currentBoxRef.current ?? boxes[0];
    }

    currentBoxRef.current = box;
    svg.style.left = `${box.left}px`;
    svg.style.width = `${box.width}px`;
    rect.setAttribute("width", String(box.width));
  }, [PlayerRef, ControllerRef, worldTargets]);

  // The boxes are measured from live DOM geometry, so they go stale whenever the buttons
  // move: window resizes and, more subtly, the web font landing after first paint.
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const remeasure = () => {
      measureBoxes();
      sync();
    };
    remeasure();

    const observer = new ResizeObserver(remeasure);
    observer.observe(menu);

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) remeasure();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [measureBoxes, sync]);

  useEffect(() => {
    let frame = requestAnimationFrame(function tick() {
      sync();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [sync]);

  const handleWalkTo = (index: number) => {
    const boxes = boxesRef.current;
    const player = PlayerRef?.current;
    const worlds = worldTargets();

    // Anchor the bar where it is now and the character where they are now; everything
    // between here and arrival is a blend of those two against the destination.
    if (boxes && player && worlds) {
      walkRef.current = {
        index,
        box: currentBoxRef.current ?? boxForWorldX(boxes, worlds, player.x),
        x: player.x,
      };
    }
    engagedRef.current = true;

    // Close first: onClose flips IsNavMenuOpenRef, which lets App re-enable game input
    // before the next frame, so the walk survives the Controller's first gate check.
    onClose();
    ControllerRef?.current?.walkToFraction(NAV_ITEMS[index].target);
  };

  const handleToggleNightMode = () => {
    toggle();
    onClose();
  };

  return (
    <nav id="nav" className={darkMode ? "dark" : ""}>
      {/* hamburger menu icon btn */}
      <button
        className={`ham-menu ${isActive ? "active" : ""} ${darkMode ? "dark" : ""}`}
        onClick={handleMenuToggle}
        aria-label="Toggle menu"
        aria-expanded={isActive}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* menu options */}
      <div
        className={`menu-container ${isActive ? "active" : ""} ${darkMode ? "dark" : ""}`}
      >
        <div className="menu" ref={menuRef}>
          {NAV_ITEMS.map((item, index) => (
            <button
              key={item.label}
              ref={(el) => {
                btnRefs.current[index] = el;
              }}
              className="nav-btn"
              onClick={() => handleWalkTo(index)}
            >
              {item.label}
            </button>
          ))}

          <button
            className="nav-btn nav-btn--icon"
            onClick={handleToggleNightMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>

          <svg
            ref={underlineRef}
            className="nav-underline"
            height={2}
            aria-hidden="true"
          >
            <rect ref={rectRef} x={0} y={0} width={0} height={2} rx={1} />
          </svg>
        </div>
      </div>
    </nav>
  );
}
