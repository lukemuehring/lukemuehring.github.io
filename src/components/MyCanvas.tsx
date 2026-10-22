import { useEffect, useRef, useState } from "react";
import {
  ANIMATION_TIME_BUFFER,
  FONT_HEADING,
  FRAME_DURATION,
  NAV_TARGETS,
} from "../lib/constants";
import { advanceOf } from "../lib/handjetDots";
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
  setupAboutMe,
} from "../lib/helpers";
import "../style.css";
import { Background } from "../types/Background";
import { Button } from "../types/Button";
import { Camera } from "../types/Camera";
import { Controller } from "../types/Controller";
import { Floor } from "../types/Floor";
import { GameMap } from "../types/GameMap";
import { GameText } from "../types/GameText";
import { ImageObject } from "../types/ImageObject";
import { Marker } from "../types/Marker";
import { Mouse } from "../types/Mouse";
import { Player } from "../types/Player";
import type { TextBubble } from "../types/TextBubble";
import DemoModal from "./DemoModal/DemoModal";

/** computer_off.png and its on frames: Cave Story's PC, cut from the sheet at 6x. */
const COMPUTER_MARKER_WIDTH_PX = 156;
const COMPUTER_MARKER_HEIGHT_PX = 102;
/** The chair, measured from the sprite's left edge - where the nav parks the character. */
const COMPUTER_MARKER_CHAIR_X_PX = 45;

/**
 * Horizontal stretch of the welcome word. Shared between the GameText that draws it and
 * the fit loop that sizes it, which would otherwise measure an unstretched word and let
 * the drawn one run off the screen.
 */
const WELCOME_WIDTH_SCALE = 1.25;

/**
 * Extra space between the welcome word's letters, in grid cells. Handjet sets F beside
 * W half a cell apart where most pairs get two, and the heavier dots eat into that from
 * both sides, so without this they very nearly touch.
 */
const WELCOME_LETTER_SPACING = 0.5;

/**
 * Game Boy wordmark palette, at the saturation the flash wants rather than the print
 * pastels of the logo - the hues are the logo's, the chroma is not. These are waypoints
 * for the intro sweep only; every letter washes out to the themed text colour as it
 * lands, which is what keeps the resting word legible on both backgrounds.
 */
const WELCOME_PALETTE = ["#3b5af7", "#1ed411", "#f349e3", "#ee472b"];

/**
 * Stretches the entrance - the letters' fade-in, the stagger between them and the hop
 * that rides along with it.
 *
 * Not the sheen: it is scheduled off the end of the wave rather than at a fixed time,
 * so it still waits for the slower entrance to finish and then sweeps at its own pace.
 * Nor the click hop, which is its own interaction and a long way from here by then.
 */
const WELCOME_INTRO_SLOWDOWN = 1.3;
const slowed = (ms: number) => Math.round(ms * WELCOME_INTRO_SLOWDOWN);

/**
 * The lean builds across the word rather than sitting flat on every letter. The Game
 * Boy wordmark itself is upright, so set the end to 0 to match it exactly.
 */
const WELCOME_ITALIC_SLANT_START = 0;
const WELCOME_ITALIC_SLANT_END = 0.12;

