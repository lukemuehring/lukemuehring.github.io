export class Mouse {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  dx: number;
  dy: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.dx = 0;
    this.dy = 0;
  }

  updatePosition(newX: number, newY: number) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x = newX;
    this.y = newY;
    this.dx = this.x - this.prevX;
    this.dy = this.y - this.prevY;
  }
}
