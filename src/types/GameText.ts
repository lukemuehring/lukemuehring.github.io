import { FONT_COLOR_DARK_MODE, FONT_COLOR_LIGHT_MODE } from "../lib/constants";
import { getCanvasFontString } from "../lib/helpers";

export class GameText {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isVisible: boolean;
  canShowText: React.RefObject<boolean>;

  constructor(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    canShowText: React.RefObject<boolean>
  ) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.fontSize = fontSize;
    this.isVisible = true;
    this.canShowText = canShowText;
  }

  draw(
    context: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    darkMode: boolean
  ) {
    if (!this.isVisible || !this.canShowText.current) return;
    context.save();
    context.fillStyle = darkMode ? FONT_COLOR_DARK_MODE : FONT_COLOR_LIGHT_MODE;
    context.font = getCanvasFontString(this.fontSize);
    const textWidth = context.measureText(this.text).width;
    context.fillText(
      this.text,
      this.x - cameraX - textWidth / 2,
      this.y - cameraY
    );
    context.restore();
  }
}
