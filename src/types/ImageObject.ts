export class ImageObject {
  x: number;
  y: number;
  image: HTMLImageElement | HTMLCanvasElement;
  compositeOperation?: GlobalCompositeOperation;
  width?: number;
  height?: number;

  constructor(
    x: number,
    y: number,
    img: HTMLImageElement | HTMLCanvasElement,
    compositeOperation?: GlobalCompositeOperation,
    width?: number,
    height?: number,
  ) {
    this.x = x;
    this.y = y;
    this.image = img;
    this.compositeOperation = compositeOperation;
    this.width = width;
    this.height = height;
  }

  draw(context: CanvasRenderingContext2D, cameraX: number) {
    let contextChanged: boolean = false;
    if (this.compositeOperation) {
      context.save();

      context.globalCompositeOperation = this.compositeOperation;
      contextChanged = true;
    }

    // Only use passed in width and height if desktop sized.
    // Otherwise, use original image dimensions.
    const isMobile = context.canvas.width < 768;
    if (this.width && this.height && !isMobile) {
      context.save();
      context.imageSmoothingEnabled = false;
      context.drawImage(
        this.image,
        Math.floor(this.x - cameraX),
        Math.floor(this.y),
        this.width,
        this.height,
      );
      context.restore();
    } else {
      context.drawImage(
        this.image,
        Math.floor(this.x - cameraX),
        Math.floor(this.y),
      );
    }

    if (contextChanged) {
      context.restore();
    }
  }
}
