import { JUMP_HEIGHT } from "../lib/constants";
import { PlayerStates, type Player } from "./Player";

export class Controller {
  player: Player;
  isUserInputAllowed: React.RefObject<boolean>;
  left: boolean;
  right: boolean;
  up: boolean;
  userInputRegistered: boolean;

  constructor(player: Player, isUserInputAllowed: React.RefObject<boolean>) {
    this.player = player;
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

  update() {
    if ((this.up || this.left || this.right) && this.isUserInputAllowed) {
      this.userInputRegistered = true;
      if (this.up && this.player.state != PlayerStates.Jumping) {
        this.player.yVelocity -= JUMP_HEIGHT;
      }
      if (this.left) {
        this.player.xVelocity -= 0.5;
      }

      if (this.right) {
        this.player.xVelocity += 0.5;
      }
    }
  }

  // Scrolls the player across the screen
  scrollListener(event: WheelEvent) {
    this.userInputRegistered = true;
    event.preventDefault(); // prevent scroll event from affecting the whole screen
    if (this.isUserInputAllowed.current) {
      this.player.xVelocity += event.deltaY * 0.1;
    }
  }
}
