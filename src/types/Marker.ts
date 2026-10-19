import { FONT_COLOR_DARK_MODE, FONT_COLOR_LIGHT_MODE } from "../lib/constants";
import { getCanvasFontString } from "../lib/helpers";

const LABEL_FONT_SIZE = 28;

type MarkerOptions = {
  /** World x of the sprite's centre. */
  x: number;
  image: HTMLImageElement;
  width: number;
  height: number;
  /** Drawn above the sprite while hovered, so the spot says what it is. */
  label?: string;
  /**
   * Distance from the sprite's top edge up to the label's baseline. Worth setting past
   * the obvious few px wherever the character can end up standing on the marker, since
   * they are drawn over it.
   */
  labelOffsetY?: number;
  onClick: () => void;
};

/**
 * A sprite standing on the floor that can be clicked - the world's version of a link.
 *
 * Button is the other clickable thing out here, but it sizes itself from text and draws
 * its own white box, so it can only ever look like a white box. A Marker is just an
 * image with a hit box, so a spot can be marked with whatever pixel art suits it.
 *
 * `x` is the world coordinate of the sprite's centre rather than its left edge, because
 * these are positioned against nav targets, which are points.
 */
export class Marker {
  x: number;
  /** y of the sprite's top edge. Set by standOn, not by the caller. */
  y = 0;
  width: number;
  height: number;
  image: HTMLImageElement;
  label: string;
  labelOffsetY: number;
  onClick: () => void;
  hover = false;

  constructor({
    x,
    image,
    width,
    height,
    label = "",
    labelOffsetY = 14,
    onClick,
  }: MarkerOptions) {
    this.x = x;
    this.image = image;
    this.width = width;
    this.height = height;
    this.label = label;
    this.labelOffsetY = labelOffsetY;
    this.onClick = onClick;
  }

  /** Parks the sprite on top of the floor. */
  standOn(floorHeight: number) {
    this.y = floorHeight - this.height;
  }

  /**
   * Hit-tests the drawn rect. Takes screen coordinates for the mouse and world for the
   * sprite, which is why cameraX has to come along.
   */
  detectMouseHover(mouseX: number, mouseY: number, cameraX: number): boolean {
    const left = this.x - this.width / 2 - cameraX;
    this.hover =
      mouseX >= left &&
      mouseX <= left + this.width &&
      mouseY >= this.y &&
      mouseY <= this.y + this.height;
    return this.hover;
  }

  draw(
    context: CanvasRenderingContext2D,
    cameraX: number,
    darkMode: boolean,
  ): void {
    const left = Math.floor(this.x - this.width / 2 - cameraX);
    context.drawImage(this.image, left, Math.floor(this.y));

    if (!this.hover || !this.label) return;

    context.save();
    context.font = getCanvasFontString(LABEL_FONT_SIZE);
    context.fillStyle = darkMode ? FONT_COLOR_DARK_MODE : FONT_COLOR_LIGHT_MODE;
    context.textAlign = "center";
    context.fillText(
      this.label,
      Math.floor(left + this.width / 2),
      Math.floor(this.y - this.labelOffsetY),
    );
    context.restore();
  }
}
