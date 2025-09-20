export class ImageObject {
  x: number;
  y: number;
  image: HTMLImageElement | HTMLCanvasElement;
  compositeOperation?: GlobalCompositeOperation;

  constructor(
    x: number,
    y: number,
    img: HTMLImageElement | HTMLCanvasElement,
    compositeOperation?: GlobalCompositeOperation
  ) {
    this.x = x;
    this.y = y;
    this.image = img;
    this.compositeOperation = compositeOperation;
  }

  draw(context: CanvasRenderingContext2D, cameraX: number) {
    let contextChanged: boolean = false;
    if (this.compositeOperation) {
      context.save();

      context.globalCompositeOperation = this.compositeOperation;
      contextChanged = true;
    }
    context.drawImage(
      this.image,
      Math.floor(this.x - cameraX),
      Math.floor(this.y)
    );

    if (contextChanged) {
      context.restore();
    }
  }
}
