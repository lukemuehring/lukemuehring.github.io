import { createContext } from "react";

/** What an AdventureSection gets from the AdventureList around it. */
export interface AdventureListValue {
  /** Whether the section with this id is open. */
  isOpen: (id: string) => boolean;
  /** Opens or closes a section. Opening one hands it the arrow keys. */
  setOpen: (id: string, isOpen: boolean) => void;
  /** Hands an open section the arrow keys, as a click in its panel does. */
  claimArrowKeys: (id: string) => void;
  /**
   * Adds a section to the list, in page order, with the function its arrow buttons
   * call, which the arrow keys call too.
   * @returns The section's removal, for when it unmounts.
   */
  register: (id: string, scrollStrip: (direction: number) => void) => () => void;
}

/** Shares the list's open sections and arrow keys with each AdventureSection. */
export const AdventureListContext = createContext<AdventureListValue | null>(null);

/**
 * How long a step between cards takes. The browser's own smooth scroll takes about
 * twice this and can't be set, so the strip runs its own tween.
 */
const CARD_STEP_DURATION_MS = 300;

/** Strips mid-step, with the scrollLeft each is heading for and its next frame. */
const stripSteps = new Map<HTMLElement, { target: number; frame: number }>();

/**
 * Tweens a strip's scrollLeft to a target, easing out so it starts quickly and settles.
 * A new step replaces any still running on the same strip.
 * @param strip - The strip to scroll.
 * @param target - The scrollLeft to end on, already clamped to the strip's range.
 */
function tweenStripTo(strip: HTMLElement, target: number) {
  const runningStep = stripSteps.get(strip);
  if (runningStep) cancelAnimationFrame(runningStep.frame);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stripSteps.delete(strip);
    strip.scrollLeft = target;
    return;
  }

  const start = strip.scrollLeft;
  let startTime: number | null = null;
  const step = (time: number) => {
    startTime ??= time;
    const progress = Math.min((time - startTime) / CARD_STEP_DURATION_MS, 1);
    strip.scrollLeft = start + (target - start) * (1 - (1 - progress) ** 3);
    if (progress < 1) {
      stripSteps.set(strip, { target, frame: requestAnimationFrame(step) });
    } else {
      stripSteps.delete(strip);
    }
  };
  stripSteps.set(strip, { target, frame: requestAnimationFrame(step) });
}

/**
 * Scrolls a section's strip to its next or previous card.
 * @param strip - The strip to scroll. It must be positioned, so its cards' offsetLeft
 *   is measured from it.
 * @param direction - 1 for onwards, -1 for back.
 */
export function scrollStripByCard(strip: HTMLElement, direction: number) {
  // Mid-step, the next card counts from where the strip is heading, so quick presses
  // each move a card rather than landing on the same one twice.
  const from = stripSteps.get(strip)?.target ?? strip.scrollLeft;
  const cardStarts = Array.from(strip.children, (child) => (child as HTMLElement).offsetLeft);
  const nextStart =
    direction > 0
      ? cardStarts.find((cardStart) => cardStart > from + 1)
      : cardStarts.filter((cardStart) => cardStart < from - 1).pop();
  const maxLeft = strip.scrollWidth - strip.clientWidth;
  const target = Math.min(Math.max(nextStart ?? (direction > 0 ? maxLeft : 0), 0), maxLeft);
  tweenStripTo(strip, target);
}
