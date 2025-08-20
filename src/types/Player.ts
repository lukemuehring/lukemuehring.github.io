import { GRAVITY } from "../lib/constants";
import { drawFlippedImage } from "../lib/helpers";
import type { Floor } from "./Floor";
import type { GameMap } from "./GameMap";

export const PlayerStates = {
  Idle: "Idle",
  Jumping: "Jumping",
  Walking: "Walking",
} as const;

// Type derived from the object
export type IPlayerState = (typeof PlayerStates)[keyof typeof PlayerStates];

export class Player {
  x: number;
  screenX: number;
  xVelocity: number;
  y: number;
  screenY: number;
  yVelocity: number;
  height: number;
  width: number;
  image: HTMLImageElement;
  state: IPlayerState;
  idleSpriteFrame: number;
  idleSpriteFrameIsIncreasing: boolean;
  walkSpriteFrame: number;
  isGoingToTheRight: boolean;
  imageCache: Record<string, HTMLImageElement>;
  animationTimeBuffer: number;

  constructor(
    spawnX: number,
    imageCache: Record<string, HTMLImageElement>,
    animationTimeBuffer: number
  ) {
    this.x = spawnX;
    this.screenX = spawnX;
    this.xVelocity = 0;
    this.y = 0;
    this.screenY = 0;
    this.yVelocity = 0;
    this.height = 160;
    this.width = 94;
    this.image = new Image();
    this.state = PlayerStates.Jumping;
    this.idleSpriteFrame = 0;
    this.idleSpriteFrameIsIncreasing = true;
    this.walkSpriteFrame = 0;
    this.isGoingToTheRight = true;
    this.imageCache = imageCache;
    this.animationTimeBuffer = animationTimeBuffer;
  }

  // todo add platforms to method to have platform detection i guess
  update(Floor: Floor, Map: GameMap) {
    // Gravity and Friction
    this.yVelocity += GRAVITY;
    this.x += this.xVelocity;
    this.y += this.yVelocity;

    this.xVelocity *= 0.9;

    // If the xVelocity is close enough to 0, we set it to 0 for animation purposes.
    // Todo - the clipping bug might be from the second condition here.
    if (this.xVelocity <= 0.2 && this.xVelocity >= -0.2) {
      this.xVelocity = 0;
    }
    this.yVelocity += 0.9;

    // Floor Collision
    if (
      this.y > Floor.height &&
      this.x < Floor.rightX &&
      this.x > Floor.leftX
    ) {
      this.y = Floor.height;
      this.yVelocity = 0;
    }

    // Constraining Player to x range [0, Map Size]
    this.x = Math.max(0, Math.min(this.x, Map.cols * Map.tsize));
    this.screenY = this.y;
  }

  // todo: change 1st floorHeight check to yVelocity so that we can implement platforms
  draw(
    c: CanvasRenderingContext2D,
    floorHeight: number,
    frameCount: number
  ): void {
    // if above the floor: jump
    if (this.y < floorHeight) {
      this.state = PlayerStates.Jumping;
    }
    // if moving horizontally and not jumping: walk
    else if (
      (this.xVelocity <= -1 || this.xVelocity >= 1) &&
      this.state != PlayerStates.Jumping
    ) {
      this.state = PlayerStates.Walking;
      this.isGoingToTheRight = this.xVelocity > 0;
    } else {
      this.state = PlayerStates.Idle;
    }

    switch (this.state) {
      case PlayerStates.Jumping:
        this.image = this.imageCache["./images/player/jump_0.png"];
        break;
      case PlayerStates.Walking:
        if (frameCount % (this.animationTimeBuffer / 5) == 0) {
          this.walkSpriteFrame = (this.walkSpriteFrame + 1) % 4;
        }
        this.image =
          this.imageCache[
            "./images/player/walk1_" + this.walkSpriteFrame + ".png"
          ];
        break;
      case PlayerStates.Idle:
        if (frameCount % this.animationTimeBuffer == 0 && this.xVelocity == 0) {
          if (this.idleSpriteFrame == 2) {
            this.idleSpriteFrameIsIncreasing = false;
          } else if (this.idleSpriteFrame == 0) {
            this.idleSpriteFrameIsIncreasing = true;
          }

          if (this.idleSpriteFrameIsIncreasing) {
            this.idleSpriteFrame = this.idleSpriteFrame + 1;
          } else {
            this.idleSpriteFrame = this.idleSpriteFrame - 1;
          }
          this.image =
            this.imageCache[
              "./images/player/stand1_" + this.idleSpriteFrame + ".png"
            ];
        }
        break;
    }

    if (this.isGoingToTheRight) {
      drawFlippedImage(
        c,
        this.image,
        this.screenX - this.width / 2,
        this.y - this.image.naturalHeight
      );
    } else {
      c.drawImage(
        this.image,
        Math.floor(this.screenX - this.width / 2),
        Math.floor(this.y - this.image.naturalHeight)
      );
    }
  }
}
