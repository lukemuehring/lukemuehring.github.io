import { NAV_TARGETS } from "./constants";
import type { Controller } from "../types/Controller";

/**
 * Each nav link walks the character to a spot in the game world instead of routing away.
 * Targets are fractions of the walkable floor rather than absolute coordinates, so they
 * stay on solid ground when the floor is widened (see Controller.targetForFraction).
 *
 * Must stay in ascending target order - the nav underline interpolates across them.
 *
 * `offsetX` is world px past the fraction point, for a spot whose content is anchored
 * at the fraction but where the character should stand a step further in.
 *
 * This lives in lib rather than in Nav.tsx because the world setup needs it too, and a
 * lib reaching back into a React component to find out where things go is backwards:
 * it drags the whole component tree in behind it.
 */
export const NAV_ITEMS = [
  { label: "BLOG", target: NAV_TARGETS.BLOG, offsetX: 0 },
  { label: "PROJECTS", target: NAV_TARGETS.PROJECTS, offsetX: 0 },
  { label: "ABOUT", target: NAV_TARGETS.ABOUT, offsetX: 60 },
] as const;

/** A nav destination resolved to an absolute world x. */
export type WorldTarget = { label: string; target: number };

/**
 * Every nav destination as a world x, or null before the Controller exists.
 *
 * Resolved on demand rather than cached: targetForFraction reads Floor.rightX, which the
 * world setup sizes to fit its content, so these are only meaningful once the floor is
 * final (see setupAboutMe).
 */
export function getWorldTargets(
  controller: Controller | null | undefined,
): WorldTarget[] | null {
  if (!controller) return null;
  return NAV_ITEMS.map((item) => ({
    label: item.label,
    target: controller.targetForFraction(item.target) + item.offsetX,
  }));
}
