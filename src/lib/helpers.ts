import type { GameMap } from "../types/GameMap";
import type { Camera } from "../types/Camera";

// closes the hamburger menu and enables user input again
export function closeMenu(IsUserInputAllowedRef: React.RefObject<boolean>) {
  const hamMenu = document.querySelector(".ham-menu");
  if (hamMenu && hamMenu.classList.contains("active")) {
    hamMenu.classList.remove("active");
  }

  const menuContainer = document.querySelector(".menu-container");
  if (menuContainer && menuContainer.classList.contains("active")) {
    menuContainer.classList.remove("active");
  }

  IsUserInputAllowedRef.current = true;
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
  map: GameMap,
  camera: Camera
) {
  context.canvas.width = window.innerWidth;
  context.canvas.height = window.innerHeight;

  camera.width = window.innerWidth;
  camera.height = window.innerHeight;

  resizeMap(context, map);
  resizeText(context);
}

function resizeMap(context: CanvasRenderingContext2D, map: GameMap) {
  // if (context.canvas.height >= Floor.height + Map.tsize * 1.5) {
  //   map.rows = Math.ceil((context.canvas.height - Floor.height) / map.tsize);
  // } else {
  map.rows = 2;
  // }

  map.tiles = new Array(map.cols * map.rows);
  map.tiles.fill(0, 0, map.cols);
  map.tiles.fill(1, map.cols);

  map.length = map.cols * map.tsize;

  cutOffFloorEdgesInMap(map);
}

// todo story
function cutOffFloorEdgesInMap(map: GameMap) {
  let row = 0;
  // let rightEndX = textBubbleArray[codingStory.length - 1].maxX; todo text
  for (
    // let j = Math.floor(rightEndX / map.tsize);
    let j = Math.floor(10000 / map.tsize);
    j < map.tiles.length;
    j += map.cols
  ) {
    row++;
    map.tiles.fill(2, j, map.cols * row);
  }
}

// todo text
function resizeText(context: CanvasRenderingContext2D) {
  // for (let i = 0; i < textBubbleArray.length; i++) {
  //   textBubbleArray[i].maxLineWidth = context.canvas.width / 1.3;
  // }
  // for (let i = 0; i < demos.length; i++) {
  //   demos[i].maxLineWidth = context.canvas.width / 1.3;
  // }
  // // for (let i = 0; i < menuButtons.length; i++) {
  // //   menuButtons[i].maxLineWidth = context.canvas.width / 1.3;
  // // }
  // FONT_HEADING.H1.value = context.canvas.width <= 500 ? 80 : 100;
  // FONT_HEADING.H2.value = context.canvas.width <= 500 ? 33 : 38;
  // FONT_HEADING.P.value = context.canvas.width <= 500 ? 25 : 30;
}
// #endregion
