import { colors1, colors2, ElementPadding } from "../lib/constants";
import {
  calculateHeaderDimensions,
  drawWhiteBoxWithText,
} from "../lib/helpers";
import type { TextLinesData } from "./TextLinesData";

export class Button {
  static IsModalOpen: boolean = false;

  x: number;
  y: number;
  images: HTMLImageElement[] | null;
  headerText: string;
  headerFontSize: number;
  text: string;
  link: string;
  onClick: (...args: any[]) => void;

  maxLineWidth: number;
  leading: number;
  elementPadding: number;

  borderColorsTopBottom: string[];
  borderColorsLeftRight: string[];

  linesData: TextLinesData | null = null;

  width: number = 0;
  height: number = 0;

  hover: boolean;
  canShowTextRef: React.RefObject<boolean>;

  cornerImage: HTMLImageElement;

  constructor(
    x: number,
    y: number,
    images: HTMLImageElement[] | null,
    headerText: string,
    headerFontSize: number,
    text: string,
    link: string,
    maxLineWidth: number,
    canShowTextRef: React.RefObject<boolean>,
    cornerImage: HTMLImageElement,
    onClick: (...args: any[]) => void
  ) {
    this.x = x;
    this.y = y;
    this.images = images;
    this.headerText = headerText;
    this.headerFontSize = headerFontSize;
    this.text = text;
    this.link = link;
    this.onClick = onClick;

    this.maxLineWidth = maxLineWidth;
    this.canShowTextRef = canShowTextRef;
    this.cornerImage = cornerImage;
    this.leading = 0;
    this.elementPadding = ElementPadding;

    this.borderColorsTopBottom = colors1;
    this.borderColorsLeftRight = colors2;

    this.hover = false;
  }

  // initializes the width and height based on the header dimensions
  initializeDimensions(context: CanvasRenderingContext2D) {
    this.linesData = calculateHeaderDimensions(
      context,
      this.headerText,
      this.headerFontSize,
      this.leading,
      this.maxLineWidth,
      this.elementPadding
    );

    this.width =
      this.linesData.whiteBoxWidth + this.borderColorsTopBottom.length * 2;
    this.height =
      this.linesData.whiteBoxHeight + this.borderColorsLeftRight.length * 2;
  }

  draw(context: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.canShowTextRef.current) {
      return;
    }

    if (!this.linesData) {
      this.linesData = calculateHeaderDimensions(
        context,
        this.headerText,
        this.headerFontSize,
        this.leading,
        this.maxLineWidth,
        this.elementPadding
      );
    }

    const { width: btnWidth, height: btnHeight } = drawWhiteBoxWithText(
      context,
      this.x - cameraX,
      this.y,
      this.linesData.whiteBoxHeight,
      this.linesData.whiteBoxWidth,
      this.linesData.lines,
      this.headerFontSize,
      this.leading,
      this.borderColorsLeftRight,
      this.borderColorsTopBottom,
      this.elementPadding,
      this.linesData.lineWidths,
      this.cornerImage
    );

    this.width = btnWidth;
    this.height = btnHeight;
  }

  /**
   * Detects if the mouse is within the box bounds
   * @returns if the mouse is within the box or not
   */
  detectMouseHover(mouseX: number, mouseY: number, cameraX: number): boolean {
    // If modal is open, disable hovering
    if (Button.IsModalOpen) {
      this.hover = false;
      return false;
    }

    if (
      mouseX >= this.x - this.width / 2 - cameraX &&
      mouseX <= this.x + this.width / 2 - cameraX
    ) {
      if (mouseY >= this.y && mouseY < this.y + this.height) {
        this.hover = true;
      }
    } else {
      this.hover = false;
    }
    return this.hover;
  }
}
