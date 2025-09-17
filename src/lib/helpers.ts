import { Button } from "../types/Button";
import type { Camera } from "../types/Camera";
import type { Controller } from "../types/Controller";
import type { Floor } from "../types/Floor";
import type { GameMap } from "../types/GameMap";
import { ImageObject } from "../types/ImageObject";
import { Mouse } from "../types/Mouse";
import { Player } from "../types/Player";
import { TextBubble } from "../types/TextBubble";
import type { TextLinesData } from "../types/TextLinesData";
import { FONT_HEADING } from "./constants";
import { CodingStory } from "./story";

/**
 *  Checks if an object was clicked,
 * if so, we call the object's onClick function
 * @returns the object that was clicked
 */
export function checkIfObjectClicked(demos: Button[], Player: Player | null) {
  // check project demos
  for (let i = 0; i < demos.length; i++) {
    if (demos[i].hover && !Button.IsModalOpen) {
      return demos[i];
    }
  }

  if (Player && Player.hover) {
    return Player;
  }

  return null;
}

// closes the hamburger menu
export function closeMenu(
  IsDemoModalOpenRef: React.RefObject<boolean>,
  onRefChange: () => void
) {
  const hamMenu = document.querySelector(".ham-menu");
  if (hamMenu && hamMenu.classList.contains("active")) {
    hamMenu.classList.remove("active");
  }

  const menuContainer = document.querySelector(".menu-container");
  if (menuContainer && menuContainer.classList.contains("active")) {
    menuContainer.classList.remove("active");
  }

  IsDemoModalOpenRef.current = false;
  onRefChange();
}

// draws the image but flips it horizontally
export function drawFlippedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number
) {
  context.save();
  context.translate(x + image.width / 2, 0);
  context.scale(-1, 1);
  context.translate(-(x + image.width / 2), 0);
  context.drawImage(image, Math.floor(x), Math.floor(y));
  context.restore();
}

// #region --- Map and Responsive Scaling ---
export function handleCanvasResize(
  context: CanvasRenderingContext2D,
  Camera: Camera,
  Demos: Button[],
  Map: GameMap,
  Floor: Floor,
  TextBubbleArray: TextBubble[],
  maxX: number
) {
  resizeCanvas(context);
  resizeCamera(context, Camera);
  resizeMap(context, Map, Floor, maxX);
  resizeText(context, Demos, TextBubbleArray);
}

export function resizeCanvas(context: CanvasRenderingContext2D) {
  context.canvas.width = window.innerWidth;
  context.canvas.height = window.innerHeight;
}

export function resizeCamera(
  context: CanvasRenderingContext2D,
  Camera: Camera
) {
  Camera.width = window.innerWidth;
  Camera.height = window.innerHeight;
}

export function resizeMap(
  context: CanvasRenderingContext2D,
  Map: GameMap,
  Floor: Floor,
  maxX: number
) {
  if (context.canvas.height >= Floor.height + Map.tsize * 1.5) {
    Map.rows = Math.ceil((context.canvas.height - Floor.height) / Map.tsize);
  } else {
    Map.rows = 2;
  }

  Map.tiles = new Array(Map.cols * Map.rows);
  Map.tiles.fill(0, 0, Map.cols);
  Map.tiles.fill(1, Map.cols);

  Map.length = Map.cols * Map.tsize;

  cutOffFloorEdgesInMap(Map, maxX);
}

function cutOffFloorEdgesInMap(Map: GameMap, maxX: number) {
  let row = 0;
  let rightEndX = maxX;
  for (
    let j = Math.floor(rightEndX / Map.tsize);
    j < Map.tiles.length;
    j += Map.cols
  ) {
    row++;
    Map.tiles.fill(2, j, Map.cols * row);
  }
}

// todo make smooth
export function movePlayerToScreenCoords(Player: Player, x: number, y: number) {
  if (x < Player.x) {
    while (Player.x < x) {
      Player.x += 1;
    }
  }
  (Player.x = x), (Player.y = y);
}
// #endregion

