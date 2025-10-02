import { GRAVITY } from "../lib/constants";
import { drawFlippedImage } from "../lib/helpers";
import type { Camera } from "./Camera";
import type { Floor } from "./Floor";
import type { GameMap } from "./GameMap";
import type { Mouse } from "./Mouse";

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
  hover: boolean;

  isDragging: boolean = false;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;

  IsUserInputAllowedRef: React.RefObject<boolean>;

  constructor(
    spawnX: number,
    imageCache: Record<string, HTMLImageElement>,
    animationTimeBuffer: number,
    IsUserInputAllowedRef: React.RefObject<boolean>
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
    this.hover = false;
    this.IsUserInputAllowedRef = IsUserInputAllowedRef;
  }

  // todo add platforms to method to have platform detection i guess
  update(Floor: Floor, Map: GameMap, Mouse: Mouse, Camera: Camera) {
    // Gravity and Friction
    if (!this.isDragging) {
      this.yVelocity += GRAVITY;
      this.x += this.xVelocity;
      this.y += this.yVelocity;

      this.xVelocity *= 0.9;
      this.yVelocity += 0.9;

      // If the xVelocity is close enough to 0, we set it to 0 for animation purposes.
      // Todo - the clipping bug might be from the second condition here.
      if (this.xVelocity <= 0.2 && this.xVelocity >= -0.2) {
        this.xVelocity = 0;
      }
    }

    // update hover
    this.hover = false;

    // console.log(" PLAYA (", this.screenX, ",", this.screenY, ")");
    // console.log("MOUSE (", Mouse.x, ",", Mouse.y, ")");

    if (
      Mouse.x > this.screenX - this.width / 2 &&
      Mouse.x < this.screenX + this.width / 2
    ) {
      if (Mouse.y > this.screenY - this.height && Mouse.y < this.screenY) {
        this.hover = true;
      }
    }

    // --- Handle dragging ---
    if (this.isDragging) {
      // follow mouse when dragging
      this.screenX = Mouse.x - this.dragOffsetX;
      this.screenY = Math.min(Mouse.y - this.dragOffsetY, Floor.height);
      this.x = Camera.x + (Mouse.x - this.dragOffsetX);
      // this.y = Math.min(Camera.y + (Mouse.y - this.dragOffsetY), Floor.height);
      this.y = Camera.y + (Mouse.y - this.dragOffsetY);
    } else if (
      this.hover &&
      Mouse.isPressedDown &&
      this.IsUserInputAllowedRef.current
    ) {
      // Start dragging only if mouse is over player
      this.isDragging = true;
      this.dragOffsetX = Mouse.x - this.screenX;
      this.dragOffsetY = Mouse.y - this.screenY;
    }

    if (!Mouse.isPressedDown) {
      this.isDragging = false;
    }

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

    this.screenX = Camera.getScreenX(this.x);
    // this.screenY = Camera.getScreenY(this.y); todo camera y
    this.screenY = this.y;

    // todo this fixes random respawns from the mouse but also now player cant "die" by falling off the edge
    // this.y = Math.min(this.y, Floor.height); // Prevent player from going below the floor
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
        this.screenY - this.image.naturalHeight
      );
    } else {
      c.drawImage(
        this.image,
        Math.floor(this.screenX - this.width / 2),
        Math.floor(this.screenY - this.image.naturalHeight)
      );
    }
  }

  onClick() {
    // this.yVelocity -= JUMP_HEIGHT;
  }
}
