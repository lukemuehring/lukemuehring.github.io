import { FONT_COLOR_DARK_MODE, FONT_COLOR_LIGHT_MODE } from "../lib/constants";
import { getCanvasFontString } from "../lib/helpers";

export class GameText {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isVisible: boolean;
  canShowText: React.RefObject<boolean>;
  color?: string;
  sheen: boolean;
  sheenStartTime: number;
  sheenDuration: number;

  constructor(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    canShowText: React.RefObject<boolean>,
    options?: { color?: string; sheen?: boolean; sheenDuration?: number; sheenDelay?: number }
  ) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.fontSize = fontSize;
    this.isVisible = true;
    this.canShowText = canShowText;
    this.color = options?.color;
    this.sheen = options?.sheen ?? false;
    this.sheenStartTime = Date.now() + (options?.sheenDelay ?? 0);
    this.sheenDuration = options?.sheenDuration ?? 2000;
  }

  draw(
    context: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    darkMode: boolean
  ) {
    if (!this.isVisible || !this.canShowText.current) return;

    context.save();
    context.font = getCanvasFontString(this.fontSize);

    // Calculate text positioning
    const textWidth = context.measureText(this.text).width;
    const textX = this.x - cameraX - textWidth / 2;
    const textY = this.y - cameraY;

    // Color
    const baseColor =
      this.color ?? (darkMode ? FONT_COLOR_DARK_MODE : FONT_COLOR_LIGHT_MODE);

    // Sheen animation effect
    if (this.sheen) {
      const elapsed = (Date.now() - this.sheenStartTime) % this.sheenDuration;
      const progress = elapsed / this.sheenDuration;

      const bandWidth = 0.15; // half of the band width
      const padding = 15.0; // dead time of the animation
      const range = 1 + bandWidth * 2 + padding;
      const pos = progress * range - bandWidth; // the current center of the sheen band,


      // Only render gradient when the band is visible (overlaps 0–1 range)
      if (pos + bandWidth > 0 && pos - bandWidth < 1) {
        const gradient = context.createLinearGradient(
          textX, textY - this.fontSize, textX + textWidth, textY
        );

        const highlightColor = darkMode
          ? "rgba(255, 255, 255)"
          : "rgba(100, 100, 100)";

        const left = Math.max(0, Math.min(1, pos - bandWidth));
        const center = Math.max(0, Math.min(1, pos));
        const right = Math.max(0, Math.min(1, pos + bandWidth));

        // When center is at the edge, start/end with highlight instead of base
        gradient.addColorStop(0, center <= 0 ? highlightColor : baseColor);
        if (left > 0 && left < 1) gradient.addColorStop(left, baseColor);
        if (center > 0 && center < 1) gradient.addColorStop(center, highlightColor);
        if (right > 0 && right < 1) gradient.addColorStop(right, baseColor);
        gradient.addColorStop(1, center >= 1 ? highlightColor : baseColor);

        context.fillStyle = gradient;
      } else {
        context.fillStyle = baseColor;
      }
    } else {
      context.fillStyle = baseColor;
    }

    context.fillText(this.text, textX, textY);
    context.restore();
  }
}