// #region --- Text Utilities ---

/**
 * calculates the font size needed for the heading to fit in the screen
 */
export function calculateHeadingFontSize(
  c: CanvasRenderingContext2D,
  text: string,
  initialFontSize: number
) {
  c.save();

  let currentFontSize = initialFontSize;
  c.font = getCanvasFontString(currentFontSize);

  // Scale down font size until it fits the screen.
  let currentFontWidthInPx = c.measureText(text).width;
  while (currentFontWidthInPx > c.canvas.width - 50) {
    currentFontSize -= 10;
    c.font = getCanvasFontString(currentFontSize);
    currentFontWidthInPx = c.measureText(text).width;
  }

  c.restore();
  return currentFontSize;
}

// calculate dimensions and lines of the header
export function calculateHeaderDimensions(
  c: CanvasRenderingContext2D,
  headerText: string,
  fontSize: number,
  leading: number,
  maxLineWidth: number,
  elementPadding: number
): TextLinesData {
  let lineDataObject = getLinesOfText(
    c,
    headerText,
    fontSize,
    leading,
    maxLineWidth
  );

  // ADD PADDING TO BIG BUTTONS
  let whiteBoxWidth = lineDataObject.whiteBoxWidth + elementPadding * 2;
  let whiteBoxHeight = lineDataObject.whiteBoxHeight + elementPadding * 2;

  return {
    whiteBoxWidth: Math.floor(whiteBoxWidth),
    whiteBoxHeight: Math.floor(whiteBoxHeight),
    lines: lineDataObject.lines,
    lineWidths: lineDataObject.lineWidths,
  } as TextLinesData;
}

/**
 * Draws a white box with text.
 * @param {*} context
 * @param {*} x - x coordinate representing the center of the white box
 * @param {*} y
 * @param {*} whiteBoxHeight
 * @param {*} whiteBoxWidth
 * @param {*} lines
 * @param {*} fontSize
 * @param {*} leading
 * @param {*} borderColorsLeftRight
 * @param {*} borderColorsTopBottom
 * @param {*} padding
 * @returns
 */
export function drawWhiteBoxWithText(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  whiteBoxHeight: number,
  whiteBoxWidth: number,
  lines: string[],
  fontSize: number,
  leading: number,
  borderColorsLeftRight: string[],
  borderColorsTopBottom: string[],
  padding: number,
  lineWidths: number[],
  cornerImage: HTMLImageElement
) {
  context.save();

  // White background
  context.fillStyle = "white";
  context.fillRect(
    Math.floor(x - whiteBoxWidth / 2),
    Math.floor(y),
    whiteBoxWidth,
    whiteBoxHeight
  );

  context.font = getCanvasFontString(fontSize);

  context.fillStyle = "white";
  context.fillRect(
    Math.floor(x - whiteBoxWidth / 2),
    Math.floor(y),
    whiteBoxWidth,
    whiteBoxHeight
  );

  context.font = getCanvasFontString(fontSize);

  // Drawing the text over the white box
  context.fillStyle = "black";

  for (let i = 0; i < lines.length; i++) {
    let startPadding =
      (whiteBoxWidth - context.measureText(lines[i]).width) / 2;

    let xToDraw = x - whiteBoxWidth / 2 + startPadding;

    context.fillText(
      lines[i],
      Math.floor(xToDraw),
      Math.floor(y + fontSize + i * (leading + fontSize))
    );
  }

  // Top and Bottom borders of the white box
  for (let i = 0; i < borderColorsTopBottom.length; i++) {
    context.fillStyle = borderColorsTopBottom[i];
    context.fillRect(
      Math.floor(x - whiteBoxWidth / 2),
      Math.floor(y - borderColorsTopBottom.length + i),
      whiteBoxWidth,
      1
    );
    context.fillRect(
      Math.floor(x - whiteBoxWidth / 2),
      Math.floor(y + whiteBoxHeight - i + borderColorsTopBottom.length - 1),
      whiteBoxWidth,
      1
    );
  }

  // Left and Right
  for (let i = 0; i < borderColorsLeftRight.length; i++) {
    context.fillStyle = borderColorsLeftRight[i];
    context.fillRect(
      Math.floor(x - whiteBoxWidth / 2 - borderColorsLeftRight.length + i),
      Math.floor(y),
      1,
      whiteBoxHeight
    );
    context.fillRect(
      Math.floor(x + whiteBoxWidth / 2 + borderColorsLeftRight.length - 1 - i),
      Math.floor(y),
      1,
      whiteBoxHeight
    );
  }

  // Drawing the corners
  context.drawImage(
    cornerImage, // image
    0, // source x
    0, // source y
    4, // source width
    5, // source height
    Math.floor(x - whiteBoxWidth / 2 - borderColorsLeftRight.length), // target x
    Math.floor(y - borderColorsTopBottom.length), // target y
    4, // target width
    5 // target height
  );

  context.drawImage(
    cornerImage,
    4,
    0,
    4,
    5,
    Math.floor(x - whiteBoxWidth / 2 - borderColorsLeftRight.length),
    Math.floor(y + whiteBoxHeight),
    4,
    5
  );

  context.drawImage(
    cornerImage,
    8,
    0,
    4,
    5,
    Math.floor(x + whiteBoxWidth / 2),
    Math.floor(y - borderColorsTopBottom.length),
    4,
    5
  );

  context.drawImage(
    cornerImage,
    12,
    0,
    4,
    5,
    Math.floor(x + whiteBoxWidth / 2),
    Math.floor(y + whiteBoxHeight),
    4,
    5
  );

  context.restore();

  return {
    width: whiteBoxWidth + 2 * borderColorsLeftRight.length,
    height: whiteBoxHeight,
  };
}

