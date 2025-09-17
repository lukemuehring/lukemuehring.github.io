import type { Player } from "./Player";

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

  // Scrolls the player across the screen
  // Note: We can no longer use the scroll wheel to scroll because of this implementation.
  scrollListener(event: WheelEvent) {
    this.userInputRegistered = true;
    event.preventDefault();
    if (this.isUserInputAllowed.current) {
      this.player.xVelocity += event.deltaY * 0.1;
    }
  }
}
