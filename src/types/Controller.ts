import {
  AUTO_WALK_DURATION_FRAMES,
  JUMP_HEIGHT,
  WALK_ACCELERATION,
} from "../lib/constants";
import { stepPlayerTowards } from "../lib/helpers";
import type { Floor } from "./Floor";
import { PlayerStates, type Player } from "./Player";

export class Controller {
  player: Player;
  floor: Floor;
  isUserInputAllowed: React.RefObject<boolean>;
  left: boolean;
  right: boolean;
  up: boolean;
  userInputRegistered: boolean;

  /** World x the player is auto-walking toward, or null when no auto-walk is running. */
  autoWalkTargetX: number | null = null;
  /** Where the character stood when the current auto-walk started. */
  autoWalkStartX = 0;
  /** Frames elapsed in the current auto-walk; the walk ends at AUTO_WALK_DURATION_FRAMES. */
  autoWalkFrame = 0;

  constructor(
    player: Player,
    floor: Floor,
    isUserInputAllowed: React.RefObject<boolean>,
  ) {
    this.player = player;
    this.floor = floor;
    this.isUserInputAllowed = isUserInputAllowed;
    this.left = false;
    this.right = false;
    this.up = false;
    this.userInputRegistered = false;

    // Bind 'this' to be this Controller instance
    // this.keyListener = this.keyListener.bind(this);
  }

  // Arrow function keeps "this" automatically
  keyListener = (event: KeyboardEvent): void => {
    const keyState = event.type === "keydown";
    switch (event.key) {
      case "ArrowLeft":
        this.left = keyState;
        break;
      case "ArrowUp":
        this.up = keyState;
        break;
      case "ArrowRight":
        this.right = keyState;
        break;
    }
  };

  /**
   * Resolves a fraction of the walkable floor to a world x, clamped to solid ground:
   * past Floor.rightX there are no tiles, so the player falls and the respawn branch in
   * MyCanvas yanks them back to spawn. Player.x is itself clamped to >= 0, so never aim
   * left of the origin either.
   *
   * Public because the nav positions its underline against these same coordinates.
   */
  targetForFraction(fraction: number): number {
    const minX = Math.max(0, this.floor.leftX);
    return Math.max(minX, Math.min(fraction * this.floor.rightX, this.floor.rightX));
  }

  /**
   * Starts (or retargets) a walk to a world x-coordinate. Calling this mid-walk just
   * restarts from wherever the character is now, so repeated nav clicks retarget rather
   * than stacking - there is no timer or animation frame to cancel.
   */
  walkTo(x: number): void {
    const target = Math.max(
      Math.max(0, this.floor.leftX),
      Math.min(x, this.floor.rightX),
    );
    this.autoWalkTargetX = target;
    this.autoWalkStartX = this.player.x;
    this.autoWalkFrame = 0;
  }

  /** Walks to a fraction of the walkable floor, so targets survive the floor being widened. */
  walkToFraction(fraction: number): void {
    this.walkTo(this.targetForFraction(fraction));
  }

  cancelAutoWalk(): void {
    this.autoWalkTargetX = null;
    this.autoWalkFrame = 0;
  }

  /** Advances the auto-walk one frame, cancelling it if anything else has taken over. */
  private updateAutoWalk(): void {
    if (this.autoWalkTargetX === null) return;

    // Anything the user does, or anything that takes the player away from us, wins.
    if (
      this.left ||
      this.right ||
      this.up || // arrow keys
      this.player.isDragging || // mouse drag
      !this.isUserInputAllowed.current // respawn, nav menu, demo modal
    ) {
      this.cancelAutoWalk();
      return;
    }

    // Fixed duration, so progress always reaches 1 and the walk always terminates.
    const progress = ++this.autoWalkFrame / AUTO_WALK_DURATION_FRAMES;
    const done = stepPlayerTowards(
      this.player,
      this.autoWalkStartX,
      this.autoWalkTargetX,
      progress,
    );
    if (done) this.cancelAutoWalk();
  }

  update() {
    // Resolved before the user-input branch so a key pressed this frame wins.
    this.updateAutoWalk();

    if ((this.up || this.left || this.right) && this.isUserInputAllowed.current) {
      this.userInputRegistered = true;
      if (this.up && this.player.state != PlayerStates.Jumping) {
        this.player.yVelocity -= JUMP_HEIGHT;
      }
      if (this.left) {
        this.player.xVelocity -= WALK_ACCELERATION;
      }

      if (this.right) {
        this.player.xVelocity += WALK_ACCELERATION;
      }
    }
  }

  // Scrolls the player across the screen
  scrollListener(event: WheelEvent) {
    this.userInputRegistered = true;
    event.preventDefault(); // prevent scroll event from affecting the whole screen
    if (this.isUserInputAllowed.current) {
      // The wheel writes xVelocity directly, bypassing the left/right flags that
      // updateAutoWalk checks, so cancel here explicitly.
      this.cancelAutoWalk();
      this.player.xVelocity += event.deltaY * 0.1;
    }
  }
}
