export class Background {
  width: number = 1984;
  height: number = 1088;
  image: HTMLImageElement = new Image();
  locations: number[] = [];
  currentMaxLocationIndex: number = 0;
  moveRate: number = 1;
  color: string = "";

  constructor(config: BackgroundConfig = {}) {
    // Assign any properties of config to this instance
    Object.assign(this, config);

    if (config.imageSrc) {
      this.image.src = config.imageSrc;
    }
  }
}

export type BackgroundConfig = Partial<
  Omit<Background, "image" | "currentMaxLocationIndex">
> & {
  imageSrc?: string;
};
