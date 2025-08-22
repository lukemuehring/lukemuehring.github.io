import {
  colors1,
  colors2,
  ElementPadding,
  FONT_HEADING,
  TextLeading,
} from "../lib/constants";
import {
  getCanvasFontString,
  getLinesOfText,
  drawWhiteBoxWithText,
  drawFlippedImage,
} from "../lib/helpers";
import { GameText } from "./GameText";
import type { Player } from "./Player";

export class TextBubble extends GameText {
  minX: number;
  maxX: number;
  maxLineWidth: number;
  player: Player;
  cornerImage: HTMLImageElement;
  triangleImage: HTMLImageElement;

  leading: number;
  elementPadding: number;
  borderColorsTopBottom: string[];
  borderColorsLeftRight: string[];

  constructor(
    text: string,
    x: number,
    y: number,
    canShowText: React.RefObject<boolean>,
    minX: number,
    maxX: number,
    maxLineWidth: number,
    player: Player,
    cornerImage: HTMLImageElement,
    triangleImage: HTMLImageElement
  ) {
    super(text, x, y, FONT_HEADING.P, canShowText);

    this.minX = minX;
    this.maxX = maxX;
    this.maxLineWidth = maxLineWidth;
    this.player = player;
    this.cornerImage = cornerImage;
    this.triangleImage = triangleImage;

    this.leading = TextLeading;
    this.elementPadding = ElementPadding;
    this.borderColorsTopBottom = colors1;
    this.borderColorsLeftRight = colors2;
  }

  draw(context: CanvasRenderingContext2D, cameraX?: number, cameraY?: number) {
    if (!this.canShowText.current) {
      return;
    }

    context.font = getCanvasFontString(this.fontSize);
    let {
      whiteBoxHeight,
      whiteBoxWidth,
      lines: linesOfTextArray,
      lineWidths: linesOfTextWidthsArray,
    } = getLinesOfText(
      context,
      this.text,
      this.fontSize,
      this.leading,
      this.maxLineWidth
    );

    // Add horizontal padding for text bubbles
    whiteBoxWidth = whiteBoxWidth + this.elementPadding * 2;

    let paddingBetweenDialogAndPlayer = 10;

    this.x = this.player.screenX;
    this.y =
      this.player.screenY -
      this.player.image.naturalHeight -
      whiteBoxHeight -
      paddingBetweenDialogAndPlayer;

    drawWhiteBoxWithText(
      context,
      this.x,
      this.y,
      whiteBoxHeight,
      whiteBoxWidth,
      linesOfTextArray,
      this.fontSize,
      this.leading,
      this.borderColorsLeftRight,
      this.borderColorsTopBottom,
      this.elementPadding,
      linesOfTextWidthsArray,
      this.cornerImage
    );

    // middle triangle above player
    if (!this.player.isGoingToTheRight) {
      context.drawImage(this.triangleImage, this.x, this.y + whiteBoxHeight);
    } else {
      drawFlippedImage(
        context,
        this.triangleImage,
        Math.floor(this.x),
        Math.floor(this.y + whiteBoxHeight)
      );
    }
  }
}