/**
 * Gets the font string used for setting the CanvasRenderingContext2D.font property.
 * Checks if the web page has the font VT323 loaded.
 * If not, we default to sans-serif.
 * @param {*} fontSize the font size
 * @returns the font string in the format "{fontSize}px VT323" or "{fontSize}px sans-serif"
 */
export function getCanvasFontString(fontSize: number) {
  if (document.fonts.check("12px 'VT323'")) {
    return fontSize + "px 'VT323'";
  } else {
    return fontSize - 8 + "px monospace";
  }
}

/**
 * Gets the lines of text data object
 * @param {*} context
 * @param {*} text
 * @param {*} fontSize
 * @param {*} leading
 * @param {*} maxLineWidth
 * @returns
 * {
 *  whiteBoxHeight: whiteBoxHeight,
    whiteBoxWidth: whiteBoxWidth, no padding included
    linesOfTextArray: linesOfTextArray,
    linesOfTextWidthsArray: linesOfTextWidthsArray
 * }
 */
export function getLinesOfText(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  leading: number,
  maxLineWidth: number
): TextLinesData {
  context.save();
  context.font = getCanvasFontString(fontSize);

  let words = text.split(" ");
  let linesOfTextArray = new Array();
  let linesOfTextWidthsArray = new Array();
  let i = 0;
  let currentMaxLineWidth = 0;
  while (i < words.length) {
    let currentLine = "";
    let currentLineWidth = context.measureText(currentLine).width;

    // In case the window gets scaled so small that you can't fit one word under the maxLineWidth
    if (currentLineWidth + context.measureText(words[i]).width > maxLineWidth) {
      maxLineWidth = currentLineWidth + context.measureText(words[i]).width;
    }

    while (
      currentLineWidth + context.measureText(words[i]).width <= maxLineWidth &&
      i < words.length
    ) {
      if (i != words.length - 1) {
        currentLine += words[i] + " ";
      } else {
        currentLine += words[i];
      }
      currentLineWidth = context.measureText(currentLine).width;
      i++;
    }

    linesOfTextArray.push(currentLine);
    linesOfTextWidthsArray.push(currentLineWidth);

    if (currentMaxLineWidth < currentLineWidth) {
      currentMaxLineWidth = currentLineWidth;
    }
  }

  let whiteBoxHeight = (fontSize + leading) * linesOfTextArray.length;
  let whiteBoxWidth = Math.ceil(currentMaxLineWidth);

  context.restore();
  return {
    whiteBoxWidth: whiteBoxWidth,
    whiteBoxHeight: whiteBoxHeight,
    lines: linesOfTextArray,
    lineWidths: linesOfTextWidthsArray,
  };
}

