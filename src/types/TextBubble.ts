import {
  BORDER_COLORS_TOP_BOTTOM_LIGHT,
  BORDER_COLORS_LEFT_RIGHT_LIGHT,
  ElementPadding,
  FONT_HEADING,
  TextLeading,
  BORDER_COLORS_TOP_BOTTOM_DARK,
  BORDER_COLORS_LEFT_RIGHT_DARK,
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
  borderColorsTopBottomLight: string[];
  borderColorsLeftRightLight: string[];
  borderColorsTopBottomDark: string[];
  borderColorsLeftRightDark: string[];

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
    this.borderColorsTopBottomLight = BORDER_COLORS_TOP_BOTTOM_LIGHT;
    this.borderColorsLeftRightLight = BORDER_COLORS_LEFT_RIGHT_LIGHT;
    this.borderColorsTopBottomDark = BORDER_COLORS_TOP_BOTTOM_DARK;
    this.borderColorsLeftRightDark = BORDER_COLORS_LEFT_RIGHT_DARK;
  }

  draw(
    context: CanvasRenderingContext2D,
    _cameraX: number,
    _cameraY: number,
    darkMode: boolean
  ) {
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
      this.elementPadding,
      linesOfTextWidthsArray,
      this.cornerImage,
      darkMode
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
