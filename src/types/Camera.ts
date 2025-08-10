import type { Player } from "./Player";

export class Camera {
  x: number;
  y: number;

  width: number;
  height: number;

  minX: number;
  maxX: number;

  following: Player | null;

  constructor(
    map: { cols: number; tsize: number }, //Map
    width: number,
    height: number
  ) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.minX = 0;
    this.maxX = map.cols * map.tsize - width;

    this.following = null;
  }

  follow(player: Player) {
    this.following = player;
  }

  update() {
    if (!this.following) return;

    this.following.screenX = this.width / 2;
    this.x = this.following.x - this.width / 2;

    this.x = Math.max(this.minX, Math.min(this.x, this.maxX));

    if (
      this.following.x < this.width / 2 ||
      this.following.x > this.maxX + this.width / 2
    ) {
      this.following.screenX = this.following.x - this.x;
      this.following.screenY = this.following.y - this.y;
    }
  }
}