export default function MyCanvas({
  IsUserInputAllowedRef,
  IsDemoModalOpenRef,
  onRefChange,
  PlayerRef,
  DemosRef,
  ControllerRef,
  darkModeRef,
  darkModeValue,
  startRouteTransition,
}: {
  IsUserInputAllowedRef: React.RefObject<boolean>;
  IsDemoModalOpenRef: React.RefObject<boolean>;
  onRefChange: () => void;
  PlayerRef: React.RefObject<Player | null>;
  DemosRef: React.RefObject<Button[] | null>;
  ControllerRef: React.RefObject<Controller | null>;
  darkModeRef: React.RefObject<boolean>;
  darkModeValue: boolean;
  /** Plays the full-screen wipe, then routes. Owned by App, which outlives this route. */
  startRouteTransition: (to: string) => void;
}) {
    const [demoModal, setDemoModal] = useState<any | null>(null);

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
  const DialogTriangleImageRef = useRef<HTMLImageElement | null>(null);
  const ForegroundObjectsRef = useRef<ImageObject[] | null>(null);
  const FloorRef = useRef<Floor | null>(null);
  const FrameCountRef = useRef(0);
  const GrassMarkerImgRef = useRef<HTMLImageElement | null>(null);
  const MapRef = useRef<GameMap | null>(null);
  const MouseRef = useRef<Mouse | null>(null);
  const TextBubbleArrayRef = useRef<TextBubble[] | null>(null);
  const TileSheetImgRef = useRef<HTMLImageElement | null>(null);
  const WelcomeTextArrayRef = useRef<GameText[] | null>(null);
  const WebsiteUiImgRef = useRef<HTMLImageElement | null>(null);
  const RecordingVisualizerRef = useRef<ImageObject | null>(null);
  const BlogMarkerRef = useRef<Marker | null>(null);
  /** The pending animation frame, so unmounting can stop the loop rather than leak it. */
  const LoopFrameRef = useRef<number | null>(null);
  const IsUnmountedRef = useRef(false);

  // #endregion

  // #region Game variables
  let AnimateText = false;
  let TextAlpha = 0;

  let PrevTimestamp = 0;
  let SpawnX = 0;
  let MapMaxX = 0;

  let oldDarkMode = darkModeRef.current;
  // #endregion

  // runs after the component mounts + renders
  useEffect(() => {
    // Reset rather than initialise: in StrictMode this effect is torn down and re-run,
    // and the ref survives in between.
    IsUnmountedRef.current = false;

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
      "./images/player/jump_0_dark.png",
      "./images/player/stand1_0_dark.png",
      "./images/player/stand1_1_dark.png",
      "./images/player/stand1_2_dark.png",
      "./images/player/walk1_0_dark.png",
      "./images/player/walk1_1_dark.png",
      "./images/player/walk1_2_dark.png",
      "./images/player/walk1_3_dark.png",
      "./images/grass1_dark.png",
      "./images/website_pixel.png",
      "./images/website_pixel_dark.png",
      "./images/computer_off.png",
      "./images/computer_on.png",
      "./images/computer_on_2.png",
    ];

    let loadedImages = 0;

    function trackProgress() {
      loadedImages++;
      if (loadedImages === imagePathArray.length && !IsUnmountedRef.current) {
        LoopFrameRef.current = window.requestAnimationFrame(loop);
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
    // The canvas draws with the "Handjet Solid" alias, which no DOM element
    // uses, so nothing would trigger its download. Kick it off explicitly.
    document.fonts.load("12px 'Handjet Solid'");

    const fontInterval = setInterval(() => {
      if (document.fonts.check("12px 'Handjet Solid'")) {
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
      c.canvas.height,
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
      IsUserInputAllowedRef,
    );
    CameraRef.current.follow(PlayerRef.current);

    // #region Stage setup
    Bg0Ref.current = new Background({
      width: 1984,
      height: 1088,
      imageSrc: "./images/bg_0.png",
      moveRate: 0.5,
    });
    const Bg0 = Bg0Ref.current;
    if (!Bg0) return;

    let numBgImages = Math.ceil(MapRef.current.length / Bg0.width) + 1;

    Bg0.locations = Array.from(
      { length: numBgImages },
      (_, index) => index * Bg0.width,
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
      (_, index) => index * Bg1.width,
    );
    Bg1.currentMaxLocationIndex = Bg1.locations.length - 1;

    GrassMarkerImgRef.current = new Image();
    GrassMarkerImgRef.current.src = darkModeValue
      ? "./images/grass1_dark.png"
      : "./images/grass1.png";

    TileSheetImgRef.current = new Image();
    TileSheetImgRef.current.src = darkModeValue
      ? "./images/tiles_dark.png"
      : "./images/tiles.png";
    let floorHeight =
      c.canvas.height > Bg0.height
        ? Bg0.height - 1.5 * MapRef.current.tsize
        : c.canvas.height - 1.5 * MapRef.current.tsize;

    MapMaxX = 10000;
    FloorRef.current = new Floor(floorHeight, -1000, MapMaxX);

    // #endregion

    // #region Mouse
    MouseRef.current = new Mouse(IsDemoModalOpenRef);

    // #endregion Mouse
    // #region Controller setup
    ControllerRef.current = new Controller(
      PlayerRef.current,
      FloorRef.current,
      IsUserInputAllowedRef,
    );
    // #endregion

    // #region Text setup
    if (c.canvas.width <= 500) {
      FONT_HEADING.H1 = 80;
      FONT_HEADING.H2 = 33;
      FONT_HEADING.P = 25;
    }
    const welcomeStr = "luke muehring";
    const welcomeText = new GameText(
      welcomeStr,
      Math.floor(c.canvas.width / 2),
      c.canvas.height <= 730 ? 200 : c.canvas.height / 2,
      calculateHeadingFontSize(
        c,
        welcomeStr,
        FONT_HEADING.H1,
        // The fit loop measures with the font, which knows about neither the stretch
        // nor the tracking, so both are folded into the scale it budgets against.
        WELCOME_WIDTH_SCALE *
          (1 +
            (WELCOME_LETTER_SPACING * (welcomeStr.length - 1)) /
              advanceOf(welcomeStr)),
      ),
      CanShowTextRef,
      {
        dots: true,
        dotScale: 1.4,
        widthScale: WELCOME_WIDTH_SCALE,
        letterSpacing: WELCOME_LETTER_SPACING,
        italicSlantStart: WELCOME_ITALIC_SLANT_START,
        italicSlantEnd: WELCOME_ITALIC_SLANT_END,
        introPalette: WELCOME_PALETTE,
        explodeStrength: 90,
        explodeRadius: 120,
        explodeDuration: 450,
        recoverDelay: 3000,
        recoverDuration: 350,
        rumbleDuration: 900,
        rumbleAmplitude: 1.2,
        rumbleStep: 60,
        sheen: true,
        sheenDuration: 550,
        introDuration: slowed(600),
        introStagger: slowed(55),
        introScale: 3,
        introOffsetX: 50,
        introOffsetY: 50,
        introSaturation: 100,
        introLightness: 50,
        introHueTurns: 1,
        jumpHeight: 0.22,
        introJumpHeight: 0.65,
        jumpStagger: 40,
        jumpDuration: 320,
        introJumpDuration: slowed(400),
        jumpWithIntro: true,
      },
    );
    WelcomeTextArrayRef.current = [welcomeText];

    // Text Bubbles (above player), objects, and demos
    const cornerImage = new Image();
    cornerImage.src = "./images/DialogCorners.png";

    DialogTriangleImageRef.current = new Image();
    DialogTriangleImageRef.current.src = darkModeValue
      ? "./images/DialogTriangle_dark.png"
      : "./images/DialogTriangle.png";

    WebsiteUiImgRef.current = new Image();
    WebsiteUiImgRef.current.src = darkModeValue
      ? "./images/website_pixel_dark.png"
      : "./images/website_pixel.png";

    const textBubbleArray: TextBubble[] = [];
    const backgroundObjects: ImageObject[] = [];
    const foregroundObjects: ImageObject[] = [];
    const demos: Button[] = [];

    TextBubbleArrayRef.current = textBubbleArray;
    BackgroundObjectsRef.current = backgroundObjects;
    ForegroundObjectsRef.current = foregroundObjects;
    DemosRef.current = demos;

    // #endregion
    
    // #region About Me Setup
    setupAboutMe(
      c,
      CANVAS_DOM_ELEMENT,
      FloorRef.current,
      ControllerRef.current,
      PlayerRef.current,
      MapRef.current,
      GrassMarkerImgRef.current,
      CanShowTextRef,
      IsUserInputAllowedRef,
      cornerImage, // why is this not a ref? No need to switch in dark mode?
      DialogTriangleImageRef.current,
      textBubbleArray,
      backgroundObjects,
      WebsiteUiImgRef.current,
      foregroundObjects
    );

    MapMaxX = FloorRef.current.rightX;

    // #region Blog marker
    BlogMarkerRef.current = new Marker({
      x: ControllerRef.current.targetForFraction(NAV_TARGETS.BLOG),
      image: imageCache["./images/computer_off.png"],
      width: COMPUTER_MARKER_WIDTH_PX,
      height: COMPUTER_MARKER_HEIGHT_PX,
      anchorX: COMPUTER_MARKER_CHAIR_X_PX,
      activeFrames: [
        imageCache["./images/computer_on.png"],
        imageCache["./images/computer_on_2.png"],
      ],
      label: "BLOG",
      // The nav parks the character right on top of this, and they are drawn over it,
      // so the label has to clear their head rather than sit just above the monitor.
      labelOffsetY: PlayerRef.current.height - COMPUTER_MARKER_HEIGHT_PX + 20,
      onClick: () => startRouteTransition("/blog"),
    });
    BlogMarkerRef.current.standOn(FloorRef.current.height);
    // #endregion

    // MapMaxX is set so the collision edge and the floor end-cap stay in sync.
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
      // The marker routes away, so it only answers while the game is taking input: a
      // click that lands during a respawn, or with the nav menu open, is not a click on
      // the world.
      const blogMarker = BlogMarkerRef.current;
      if (blogMarker?.hover && IsUserInputAllowedRef.current) {
        blogMarker.click();
        return;
      }

      // Replay the welcome hop when its text is clicked. .hover is refreshed
      // every frame from the cursor position, so no coordinates are needed here.
      const mouse = MouseRef.current;
      if (mouse) {
        for (const text of WelcomeTextArrayRef.current ?? []) {
          // Blow the dots apart from the click point. No hop: the click is
          // only the explosion now.
          if (text.hover) text.explode({ x: mouse.x, y: mouse.y });
        }
      }

      const obj = checkIfObjectClicked(
        DemosRef.current ?? [],
        PlayerRef.current,
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
        // handleTouchMove writes xVelocity directly and has no Controller reference,
        // so an auto-walk has to be cancelled here rather than inside it.
        ControllerRef.current?.cancelAutoWalk();
        handleTouchMove(
          evt,
          IsUserInputAllowedRef.current ?? true,
          PlayerRef.current,
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
      // Routing to the blog unmounts this component while the loop is still queued. Left
      // alone it would spin forever against a dead canvas, and coming back to "/" would
      // start a second one alongside it - two loops, everything at double speed.
      IsUnmountedRef.current = true;
      if (LoopFrameRef.current !== null) {
        window.cancelAnimationFrame(LoopFrameRef.current);
        LoopFrameRef.current = null;
      }

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
    const darkMode = darkModeRef.current;
    const Demos: Button[] | null = DemosRef.current;
    const DialogTriangleImage: HTMLImageElement | null =
      DialogTriangleImageRef.current;
    const ForegroundObjects: ImageObject[] | null =
      ForegroundObjectsRef.current;
    const Floor: Floor | null = FloorRef.current;
    const GrassMarkerImage: HTMLImageElement | null = GrassMarkerImgRef.current;
    const Map: GameMap | null = MapRef.current;
    const Mouse: Mouse | null = MouseRef.current;
    const Player: Player | null = PlayerRef.current;
    const TextBubbleArray: TextBubble[] | null = TextBubbleArrayRef.current;
    const TileSheet: HTMLImageElement | null = TileSheetImgRef.current;
    const WelcomeTextArray: GameText[] | null = WelcomeTextArrayRef.current;
    const WebsiteUiImg: HTMLImageElement | null = WebsiteUiImgRef.current;
    const BlogMarker: Marker | null = BlogMarkerRef.current;

    // check if dark mode changed
    let darkModeChanged = false;
    if (darkMode !== oldDarkMode) {
      darkModeChanged = true;
      oldDarkMode = darkMode;
    }

    // calculate time elapsed since last frame
    const deltaTime: number = timestamp - PrevTimestamp;
    if (
      (deltaTime >= FRAME_DURATION || darkModeChanged) &&
      BackgroundObjects &&
      Bg0 &&
      Bg1 &&
      c &&
      Canvas &&
      Camera &&
      Controller &&
      Demos &&
      DialogTriangleImage &&
      ForegroundObjects &&
      Floor &&
      GrassMarkerImage &&
      Map &&
      Mouse &&
      Player &&
      TextBubbleArray &&
      TileSheet &&
      WelcomeTextArray &&
      WebsiteUiImg
    ) {
      PrevTimestamp = timestamp - (deltaTime % FRAME_DURATION);

      // Respond to dark mode change
      if (darkModeChanged) {
        TileSheet.src = darkMode
          ? "./images/tiles_dark.png"
          : "./images/tiles.png";

        GrassMarkerImage.src = darkMode
          ? "./images/grass1_dark.png"
          : "./images/grass1.png";

        DialogTriangleImage.src = darkMode
          ? "./images/DialogTriangle_dark.png"
          : "./images/DialogTriangle.png";

        WebsiteUiImg.src = darkMode
          ? "./images/website_pixel_dark.png"
          : "./images//website_pixel.png";
      }

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
          MapMaxX,
        );
      }

      // default background is bg_1 cloud color
      c.save();
      c.fillStyle = darkMode ? "#252628" : "#cbf0ff";
      //todo11
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
      Bg0.draw(c, darkMode);
      Bg1.draw(c, darkMode);

      // /*
      //  * Background Object Draw
      //  */
      for (let i = 0; i < BackgroundObjects.length; i++) {
        BackgroundObjects[i].draw(c, Camera.x);
      }

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
        Demos[i].draw(c, Camera.x, darkMode);
        if (Demos[i].detectMouseHover(Mouse.x, Mouse.y, Camera.x)) {
          Demos[i].drawHoverBox(c, Camera.x, Camera.y);
        }
      }

      /*
       * Text Draw
       */
      for (let i = 0; i < WelcomeTextArray.length; i++) {
        WelcomeTextArray[i].draw(c, Camera.x, Camera.y, darkMode);
        WelcomeTextArray[i].detectMouseHover(Mouse.x, Mouse.y);
      }

      for (let i = 0; i < TextBubbleArray.length; i++) {
        // only draw if within player x bounds
        if (
          TextBubbleArray[i].minX < Player.x &&
          TextBubbleArray[i].maxX > Player.x
        ) {
          let _: number = 0; // camera x and y not used in TextBubble draw currently
          TextBubbleArray[i].draw(c, _, _, darkMode);
        }
      }
      c.restore();

      /*
       * Blog Marker Draw - before the Player, so the character walks in front of the
       * marker rather than disappearing behind it when they come to a stop on it.
       */
      if (BlogMarker) {
        // Re-parked every frame so the sprite follows the floor if it ever moves; it is
        // a subtraction, and a marker floating in mid-air is a worse bug than the cost.
        BlogMarker.standOn(Floor.height);
        BlogMarker.detectPlayerNear(Player.x);
        if (IsUserInputAllowedRef.current) {
          BlogMarker.detectMouseHover(Mouse.x, Mouse.y, Camera.x);
        } else {
          BlogMarker.hover = false;
        }
        BlogMarker.draw(c, Camera.x, darkMode);
      }

      Player.draw(
        c,
        Floor.height,
        FrameCountRef.current,
        darkMode,
        darkModeChanged,
      );

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
            Map.tsize, // target height
          );
        }
      }

      // Mouse Draw
      Mouse.draw(c, Canvas, Demos, [Player], WelcomeTextArray, [BlogMarker]);

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
    if (IsUnmountedRef.current) return;
    LoopFrameRef.current = window.requestAnimationFrame(loop);
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
          <h1>ｌｕｋｅ　ｍｕｅｈｒｉｎｇ</h1>
        </header>
        <main>
          <p>climbing, coding & creating</p>
        </main>
        <p>This canvas displays a 2-D platformer I coded to tell my story.</p>
        <noscript>
          <p>Please enable JavaScript to view this content.</p>
        </noscript>
        <footer>2026 LM</footer>
      </canvas>
      {demoModal && (
        <DemoModal
          content={demoModal.content}
          headerText={demoModal.headerText}
          images={demoModal.images}
          text={demoModal.text}
          link={demoModal.link}
          darkMode={darkModeValue}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
