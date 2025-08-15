import { useEffect, useRef } from "react";
import {
  calculateHeadingFontSize,
  closeMenu,
  handleCanvasResize,
} from "../lib/helpers";
import "../style.css";
import { Background } from "../types/Background";
import { Camera } from "../types/Camera";
import { Controller } from "../types/Controller";
import { Floor } from "../types/Floor";
import { GameMap } from "../types/GameMap";
import { GameText } from "../types/GameText";
import { Player, PlayerStates } from "../types/Player";

export default function MyCanvas() {
  // #region Singleton global object refs
  const CanvasRef = useRef<HTMLCanvasElement>(null);
  const ContextRef = useRef<CanvasRenderingContext2D | null>(null);

  const Bg0Ref = useRef<Background | null>(null);
  const Bg1Ref = useRef<Background | null>(null);
  const CameraRef = useRef<Camera | null>(null);
  const ControllerRef = useRef<Controller | null>(null);
  const FloorRef = useRef<Floor | null>(null);

  const FrameCountRef = useRef(0);
  const IsUserInputAllowedRef = useRef(true);

  const MapRef = useRef<GameMap | null>(null);
  const PlayerRef = useRef<any>(null);
  const TileSheetImgRef = useRef<HTMLImageElement | null>(null);
  const WelcomeTextArrayRef = useRef<GameText[] | null>(null);
  const CanShowTextRef = useRef<boolean>(false);
  // #endregion

  // #region Game variables
  let AnimateText = false;
  let TextAlpha = 0;

  let PrevTimestamp = 0;
  let SpawnX = 0;

  const ANIMATION_TIME_BUFFER = 30; // Used to time the animation cadence of Player sprite
  const FPS_TARGET = 60;
  const FRAME_DURATION = 1000 / FPS_TARGET; // 16.67 per frame, of 60 frames per second

  const JUMP_HEIGHT = 20;
  const GRAVITY = 1.5;

  const FONT_HEADING = {
    H1: 100,
    H2: 48,
    P: 38,
  };
  // #endregion

  // runs after the component mounts + renders
  useEffect(() => {
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
    // #region Fonts
    const fontInterval = setInterval(() => {
      if (document.fonts.check("12px 'VT323'")) {
        CanShowTextRef.current = true;
        AnimateText = true;
        clearInterval(fontInterval);
        clearTimeout(fontTimeout); // stop fallback since font loaded
      }
    }, 100);

    const fontTimeout = setTimeout(() => {
      CanShowTextRef.current = true;
      AnimateText = true;
      clearInterval(fontInterval);
    }, 1000); // fallback after 1s if browser doesn't load the font

    // #endregion
    const canvas = CanvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) {
      return;
    }
    // Set global singleton refs
    ContextRef.current = c;
    MapRef.current = new GameMap();
    CameraRef.current = new Camera(
      MapRef.current,
      c.canvas.width,
      c.canvas.height
    );

    // change the canvas size to match the screen's to cover it completely.
    if (
      window.innerWidth != c.canvas.width ||
      window.innerHeight != c.canvas.height
    ) {
      handleCanvasResize(c, MapRef.current, CameraRef.current);
    }

    SpawnX = c.canvas.width / 2;
    PlayerRef.current = new Player(SpawnX, imageCache, ANIMATION_TIME_BUFFER);
    CameraRef.current.follow(PlayerRef.current);

    // #region Stage setup
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

    TileSheetImgRef.current = new Image();
    TileSheetImgRef.current.src = "../../images/tiles.png";

    let floorHeight =
      c.canvas.height > Bg0.height
        ? Bg0.height - 1.5 * MapRef.current.tsize
        : c.canvas.height - 1.5 * MapRef.current.tsize;
    FloorRef.current = new Floor(floorHeight, -1000, 1000);
    // #endregion

    // #region Controller setup
    ControllerRef.current = new Controller(
      PlayerRef.current,
      IsUserInputAllowedRef,
      () => closeMenu(IsUserInputAllowedRef)
    );
    // Store stable references for cleanup
    const keydownListener = (event: KeyboardEvent) => {
      ControllerRef.current?.keyListener(event);
    };
    const keyupListener = (event: KeyboardEvent) => {
      ControllerRef.current?.keyListener(event);
    };
    const scrollListener = (event: WheelEvent) => {
      ControllerRef.current?.scrollListener(event);
    };

    // Add listeners
    window.addEventListener("keydown", keydownListener);
    window.addEventListener("keyup", keyupListener);
    window.addEventListener("wheel", scrollListener, { passive: false });
    // #endregion

    // #region Text setup
    if (c.canvas.width <= 500) {
      FONT_HEADING.H1 = 80;
      FONT_HEADING.H2 = 33;
      FONT_HEADING.P = 25;
    }
    const welcomeStr = "HEY, I'M LUKE";
    const welcomeText = new GameText(
      welcomeStr,
      Math.floor(c.canvas.width / 2),
      c.canvas.height <= 730 ? 200 : c.canvas.height / 2,
      calculateHeadingFontSize(c, welcomeStr, FONT_HEADING.H1),
      CanShowTextRef
    );
    WelcomeTextArrayRef.current = [welcomeText];
    // #endregion

    // Cleanup useEffect runs on component unmount
    return () => {
      // Remove all event listeners to prevent memory leaks
      for (const src in imageCache) {
        imageCache[src].removeEventListener("load", trackProgress);
      }
      clearInterval(fontInterval);
      clearTimeout(fontTimeout);
      window.removeEventListener("keydown", keydownListener);
      window.removeEventListener("keyup", keyupListener);
      window.removeEventListener("wheel", scrollListener);
    };
  }, []);

  // #region --- Animation Loop ---
  function loop(timestamp: number) {
    // rename references just for readability
    const c: CanvasRenderingContext2D | null = ContextRef.current;
    const Bg0: Background | null = Bg0Ref.current;
    const Bg1: Background | null = Bg1Ref.current;
    const Camera: Camera | null = CameraRef.current;
    const Controller: Controller | null = ControllerRef.current;
    const Floor: Floor | null = FloorRef.current;
    const Map: GameMap | null = MapRef.current;
    const Player: Player | null = PlayerRef.current;
    const TileSheet: HTMLImageElement | null = TileSheetImgRef.current;
    const WelcomeTextArray: GameText[] | null = WelcomeTextArrayRef.current;

    // calculate time elapsed since last frame
    const deltaTime: number = timestamp - PrevTimestamp;
    if (
      deltaTime >= FRAME_DURATION &&
      c &&
      Map &&
      Camera &&
      Controller &&
      Bg0 &&
      Bg1 &&
      TileSheet &&
      Floor &&
      Player &&
      WelcomeTextArray
    ) {
      PrevTimestamp = timestamp - (deltaTime % FRAME_DURATION);

      /*
       * Responsive Scaling
       */
      if (
        window.innerWidth != c.canvas.width ||
        window.innerHeight != c.canvas.height
      ) {
        handleCanvasResize(c, Map, Camera);
      }

      // #region Updating game state - Camera, Controller, Player
      // If player falls below the floor, respawn and disable user input for 1s
      if (Player.y > Floor.height && IsUserInputAllowedRef.current) {
        IsUserInputAllowedRef.current = false;
        setTimeout(() => {
          Player.x = SpawnX;
          Player.y = 0;
          Player.xVelocity = 0;
          Player.yVelocity = 0;
          IsUserInputAllowedRef.current = true;
        }, 1000);
      }

      if (
        (Controller.up || Controller.left || Controller.right) &&
        IsUserInputAllowedRef.current
      ) {
        Controller.userInputRegistered = true;
        if (Controller.up && Player.state != PlayerStates.Jumping) {
          Player.yVelocity -= JUMP_HEIGHT;
        }
        if (Controller.left) {
          Player.xVelocity -= 0.5;
        }

        if (Controller.right) {
          Player.xVelocity += 0.5;
        }
      }

      // Gravity and Friction
      Player.yVelocity += GRAVITY;
      Player.x += Player.xVelocity;
      Player.y += Player.yVelocity;

      Player.xVelocity *= 0.9;

      // If the xVelocity is close enough to 0, we set it to 0 for animation purposes.
      // Todo - the clipping bug might be from the second condition here.
      if (Player.xVelocity <= 0.2 && Player.xVelocity >= -0.2) {
        Player.xVelocity = 0;
      }
      Player.yVelocity += 0.9;

      // Floor Collision
      if (
        Player.y > Floor.height &&
        Player.x < Floor.rightX &&
        Player.x > Floor.leftX
      ) {
        Player.y = Floor.height;
        Player.yVelocity = 0;
      }

      // Constraining Player to x range [0, Map Size]
      Player.x = Math.max(0, Math.min(Player.x, Map.cols * Map.tsize));

      Camera.update();
      // #endregion Updating game state - Camera, Controller, Player

      // Clear the background TODO is this necessary or is it just wasting paint time cycles
      // c.save();
      // c.fillStyle = "rgb(" + Bg1.color + ")";
      // c.fillRect(0, 0, c.canvas.width, c.canvas.height);
      // c.restore();

      // #region Drawing
      Bg0.draw(c);
      Bg1.draw(c);

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

      // fade in text based off boolean
      c.save();
      if (AnimateText) {
        c.globalAlpha = 100 * TextAlpha ** 3;
        TextAlpha += 0.01;
        if (c.globalAlpha >= 1) {
          AnimateText = false;
        }
      }

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

      /*
       * Text Draw
       */
      for (let i = 0; i < WelcomeTextArray.length; i++) {
        WelcomeTextArray[i].draw(c, Camera.x, Camera.y);
      }

      // for (let i = 0; i < textBubbleArray.length; i++) {
      //   if (
      //     textBubbleArray[i].minX < Player.x &&
      //     textBubbleArray[i].maxX > Player.x
      //   ) {
      //     textBubbleArray[i].draw(c);
      //   }
      // }
      c.restore();

      Player.draw(c, Floor.height, FrameCountRef.current);

      // /*
      //  * Foreground Object Draw
      //  */
      // for (let i = 0; i < foregroundObjects.length; i++) {
      //   foregroundObjects[i].draw(c);
      // }

      /*
       * Floor Draw todo make into simple Draw() function, and move into the actual Floor object
       */
      var startCol = Math.floor(Camera.x / Map.tsize);
      var endCol = startCol + Camera.width / Map.tsize + 2;
      var offsetX = -Camera.x + startCol * Map.tsize;

      for (let column = startCol; column < endCol; column++) {
        for (let row = 0; row < Map.rows; row++) {
          const tile = Map.getTile(column, row) ?? 0; // tile number (0,1,2)
          const x = (column - startCol) * Map.tsize + offsetX;
          const y = row * Map.tsize;

          c.drawImage(
            TileSheet, // image
            tile * Map.tsize, // source x
            0, // source y
            Map.tsize, // source width
            Map.tsize, // source height
            Math.floor(x), // target x
            Math.floor(y + Floor.height), // target y
            Map.tsize, // target width
            Map.tsize // target height
          );
        }
      }

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
      // #endregion Drawing

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