export function resizeText(
  context: CanvasRenderingContext2D,
  Demos: Button[],
  TextBubbleArray: TextBubble[]
) {
  for (let i = 0; i < TextBubbleArray.length; i++) {
    TextBubbleArray[i].maxLineWidth = context.canvas.width / 1.3;
  }
  for (let i = 0; i < Demos.length; i++) {
    Demos[i].maxLineWidth = context.canvas.width / 1.3;
  }

  FONT_HEADING.H1 = context.canvas.width <= 500 ? 80 : 100;
  FONT_HEADING.H2 = context.canvas.width <= 500 ? 33 : 38;
  FONT_HEADING.P = context.canvas.width <= 500 ? 25 : 30;
}

// sets up the text bubbles for the story, the background objects and foreground objects
export function setupTextBubblesObjectsAndDemos(
  context: CanvasRenderingContext2D,
  CANVAS_DOM_ELEMENT: HTMLElement,
  Floor: Floor,
  Player: Player,
  Map: GameMap,
  CanShowTextRef: React.RefObject<boolean>,
  IsUserInputAllowedRef: React.RefObject<boolean>,
  cornerImage: HTMLImageElement,
  triangleImage: HTMLImageElement,
  textBubbleArray: TextBubble[],
  backgroundObjects: ImageObject[],
  foregroundObjects: ImageObject[],
  demos: Button[],
  demosOpenHandler: (demo: any) => void
) {
  let startX: number =
    context.canvas.width - Math.floor(context.canvas.width * 0.4);
  let endX: number;

  // determines how much horizontal distance is given to each text bubble
  const ReadingSpeedPixelsPerCharacter = 7;
  const grassMarkerImage = new Image();
  grassMarkerImage.src = "../../images/grass1.png";
  const TEXT_BUBBLE_MAX_LINE_WIDTH: number = Math.floor(
    context.canvas.width / 1.5
  );

  for (let i = 0; i < 2; i++) {
    endX = startX + CodingStory[i].length * ReadingSpeedPixelsPerCharacter;

    textBubbleArray.push(
      new TextBubble(
        CodingStory[i],
        Player.x,
        Player.y,
        CanShowTextRef,
        startX,
        endX,
        TEXT_BUBBLE_MAX_LINE_WIDTH,
        Player,
        cornerImage,
        triangleImage
      )
    );

    // the grass image is 55 pixels tall
    foregroundObjects.push(
      new ImageObject(startX, Floor.height - 55, grassMarkerImage)
    );
    startX = endX;
  }

  // #region Demo setup
  let imageURLS = [
    "../../images/rr_images/rr1.webp",
    "../../images/rr_images/rr2.webp",
    "../../images/rr_images/rr3.webp",
    "../../images/rr_images/rr4.webp",
    "../../images/rr_images/rr5.webp",
    "../../images/rr_images/rr6.webp",
  ];

  let images = new Array(imageURLS.length);
  for (let i = 0; i < images.length; i++) {
    images[i] = new Image();
    images[i].src = imageURLS[i];
  }

  let websiteDemoHeader: string = "restandrelaxvacation.com";
  let fontSize = calculateHeadingFontSize(
    context,
    websiteDemoHeader,
    FONT_HEADING.H1
  );
  const BTN_MAX_LINE_WIDTH = Math.min(1000, context.canvas.width - 50);

  const websiteDemo = new Button(
    textBubbleArray[1].maxX,
    Math.floor(Floor.height / 2) - 100,
    images,
    websiteDemoHeader,
    fontSize,
    "A rental website for Rest & Relax Vacation in Gulf Shores, AL.\nBuilt with React 18 and Tailwind CSS.",
    "https://restandrelaxvacation.com",
    BTN_MAX_LINE_WIDTH,
    CanShowTextRef,
    cornerImage,
    () => {
      demosOpenHandler(websiteDemo);
    }
  );
  websiteDemo.initializeDimensions(context);
  websiteDemo.x += Math.floor(websiteDemo.width / 2);

  demos.push(websiteDemo);
  // #endregion Demo setup

  // #region Continue story from "Here are some of my projects"
  // set endX to the last demo's X coordinate + 1/2 of its width
  endX =
    demos[demos.length - 1].x + Math.floor(demos[demos.length - 1].width / 2);

  textBubbleArray.push(
    new TextBubble(
      CodingStory[2],
      Player.x,
      Player.y,
      CanShowTextRef,
      startX,
      endX,
      TEXT_BUBBLE_MAX_LINE_WIDTH,
      Player,
      cornerImage,
      triangleImage
    )
  );

  foregroundObjects.push(
    new ImageObject(startX, Floor.height - 55, grassMarkerImage)
  );
  startX = endX;

  for (let i = 3; i < CodingStory.length; i++) {
    if (i == CodingStory.length - 1) {
      endX = startX + 500 - ((startX + 500) % Map.tsize);
      Floor.rightX = startX + 500 - ((startX + 500) % Map.tsize);
    } else {
      endX = startX + CodingStory[i].length * ReadingSpeedPixelsPerCharacter;
    }
    textBubbleArray.push(
      new TextBubble(
        CodingStory[i],
        Player.x,
        Player.y,
        CanShowTextRef,
        startX,
        endX,
        TEXT_BUBBLE_MAX_LINE_WIDTH,
        Player,
        cornerImage,
        triangleImage
      )
    );

    foregroundObjects.push(
      new ImageObject(startX, Floor.height - 55, grassMarkerImage)
    );
    startX = endX;
  }
  // #endregion
}

