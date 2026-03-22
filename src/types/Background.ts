export class Background {
  width: number = 1984;
  height: number = 1088;
  image: HTMLImageElement = new Image();
  darkImage: HTMLImageElement = new Image();
  locations: number[] = [];
  currentMaxLocationIndex: number = 0;
  moveRate: number = 1;
  color: string = "";

  constructor(config: BackgroundConfig = {}) {
    // Assign any properties of config to this instance
    Object.assign(this, config);

    if (config.imageSrc) {
      this.image.src = config.imageSrc;
      this.darkImage.src = config.imageSrc.replace(".png", "_dark.png");
    }
  }

  /* draws the background
   * uses an array of locations to draw multiple background images
   * and moves them according to moveRate in a (almost) seamless loop.
   */
  draw(context: CanvasRenderingContext2D, darkMode: boolean) {
    for (let i = 0; i < this.locations.length; i++) {
      // if the entire map has been scrolled off screen,
      // move it next to the location furthest to the right
      if (this.locations[i] + this.width < 0) {
        this.locations[i] =
          this.locations[this.currentMaxLocationIndex] + this.width;
        this.currentMaxLocationIndex = i;
      }

      this.locations[i] -= this.moveRate;

      context.drawImage(
        darkMode ? this.darkImage : this.image,
        Math.floor(this.locations[i]),
        0
      );
    }
  }
}

// type for the configuration object for the constructor
export type BackgroundConfig = Partial<
  Omit<Background, "image" | "currentMaxLocationIndex">
> & {
  imageSrc?: string;
};
