import { Player } from "./Player";

export class Mouse {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  dx: number;
  dy: number;
  isPressedDown: boolean;
  IsDemoModalOpenRef: React.RefObject<boolean>;

  constructor(IsDemoModalOpenRef: React.RefObject<boolean>) {
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.dx = 0;
    this.dy = 0;
    this.isPressedDown = false;
    this.IsDemoModalOpenRef = IsDemoModalOpenRef;
  }

  update(newX: number, newY: number) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x = newX;
    this.y = newY;
    this.dx = this.x - this.prevX;
    this.dy = this.y - this.prevY;
  }

  /**
   * updates the cursor style if an object is hovered
   * @param  {...any} objArrays array of arrays containing objects that could be hovered
   */
  draw(
    c: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    ...objGroups: (any | any[])[]
  ) {
    let isSomeElementHovered = false;

    for (const group of objGroups) {
      const arr = Array.isArray(group) ? group : [group]; // normalize to array

      if (group instanceof Player) {
        if (group.hover) {
          this.scrambleDrawPixelsAtMouse(c);
        }
      }
      // check hover status
      if (arr.some((el) => el && el.hover === true)) {
        isSomeElementHovered = true;
      }
    }

    // update browser cursor
    canvas.style.cursor =
      isSomeElementHovered && !this.IsDemoModalOpenRef.current
        ? "pointer"
        : "default";
  }

  /*
   * Scrambles the pixels around the mouse as a visual effect
   * https://developer.mozilla.org/en-US/docs/Web/API/ImageData
   * imageData gives back a one-dimensional array containing the data in the RGBA order,
   * which is why we skip by 4 in the for loop.
   */
  scrambleDrawPixelsAtMouse(c: CanvasRenderingContext2D) {
    c.save();

    let mouseSquareLength = 32;
    let imageData = c.getImageData(
      this.x - mouseSquareLength / 2,
      this.y - mouseSquareLength / 2,
      mouseSquareLength,
      mouseSquareLength
    ).data;
    for (let i = 0; i < imageData.length; i += 4) {
      c.fillStyle = `rgb(
      ${imageData[i]}
      ${imageData[i + 1]}
      ${imageData[i + 2]})`;

      let pixelIndex = i / 4;
      let rowToFlip, colToFlip;
      rowToFlip = colToFlip = 0;
      rowToFlip += Math.floor(pixelIndex / mouseSquareLength);
      colToFlip += pixelIndex % mouseSquareLength;

      c.fillRect(
        this.x + 0.5 * this.dx - mouseSquareLength / 2 + colToFlip,
        this.y + 0.5 * this.dy - mouseSquareLength / 2 + rowToFlip,
        1,
        1
      );
    }

    c.restore();
  }

  startDrag() {
    this.isPressedDown = true;
  }

  stopDrag() {
    this.isPressedDown = false;
  }
}