// #endregion

// #region Touch
export const ongoingTouches: any[] = [];

export function copyTouch({ identifier, clientX, clientY }: any) {
  return { identifier, clientX, clientY };
}

function ongoingTouchIndexById(idToFind: number) {
  for (let i = 0; i < ongoingTouches.length; i++) {
    const id = ongoingTouches[i].identifier;

    if (id === idToFind) {
      return i;
    }
  }
  return -1; // not found
}

export function handleTouchStart(
  evt: TouchEvent,
  Controller: Controller,
  Mouse: Mouse
) {
  Controller.userInputRegistered = true;

  const touches: TouchList = evt.changedTouches;
  Mouse.x = touches[0].clientX;
  Mouse.y = touches[0].clientY;

  for (let i = 0; i < touches.length; i++) {
    ongoingTouches.push(copyTouch(touches[i]));
  }
}

export function handleTouchMove(
  evt: TouchEvent,
  userInputIsAllowed: boolean,
  Player: Player
) {
  evt.preventDefault();
  const touches: TouchList = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    const idx = ongoingTouchIndexById(touches[i].identifier);

    if (idx >= 0) {
      if (userInputIsAllowed) {
        Player.xVelocity +=
          0.3 * (touches[i].clientX - ongoingTouches[idx].clientX);
      }
      ongoingTouches.splice(idx, 1, copyTouch(touches[i])); // swap in the new touch record
    } else {
      console.error("can't figure out which touch to continue");
    }
  }
}

export function handleTouchEnd(evt: TouchEvent) {
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    let idx = ongoingTouchIndexById(touches[i].identifier);

    if (idx >= 0) {
      ongoingTouches.splice(idx, 1); // remove it; we're done
    } else {
      console.error("can't figure out which touch to end");
    }
  }
}

export function handleTouchCancel(evt: TouchEvent) {
  evt.preventDefault();
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    let idx = ongoingTouchIndexById(touches[i].identifier);
    ongoingTouches.splice(idx, 1); // remove it; we're done
  }
}
// #endregion

// #region --- Other ---

// #endregion
