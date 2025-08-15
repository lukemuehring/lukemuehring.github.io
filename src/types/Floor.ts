export class Floor {
  height: number;
  leftX: number; // the leftmost x-coordinate of the floor (in game space)
  rightX: number; // the rightmost x-coordinate of the floor (in game space)

  constructor(height: number, leftX: number, rightX: number) {
    this.height = height;
    this.leftX = leftX;
    this.rightX = rightX;
  }
}
