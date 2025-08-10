import { useEffect, useRef } from "react";
import "../style.css";
import { Camera } from "../types/Camera";
import { GameMap } from "../types/GameMap";
import { Background } from "../types/Background";

export default function MyCanvas() {
  // Singleton global object refs
  const CanvasRef = useRef<HTMLCanvasElement>(null);
  const ContextRef = useRef<CanvasRenderingContext2D | null>(null);

  const Bg0Ref = useRef<Background | null>(null);
  const Bg1Ref = useRef<Background | null>(null);
  const CameraRef = useRef<Camera | null>(null);
  const MapRef = useRef<GameMap | null>(null);

  const FrameCountRef = useRef(0);

  let prevTimestamp = 0;
  const FPS_TARGET = 60;
  const FRAME_DURATION = 1000 / FPS_TARGET; // 16.67 per frame, of 60 frames per second

  // runs after the component mounts + renders
  useEffect(() => {
    const canvas = CanvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) {
      return;
    }

    // #region Preloading Images
    const imageCache: Record<string, HTMLImageElement> = {};
    const imagePathArray = [
      "./images/player/jump_0.png",
      "./images/player/stand1_0.png",
      "./images/player/stand1_1.png",
      "./images/player/stand1_2.png",
      "./images/player/walk1_0.png",
      "./images/player/walk1_1.png",
      "./images/player/walk1_2.png",
      "./images/player/walk1_3.png",
      "./images/grass1.png",
    ];

    let loadedImages = 0;

    function trackProgress() {
      loadedImages++;
      if (loadedImages === imagePathArray.length) {
        window.requestAnimationFrame(loop);
      }
    }

    function preloadImages() {
      for (let i = 0; i < imagePathArray.length; i++) {
        const tempImage = new Image();
        tempImage.addEventListener("load", trackProgress);
        tempImage.src = imagePathArray[i];
        imageCache[imagePathArray[i]] = tempImage;
      }
    }

    preloadImages();
    // #endregion

    // Set global singleton refs
    ContextRef.current = c;
    MapRef.current = new GameMap();
    CameraRef.current = new Camera(
      MapRef.current,
      c.canvas.width,
      c.canvas.height
    );

    // #region Background setup
    Bg0Ref.current = new Background({
      width: 1984,
      height: 1088,
      imageSrc: "./images/bg_0.png",
      moveRate: 0.3,
    });
    const Bg0 = Bg0Ref.current;
    if (!Bg0) return;

    let numBgImages = Math.ceil(MapRef.current.length / Bg0.width) + 1;

    Bg0.locations = Array.from(
      { length: numBgImages },
      (_, index) => index * Bg0.width
    );
    Bg0.currentMaxLocationIndex = Bg0.locations.length - 1;

    Bg1Ref.current = new Background({
      width: 1984,
      height: 1088,
      imageSrc: "./images/bg_1.png",
      moveRate: 1,
      color: "203 240 255",
    });
    const Bg1 = Bg1Ref.current;
    if (!Bg1) return;

    Bg1.locations = Array.from(
      { length: numBgImages },
      (_, index) => index * Bg1.width
    );
    Bg1.currentMaxLocationIndex = Bg1.locations.length - 1;
    // #endregion

    // Cleanup useEffect
    return () => {
      // Remove all event listeners xon images to prevent leaks
      for (const src in imageCache) {
        imageCache[src].removeEventListener("load", trackProgress);
      }
    };
  }, []);

  // #region --- Animation Loop ---
  function loop(timestamp: number) {
    // rename references just for readability
    const c: CanvasRenderingContext2D | null = ContextRef.current;
    const Map: GameMap | null = MapRef.current;
    const Bg0: Background | null = Bg0Ref.current;
    const Bg1: Background | null = Bg1Ref.current;
    const Camera: Camera | null = CameraRef.current;

    // calculate time elapsed since last frame
    const deltaTime: number = timestamp - prevTimestamp;
    if (deltaTime >= FRAME_DURATION && c && Map && Camera && Bg0 && Bg1) {
      prevTimestamp = timestamp - (deltaTime % FRAME_DURATION);

      /*
       * Responsive Scaling
       */
      if (
        window.innerWidth != c.canvas.width ||
        window.innerHeight != c.canvas.height
      ) {
        handleCanvasResize(c, Map, Camera);
      }

      // /*
      //  * Controller Input
      //  */
      // if (Player.y > Floor.height && userInputIsAllowed) {
      //   userInputIsAllowed = false;
      //   setTimeout(() => {
      //     Player.x = spawnX;
      //     Player.y = 0;
      //     Player.xVelocity = 0;
      //     Player.yVelocity = 0;
      //     userInputIsAllowed = true;
      //   }, 1000);
      // }

      // if (
      //   (Controller.up || Controller.left || Controller.right) &&
      //   userInputIsAllowed
      // ) {
      //   Controller.userInputRegistered = true;
      //   if (Controller.up && Player.state != PlayerStates.Jumping) {
      //     Player.yVelocity -= JumpHeight;
      //   }
      //   if (Controller.left) {
      //     Player.xVelocity -= 0.5;
      //   }

      //   if (Controller.right) {
      //     Player.xVelocity += 0.5;
      //   }
      // }

      // /*
      //  * Gravity and Friction
      //  */
      // Player.yVelocity += Gravity;
      // Player.x += Player.xVelocity;
      // Player.y += Player.yVelocity;

      // Player.xVelocity *= 0.9;

      // // If the xVelocity is close enough to 0, we set it to 0 for animation purposes.
      // if (Player.xVelocity <= 0.2 && Player.xVelocity >= -0.2) {
      //   Player.xVelocity = 0;
      // }
      // Player.yVelocity += 0.9;

      // /*
      //  * Floor Collision
      //  */
      // if (
      //   Player.y > Floor.height &&
      //   Player.x < Floor.rightX &&
      //   Player.x > Floor.leftX
      // ) {
      //   Player.y = Floor.height;
      //   Player.yVelocity = 0;
      // }

      // // Constraining Player to x range [0, Map Size]
      // Player.x = Math.max(0, Math.min(Player.x, Map.cols * Map.tsize));

      Camera.update();

      /*
       * Background Draw
       */
      c.save();
      c.fillStyle = "rgb(" + Bg1.color + ")";
      c.fillRect(0, 0, c.canvas.width, c.canvas.height);
      c.restore();

      drawBackground(c, Bg0);
      drawBackground(c, Bg1);

      // /*
      //  * Background Object Draw
      //  */
      // for (let i = 0; i < backgroundObjects.length; i++) {
      //   c.drawImage(
      //     backgroundObjects[i].image,
      //     Math.floor(backgroundObjects[i].x - camera.x),
      //     Math.floor(backgroundObjects[i].y)
      //   );
      // }

      // /*
      //  * Microsoft Logo Draw
      //  */
      // rotateArrayItemsAroundCircle(
      //   microsoftRectangles,
      //   CircleCenter.x,
      //   CircleCenter.y,
      //   CircleRadius,
      //   0.01
      // );
      // for (let rect of microsoftRectangles) {
      //   rect.detectMouseHover(c);
      //   rect.draw(c);
      // }

      // // ??? fade in text based off boolean
      // c.save();
      // if (animateText) {
      //   c.globalAlpha = 100 * textAlpha ** 3;
      //   textAlpha += 0.01;
      //   if (c.globalAlpha >= 1) {
      //     animateText = false;
      //   }
      // }

      // /*
      //  * Demos Draw
      //  */
      // for (let i = 0; i < demos.length; i++) {
      //   demos[i].draw(c);
      //   // Hover Effect
      //   if (demos[i].detectMouseHover()) {
      //     drawHoverBox(
      //       c,
      //       demos[i].x,
      //       demos[i].y,
      //       demos[i].width,
      //       demos[i].height,
      //       demos[i].borderColorsTopBottom.length
      //     );
      //   }
      // }

      // Menu Buttons Draw
      // rotateArrayItemsAroundCircle(
      //   menuButtons,
      //   welcomeText.x,
      //   welcomeText.y,
      //   menuBtnsCircleRadius,
      //   0.005
      // );
      // for (let i = 0; i < menuButtons.length; i++) {
      //   menuButtons[i].draw(c);

      //   // Hover effect
      //   if (menuButtons[i].detectMouseHover()) {
      //     drawHoverBox(
      //       c,
      //       menuButtons[i].x,
      //       menuButtons[i].y,
      //       menuButtons[i].width,
      //       menuButtons[i].height,
      //       menuButtons[i].borderColorsTopBottom.length
      //     );
      //   }
      // }

      // /*
      //  * Text Draw
      //  */
      // for (let i = 0; i < welcomeTextArray.length; i++) {
      //   welcomeTextArray[i].draw(c, welcomeTextArray[i]);
      // }

      // for (let i = 0; i < textBubbleArray.length; i++) {
      //   if (
      //     textBubbleArray[i].minX < Player.x &&
      //     textBubbleArray[i].maxX > Player.x
      //   ) {
      //     textBubbleArray[i].draw(c);
      //   }
      // }
      // c.restore();

      // /*
      //  * Player Draw
      //  */
      // drawPlayer(c);

      // /*
      //  * Foreground Object Draw
      //  */
      // for (let i = 0; i < foregroundObjects.length; i++) {
      //   foregroundObjects[i].draw(c);
      // }

      // /*
      //  * Floor Draw todo next
      //  */
      // var startCol = Math.floor(camera.x / Map.tsize);
      // var endCol = startCol + camera.width / Map.tsize + 2;
      // var offsetX = -camera.x + startCol * Map.tsize;

      // for (let column = startCol; column < endCol; column++) {
      //   for (let row = 0; row < Map.rows; row++) {
      //     const tile = Map.getTile(column, row);
      //     const x = (column - startCol) * Map.tsize + offsetX;
      //     const y = row * Map.tsize;

      //     c.drawImage(
      //       tileSheet, // image
      //       tile * Map.tsize, // source x
      //       0, // source y
      //       Map.tsize, // source width
      //       Map.tsize, // source height
      //       Math.floor(x), // target x
      //       Math.floor(y + Floor.height), // target y
      //       Map.tsize, // target width
      //       Map.tsize // target height
      //     );
      //   }
      // }

      // // Mouse Draw
      // drawMouse(demos);
      // if (
      //   Mouse.x > Player.screenX - Player.width / 2 &&
      //   Mouse.x < Player.screenX + Player.width / 2
      // ) {
      //   if (
      //     Mouse.y > Player.screenY - Player.height &&
      //     Mouse.y < Player.screenY
      //   ) {
      //     scrambleDrawPixelsAtMouse(c);
      //   }
      // }

      FrameCountRef.current++;
      if (FrameCountRef.current >= Number.MAX_SAFE_INTEGER) {
        FrameCountRef.current = 0;
      }
    }

    /*
     * Call next frame of animation
     */
    window.requestAnimationFrame(loop);
  }
  // #endregion Animation Loop

  // #region Standalone Functions
  // Standalone functions outside of the component
  // Doesn't depend on React state, not recreated on every rerender

  function drawBackground(
    context: CanvasRenderingContext2D,
    background: Background
  ) {
    for (let i = 0; i < background.locations.length; i++) {
      if (background.locations[i] + background.width < 0) {
        background.locations[i] =
          background.locations[background.currentMaxLocationIndex] +
          background.width;
        background.currentMaxLocationIndex = i;
      }

      background.locations[i] -= background.moveRate;

      context.drawImage(
        background.image,
        Math.floor(background.locations[i]),
        0
      );
    }
  }

  // #region --- Map and Responsive Scaling ---
  function handleCanvasResize(
    context: CanvasRenderingContext2D,
    Map: GameMap,
    Camera: Camera
  ) {
    context.canvas.width = window.innerWidth;
    context.canvas.height = window.innerHeight;

    Camera.width = window.innerWidth;
    Camera.height = window.innerHeight;

    resizeMap(context, Map);
    resizeText(context);
  }

  function resizeMap(context: CanvasRenderingContext2D, Map: GameMap) {
    // if (context.canvas.height >= Floor.height + Map.tsize * 1.5) {
    //   Map.rows = Math.ceil((context.canvas.height - Floor.height) / Map.tsize);
    // } else {
    Map.rows = 2;
    // }

    Map.tiles = new Array(Map.cols * Map.rows);
    Map.tiles.fill(0, 0, Map.cols);
    Map.tiles.fill(1, Map.cols);

    Map.length = Map.cols * Map.tsize;

    cutOffFloorEdgesInMap(Map);
  }

  function cutOffFloorEdgesInMap(Map: GameMap) {
    let row = 0;
    // let rightEndX = textBubbleArray[codingStory.length - 1].maxX; todo text
    for (
      // let j = Math.floor(rightEndX / Map.tsize);
      let j = Math.floor(10000 / Map.tsize);
      j < Map.tiles.length;
      j += Map.cols
    ) {
      row++;
      Map.tiles.fill(2, j, Map.cols * row);
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

  // #endregion

  return (
    <canvas id="canvas" ref={CanvasRef}>
      <header>
        <h1>ʟᴜᴋᴇ ᴍᴜᴇʜʀɪɴɢ</h1>
      </header>
      <main>
        <p>climbing, coding & creating</p>
      </main>
      <p>This canvas displays a 2-D platformer I coded to tell my story.</p>
      <noscript>
        <p>Please enable JavaScript to view this content.</p>
      </noscript>
      <footer>2025 LM</footer>
    </canvas>
  );
}
