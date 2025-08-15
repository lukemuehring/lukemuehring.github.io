import { getCanvasFontString } from "../lib/helpers";

export class GameText {
  words: string;
  x: number;
  y: number;
  fontSize: number;
  isVisible: boolean;
  canShowText: React.RefObject<boolean>;

  constructor(
    words: string,
    x: number,
    y: number,
    fontSize: number,
    canShowText: React.RefObject<boolean>
  ) {
    this.words = words;
    this.x = x;
    this.y = y;
    this.fontSize = fontSize;
    this.isVisible = true;
    this.canShowText = canShowText;
  }

  draw(context: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.isVisible || !this.canShowText.current) return;
    context.save();
    context.font = getCanvasFontString(this.fontSize);
    const textWidth = context.measureText(this.words).width;
    context.fillText(
      this.words,
      this.x - cameraX - textWidth / 2,
      this.y - cameraY
    );
    context.restore();
  }
}
