import { useEffect, useRef, useState } from "react";
import {
  ANIMATION_TIME_BUFFER,
  FONT_HEADING,
  FRAME_DURATION,
} from "../lib/constants";
import {
  calculateHeadingFontSize,
  checkIfObjectClicked,
  handleCanvasResize,
  handleTouchCancel,
  handleTouchEnd,
  handleTouchMove,
  handleTouchStart,
  resizeCamera,
  resizeCanvas,
  resizeMap,
  resizeText,
  setupTextBubblesObjectsAndDemos,
} from "../lib/helpers";
import { CodingStory } from "../lib/story";
import "../style.css";
import { Background } from "../types/Background";
import { Button } from "../types/Button";
import { Camera } from "../types/Camera";
import { Controller } from "../types/Controller";
import { Floor } from "../types/Floor";
import { GameMap } from "../types/GameMap";
import { GameText } from "../types/GameText";
import { ImageObject } from "../types/ImageObject";
import { Mouse } from "../types/Mouse";
import { Player } from "../types/Player";
import type { TextBubble } from "../types/TextBubble";
import DemoModal from "./DemoModal/DemoModal";
import RecordingVisualizerMock, {
  type RecordingVisualizerHandle,
} from "./RecordingPopup/RecordingVisualizerMock";

export default function MyCanvas({
  IsUserInputAllowedRef,
  IsDemoModalOpenRef,
  onRefChange,
  PlayerRef,
  DemosRef,
}: {
  IsUserInputAllowedRef: React.RefObject<boolean>;
  IsDemoModalOpenRef: React.RefObject<boolean>;
  onRefChange: () => void;
  PlayerRef: React.RefObject<Player | null>;
  DemosRef: React.RefObject<Button[] | null>;
}) {
  const visualizerRef = useRef<RecordingVisualizerHandle>(null);

  const [demoModal, setDemoModal] = useState<any | null>(null);
  const handleOpenModal = (demo: any) => {
    setDemoModal(demo);
    IsUserInputAllowedRef.current = false;
    IsDemoModalOpenRef.current = true;
    Button.IsModalOpen = true;
    onRefChange();
  };

  const handleCloseModal = () => {
    setDemoModal(null);
    IsUserInputAllowedRef.current = true;
    IsDemoModalOpenRef.current = false;
    Button.IsModalOpen = false;
    onRefChange();
  };

  // #region Singleton global object refs
  const BackgroundObjectsRef = useRef<ImageObject[] | null>(null);
  const Bg0Ref = useRef<Background | null>(null);
  const Bg1Ref = useRef<Background | null>(null);
  const CameraRef = useRef<Camera | null>(null);
  const CanShowTextRef = useRef<boolean>(false);
  const CanvasRef = useRef<HTMLCanvasElement>(null);
  const ContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const ControllerRef = useRef<Controller | null>(null);
  const ForegroundObjectsRef = useRef<ImageObject[] | null>(null);
  const FloorRef = useRef<Floor | null>(null);
  const FrameCountRef = useRef(0);
  const MapRef = useRef<GameMap | null>(null);
  const MouseRef = useRef<Mouse | null>(null);
  const TextBubbleArrayRef = useRef<TextBubble[] | null>(null);
  const TileSheetImgRef = useRef<HTMLImageElement | null>(null);
  const WelcomeTextArrayRef = useRef<GameText[] | null>(null);
  const RecordingVisualizerRef = useRef<ImageObject | null>(null);

  // #endregion

  // #region Game variables
  let AnimateText = false;
  let TextAlpha = 0;

  let PrevTimestamp = 0;
  let SpawnX = 0;
  let MapMaxX = 0;
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
    const CANVAS_DOM_ELEMENT = CanvasRef.current;
    const c = CANVAS_DOM_ELEMENT?.getContext("2d", {
      willReadFrequently: true,
    });
    if (!CANVAS_DOM_ELEMENT || !c) {
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
      resizeCanvas(c);
    }

    SpawnX = c.canvas.width / 2;
    PlayerRef.current = new Player(
      SpawnX,
      imageCache,
      ANIMATION_TIME_BUFFER,
      IsUserInputAllowedRef
    );
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

    // #region Mouse
    MouseRef.current = new Mouse(IsDemoModalOpenRef);

    // #endregion Mouse
    // #region Controller setup
    ControllerRef.current = new Controller(
      PlayerRef.current,
      IsUserInputAllowedRef
    );
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

    // Text Bubbles (above player), objects, and demos
    const cornerImage = new Image();
    cornerImage.src = "./images/DialogCorners.png";

    const triangleImage = new Image();
    triangleImage.src = "./images/DialogTriangle.png";

    const textBubbleArray: TextBubble[] = [];
    const backgroundObjects: ImageObject[] = [];
    const foregroundObjects: ImageObject[] = [];
    const demos: Button[] = [];

    setupTextBubblesObjectsAndDemos(
      c,
      CANVAS_DOM_ELEMENT,
      FloorRef.current,
      PlayerRef.current,
      MapRef.current,
      CanShowTextRef,
      IsUserInputAllowedRef,
      cornerImage,
      triangleImage,
      textBubbleArray,
      backgroundObjects,
      foregroundObjects,
      demos,
      handleOpenModal
    );

    TextBubbleArrayRef.current = textBubbleArray;
    BackgroundObjectsRef.current = backgroundObjects;
    ForegroundObjectsRef.current = foregroundObjects;
    DemosRef.current = demos;

    // #endregion
    MapMaxX = textBubbleArray[CodingStory.length - 1].maxX;
    resizeCamera(c, CameraRef.current);
    resizeMap(c, MapRef.current, FloorRef.current, MapMaxX);
    resizeText(c, DemosRef.current, TextBubbleArrayRef.current);

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
    const mouseDownListener = (_event: MouseEvent) => {
      if (MouseRef.current) {
        MouseRef.current.startDrag();
      }
    };
    const mouseMoveListener = (event: MouseEvent) => {
      MouseRef.current?.update(event.clientX, event.clientY);
    };
    const mouseUpListener = (_event: MouseEvent) => {
      if (MouseRef.current) {
        MouseRef.current.stopDrag();
      }
    };

    const onClickListener = (_event: MouseEvent) => {
      const obj = checkIfObjectClicked(
        DemosRef.current ?? [],
        PlayerRef.current
      );
      if (obj) {
        obj.onClick(obj);
      }
    };

    const touchStartListener = (evt: TouchEvent) => {
      if (ControllerRef.current && MouseRef.current) {
        handleTouchStart(evt, ControllerRef.current, MouseRef.current);
      }
    };
    const touchMoveListener = (evt: TouchEvent) => {
      if (PlayerRef.current) {
        handleTouchMove(
          evt,
          IsUserInputAllowedRef.current ?? true,
          PlayerRef.current
        );
      }
    };
    const touchEndListener = (evt: TouchEvent) => {
      handleTouchEnd(evt);
    };
    const touchCancelListener = (evt: TouchEvent) => {
      handleTouchCancel(evt);
    };

    // Add listeners
    window.addEventListener("keydown", keydownListener);
    window.addEventListener("keyup", keyupListener);
    window.addEventListener("wheel", scrollListener, { passive: false });
    window.addEventListener("mousedown", mouseDownListener);
    window.addEventListener("mousemove", mouseMoveListener);
    window.addEventListener("mouseup", mouseUpListener);

    window.addEventListener("click", onClickListener);

    window.addEventListener("touchstart", touchStartListener); // passive by default
    window.addEventListener("touchmove", touchMoveListener, { passive: false });
    window.addEventListener("touchend", touchEndListener); // passive by default
    window.addEventListener("touchcancel", touchCancelListener, {
      passive: false,
    });

    // Cleanup useEffect - runs on component unmount
    // Remove all event listeners to prevent memory leaks
    return () => {
      for (const src in imageCache) {
        imageCache[src].removeEventListener("load", trackProgress);
      }
      clearInterval(fontInterval);
      clearTimeout(fontTimeout);
      window.removeEventListener("keydown", keydownListener);
      window.removeEventListener("keyup", keyupListener);
      window.removeEventListener("wheel", scrollListener);
      window.removeEventListener("mousedown", mouseDownListener);
      window.removeEventListener("mousemove", mouseMoveListener);
      window.removeEventListener("mouseup", mouseUpListener);
      window.removeEventListener("click", onClickListener);

      window.removeEventListener("touchstart", touchStartListener);
      window.removeEventListener("touchmove", touchMoveListener);
      window.removeEventListener("touchend", touchEndListener);
      window.removeEventListener("touchcancel", touchCancelListener);
    };
  }, []);

  // #region --- Animation Loop ---
  function loop(timestamp: number) {
    // rename references just for readability
    const BackgroundObjects: ImageObject[] | null =
      BackgroundObjectsRef.current;
    const Bg0: Background | null = Bg0Ref.current;
    const Bg1: Background | null = Bg1Ref.current;
    const c: CanvasRenderingContext2D | null = ContextRef.current;
    const Canvas: HTMLCanvasElement | null = CanvasRef.current;
    const Camera: Camera | null = CameraRef.current;
    const Controller: Controller | null = ControllerRef.current;
    const Demos: Button[] | null = DemosRef.current;
    const ForegroundObjects: ImageObject[] | null =
      ForegroundObjectsRef.current;
    const Floor: Floor | null = FloorRef.current;
    const Map: GameMap | null = MapRef.current;
    const Mouse: Mouse | null = MouseRef.current;
    const Player: Player | null = PlayerRef.current;
    const TextBubbleArray: TextBubble[] | null = TextBubbleArrayRef.current;
    const TileSheet: HTMLImageElement | null = TileSheetImgRef.current;
    const WelcomeTextArray: GameText[] | null = WelcomeTextArrayRef.current;

    // calculate time elapsed since last frame
    const deltaTime: number = timestamp - PrevTimestamp;
    if (
      deltaTime >= FRAME_DURATION &&
      BackgroundObjects &&
      Bg0 &&
      Bg1 &&
      c &&
      Canvas &&
      Camera &&
      Controller &&
      Demos &&
      ForegroundObjects &&
      Floor &&
      Map &&
      Mouse &&
      Player &&
      TextBubbleArray &&
      TileSheet &&
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
        handleCanvasResize(
          c,
          Camera,
          Demos,
          Map,
          Floor,
          TextBubbleArray,
          MapMaxX
        );
      }

      // default background is bg_1 cloud color
      c.save();
      c.fillStyle = "#cbf0ff";
      c.fillRect(0, 0, c.canvas.width, c.canvas.height);
      c.restore();

      // #region Updating game state - Camera, Controller, Player
      // If player falls below the floor, respawn and disable user input for 1s
      // todo move to PLayer file
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

      Controller.update();
      Player.update(Floor, Map, Mouse, Camera);
      Camera.update();
      // #endregion Updating game state - Camera, Controller, Player

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

      /*
       * Demos Draw
       */
      for (let i = 0; i < Demos.length; i++) {
        Demos[i].draw(c, Camera.x);
        if (Demos[i].detectMouseHover(Mouse.x, Mouse.y, Camera.x)) {
          Demos[i].drawHoverBox(c, Camera.x, Camera.y);
        }
      }

      /*
       * Text Draw
       */
      for (let i = 0; i < WelcomeTextArray.length; i++) {
        WelcomeTextArray[i].draw(c, Camera.x, Camera.y);
      }

      for (let i = 0; i < TextBubbleArray.length; i++) {
        // only draw if within player x bounds
        if (
          TextBubbleArray[i].minX < Player.x &&
          TextBubbleArray[i].maxX > Player.x
        ) {
          TextBubbleArray[i].draw(c);
        }
      }
      c.restore();

      Player.draw(c, Floor.height, FrameCountRef.current);

      /*
       * Foreground Object Draw
       */
      for (let i = 0; i < ForegroundObjects.length; i++) {
        ForegroundObjects[i].draw(c, Camera.x);
      }

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

      // Mouse Draw
      Mouse.draw(c, Canvas, Demos, [Player]);

      // Waveform Vizualizer draw
      const RecVizCanvas = RecordingVisualizerRef.current;
      if (RecVizCanvas) {
        RecVizCanvas.draw(c, Camera.x);
      }

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

  function setRecordingVisualzer(el: HTMLCanvasElement | null): void {
    const demos = DemosRef.current;

    if (!el || !demos) return;
    el.width = demos[1].width;
    const destX = demos[1].x - el.width / 2;
    const destY = demos[1].y - el.height / 2;
    RecordingVisualizerRef.current = new ImageObject(destX, destY, el, "hue");
  }
  // #endregion

  return (
    <>
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
      {demoModal && (
        <DemoModal
          content={demoModal.content}
          headerText={demoModal.headerText}
          images={demoModal.images}
          text={demoModal.text}
          link={demoModal.link}
          onClose={handleCloseModal}
        />
      )}
      <div className="hidden">
        <RecordingVisualizerMock
          ref={visualizerRef}
          isActive={true}
          managed={false}
          onCanvasReady={setRecordingVisualzer}
        />
      </div>
      {/* <div className="absolute top-48 right-0 z-[50000]">
        <button
          className=" text-white"
          onClick={() => visualizerRef.current?.start()}
        >
          Start
        </button>
        <button className="z-50" onClick={() => visualizerRef.current?.stop()}>
          Stop
        </button>
      </div> */}
    </>
  );
}
