export class ImageObject {
  x: number;
  y: number;
  image: HTMLImageElement;

  constructor(x: number, y: number, img: HTMLImageElement) {
    this.x = x;
    this.y = y;
    this.image = img;
  }

  draw(context: CanvasRenderingContext2D, cameraX: number) {
    context.drawImage(
      this.image,
      Math.floor(this.x - cameraX),
      Math.floor(this.y)
    );
  }
}
