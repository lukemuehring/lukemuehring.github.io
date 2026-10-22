import { FONT_COLOR_DARK_MODE, FONT_COLOR_LIGHT_MODE } from "../lib/constants";
import { getCanvasFontString } from "../lib/helpers";
import { sheenGradient } from "./GameText";

const LABEL_FONT_SIZE = 34;
/** Slack around the label's text, which is otherwise a small thing to land a click on. */
const LABEL_HIT_PADDING = 8;
/** One sweep of the label's sheen - the welcome word's sheenDuration. */
const SHEEN_DURATION_MS = 550;
/** Beat between sweeps while the cursor stays on the label, so it glints, not strobes. */
const SHEEN_REST_MS = 350;

/** Draws spent on each active frame while flickering - about a third of a second at 60fps. */
const FLICKER_FRAME_TICKS = 20;

interface MarkerOptions {
  /** World x of the sprite's anchor - its centre, unless anchorX says otherwise. */
  x: number;
  image: HTMLImageElement;
  width: number;
  height: number;
  /**
   * How far in from the sprite's left edge `x` lands. Defaults to the centre; worth
   * moving when the spot the nav parks the character on isn't the middle of the art.
   */
  anchorX?: number;
  /**
   * Drawn instead of `image` while the marker is active - the character within reach, or
   * the cursor on it. The first frame holds while the character is just nearby; all of
   * them cycle while hovered, and for good once it has been clicked.
   */
  activeFrames?: Array<HTMLImageElement>;
  /** How far past either edge of the sprite the character still counts as nearby. */
  reach?: number;
  /** Drawn above the sprite while active, so the spot says what it is. */
  label?: string;
  /**
   * Distance from the sprite's top edge up to the label's baseline. Worth setting past
   * the obvious few px wherever the character can end up standing on the marker, since
   * they are drawn over it.
   */
  labelOffsetY?: number;
  onClick: () => void;
}

/**
 * A sprite standing on the floor that can be clicked - the world's version of a link.
 *
 * Button is the other clickable thing out here, but it sizes itself from text and draws
 * its own white box, so it can only ever look like a white box. A Marker is just an
 * image with a hit box, so a spot can be marked with whatever pixel art suits it.
 *
 * `x` is the world coordinate of a point on the sprite rather than its left edge, because
 * these are positioned against nav targets, which are points.
 */
export class Marker {
  x: number;
  /** y of the sprite's top edge. Set by standOn, not by the caller. */
  y = 0;
  width: number;
  height: number;
  anchorX: number;
  image: HTMLImageElement;
  activeFrames: Array<HTMLImageElement>;
  reach: number;
  label: string;
  labelOffsetY: number;
  onClick: () => void;
  hover = false;
  near = false;
  /**
   * Latched by click, never cleared: the route wipe that follows cuts input, which drops
   * hover, and the cursor is free to wander off besides - neither should stop the flicker
   * the click started. Leaving the page unmounts the marker, which is the reset.
   */
  isClicked = false;
  /**
   * Counted per draw rather than read off the shared frame count, so a fresh flicker
   * always opens on the first active frame instead of wherever the cycle happened to be.
   */
  private flickerTicks = 0;
  /**
   * The label's width as last measured. Kept up while the label is hidden too, so
   * pointing at where it would be is enough to bring it up.
   */
  private labelWidth = 0;
  /** The cursor is on the label itself, not just somewhere in the hit box. */
  private isOverLabel = false;
  /** When the running sheen sweep began, or null between sweeps. */
  private sheenStartTime: number | null = null;

  constructor({
    x,
    image,
    width,
    height,
    anchorX = width / 2,
    activeFrames = [],
    reach = 100,
    label = "",
    labelOffsetY = 14,
    onClick,
  }: MarkerOptions) {
    this.x = x;
    this.image = image;
    this.width = width;
    this.height = height;
    this.anchorX = anchorX;
    this.activeFrames = activeFrames;
    this.reach = reach;
    this.label = label;
    this.labelOffsetY = labelOffsetY;
    this.onClick = onClick;
  }

