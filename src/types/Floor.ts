export class Floor {
  height: number;
  rightX: number; // the rightmost x-coordinate of the floor (in game space)
  leftX: number; // the leftmost x-coordinate of the floor (in game space)

  constructor(height: number, rightX: number, leftX: number) {
    this.height = height;
    this.rightX = rightX;
    this.leftX = leftX;
  }
}
