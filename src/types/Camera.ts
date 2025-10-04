import type { GameMap } from "./GameMap";
import type { Player } from "./Player";

export class Camera {
  x: number;
  y: number;

  width: number;
  height: number;

  minX: number;
  maxX: number;

  following: Player | null;

  constructor(map: GameMap, width: number, height: number) {
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

    this.x = this.following.x - this.width / 2;
    // this.y = this.following.y - this.height / 2;

    // Clamp camera within map bounds
    this.x = Math.max(this.minX, Math.min(this.x, this.maxX));
    this.y = Math.max(0, this.y); // optional top clamp

    // this.following.screenX = this.width / 2;
    // this.x = this.following.x - this.width / 2;

    // this.x = Math.max(this.minX, Math.min(this.x, this.maxX));

    // if (
    //   this.following.x < this.width / 2 ||
    //   this.following.x > this.maxX + this.width / 2
    // ) {
    //   this.following.screenX = this.following.x - this.x;
    //   this.following.screenY = this.following.y - this.y;
    // }
  }

  // Get a screen position relative to the camera
  getScreenX(worldX: number) {
    return worldX - this.x;
  }

  getScreenY(worldY: number) {
    return worldY - this.y;
  }
}