  /** World x of the sprite's left edge. */
  private get left(): number {
    return this.x - this.anchorX;
  }

  click() {
    this.isClicked = true;
    this.onClick();
  }

  /** Parks the sprite on top of the floor. */
  standOn(floorHeight: number) {
    this.y = floorHeight - this.height;
  }

  /**
   * Hit-tests one box running from the top of the label's spot, shown or not, down to
   * the foot of the sprite, as wide as the wider of the two - so the gap between them
   * counts as well. Takes screen coordinates for the mouse and world for the sprite,
   * which is why cameraX has to come along.
   */
  detectMouseHover(mouseX: number, mouseY: number, cameraX: number): boolean {
    const left = this.left - cameraX;
    const labelLeft =
      left + this.width / 2 - this.labelWidth / 2 - LABEL_HIT_PADDING;
    const labelRight = labelLeft + this.labelWidth + 2 * LABEL_HIT_PADDING;
    const labelTop =
      this.y - this.labelOffsetY - LABEL_FONT_SIZE - LABEL_HIT_PADDING;
    const labelBottom = this.y - this.labelOffsetY + LABEL_HIT_PADDING;

    this.isOverLabel =
      this.labelWidth > 0 &&
      mouseX >= labelLeft &&
      mouseX <= labelRight &&
      mouseY >= labelTop &&
      mouseY <= labelBottom;
    this.hover =
      mouseX >= Math.min(left, labelLeft) &&
      mouseX <= Math.max(left + this.width, labelRight) &&
      mouseY >= (this.labelWidth > 0 ? labelTop : this.y) &&
      mouseY <= this.y + this.height;
    return this.hover;
  }

  /** Takes the character's world x, which is the middle of their sprite. */
  detectPlayerNear(playerX: number): boolean {
    this.near =
      playerX >= this.left - this.reach &&
      playerX <= this.left + this.width + this.reach;
    return this.near;
  }

  draw(
    context: CanvasRenderingContext2D,
    cameraX: number,
    darkMode: boolean,
  ): void {
    const isFlickering = this.hover || this.isClicked;
    const isActive = this.near || isFlickering;
    this.flickerTicks = isFlickering ? this.flickerTicks + 1 : 0;

    const image =
      isActive && this.activeFrames.length > 0
        ? this.activeFrames[
            Math.floor(this.flickerTicks / FLICKER_FRAME_TICKS) %
              this.activeFrames.length
          ]
        : this.image;
    const left = Math.floor(this.left - cameraX);
    context.drawImage(image, left, Math.floor(this.y));

    if (!this.label) return;

    context.save();
    context.font = getCanvasFontString(LABEL_FONT_SIZE);
    this.labelWidth = context.measureText(this.label).width;
    if (isActive) {
      const now = Date.now();
      // A sweep that has started always runs out, so leaving mid-pass doesn't snap it
      // off. The next waits out the rest, then goes only if the cursor is still on the
      // label - read through hover, which MyCanvas clears whenever input is cut.
      if (
        this.sheenStartTime !== null &&
        now - this.sheenStartTime >= SHEEN_DURATION_MS + SHEEN_REST_MS
      ) {
        this.sheenStartTime = null;
      }
      if (this.sheenStartTime === null && this.hover && this.isOverLabel) {
        this.sheenStartTime = now;
      }
      const sheenProgress =
        this.sheenStartTime === null
          ? 1
          : (now - this.sheenStartTime) / SHEEN_DURATION_MS;

      const baseColor = darkMode ? FONT_COLOR_DARK_MODE : FONT_COLOR_LIGHT_MODE;
      const labelX = Math.floor(left + this.width / 2);
      const labelY = Math.floor(this.y - this.labelOffsetY);
      context.fillStyle =
        sheenProgress < 1
          ? sheenGradient(
              context,
              labelX - this.labelWidth / 2,
              labelY,
              this.labelWidth,
              LABEL_FONT_SIZE,
              baseColor,
              darkMode,
              sheenProgress,
            )
          : baseColor;
      context.textAlign = "center";
      context.fillText(this.label, labelX, labelY);
    }
    context.restore();
  }
}
