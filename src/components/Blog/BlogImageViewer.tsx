import { useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { aspectRatioFor } from "../../lib/blogImages";
import "./Blog.css";

interface BlogImageViewerProps {
  /** The full-resolution file, as the post imported it. */
  src: string;
  /** The copy the post is already showing, so there is a photo up while src loads. */
  previewSrc: string;
  alt: string;
  /**
   * Where the photo sits in the post, for it to grow out of and shrink back into.
   * Must keep one identity across renders, or the opening replays on every render.
   */
  getOriginRect: () => DOMRect | null;
  onClose: () => void;
}

interface TransitionElements {
  backdrop: HTMLElement;
  frame: HTMLElement;
  toolbar: HTMLElement;
}

/** Where a mouse drag across a zoomed photo began, in the pointer and the scroller. */
interface DragStart {
  pointerId: number;
  clientX: number;
  clientY: number;
  scrollLeft: number;
  scrollTop: number;
}

/** The photo growing out of the post, and the background fading in. */
const OPEN_DURATION_MS = 280;

/** The photo shrinking back into the post, and the background fading out. */
const CLOSE_DURATION_MS = 220;

/** The close button fading in. Longer than the photo, so it settles in after it. */
const BUTTON_FADE_IN_MS = 800;

/** The close button fading out. The viewer stays open until this finishes too. */
const BUTTON_FADE_OUT_MS = 350;

/** The photo growing to its zoomed size, or shrinking back to fit. */
const ZOOM_DURATION_MS = 250;

/** How far a press on the photo can move and still be a click rather than a drag. */
const DRAG_THRESHOLD_PX = 4;

/**
 * Quick off the mark and easing into place, both ways: the photo arrives rather than
 * lands, and the background starts fading the moment the viewer is asked to close.
 */
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

/**
 * The share of the close, at its end, over which the photo fades out. The viewer sits
 * over everything, the blog's sticky header included, so a photo landing on a spot the
 * header covers would sit on top of it until the dialog closed. Fading hands over to
 * the post's own photo, identical underneath, with the header in place.
 */
const HANDOFF_FRACTION = 0.35;

/**
 * Centres a photo wider than the screen, with its top edge at the top of the screen.
 * @param scroller - The viewer's scroll container.
 */
function centerScroller(scroller: HTMLElement) {
  scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
  scroller.scrollTop = 0;
}

/**
 * Builds the transform that lays the viewer's photo back over its spot in the post.
 * The two share an aspect ratio, so one scale covers both sides.
 * @param origin - The photo's box in the post.
 * @param frame - The photo's box in the viewer, untransformed.
 * @returns A transform for an element whose transform-origin is its top left corner.
 */
function transformOnto(origin: DOMRect, frame: DOMRect): string {
  const translate = `translate(${origin.left - frame.left}px, ${origin.top - frame.top}px)`;
  return `${translate} scale(${origin.width / frame.width})`;
}

/**
 * Plays the move between the post and the viewer: the photo travels between its spot
 * in the post and its place here while the backdrop and the controls fade.
 * prefers-reduced-motion keeps the fades and drops the travel.
 * @param elements - The viewer's backdrop, photo frame and toolbar.
 * @param origin - The photo's box in the post, or null to fade the photo instead.
 * @param isOpening - True to play in from the post, false to play back out to it.
 * @returns Every animation it started, for a close to wait on before shutting.
 */
function playTransition(
  elements: TransitionElements,
  origin: DOMRect | null,
  isOpening: boolean
): Array<Animation> {
  const { backdrop, frame, toolbar } = elements;
  // A close during the opening has to measure the photo at rest, not wherever the
  // opening had carried it, which getBoundingClientRect would report.
  for (const element of [backdrop, frame, toolbar]) {
    for (const animation of element.getAnimations()) animation.cancel();
  }
  const isMotionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hiddenFade = { opacity: 0 };
  const shownFade = { opacity: 1 };
  const postPhoto =
    origin && !isMotionReduced
      ? { transform: transformOnto(origin, frame.getBoundingClientRect()) }
      : hiddenFade;
  const viewerPhoto = origin && !isMotionReduced ? { transform: "none" } : shownFade;

  // Closing plays its own keyframes forwards rather than the opening in reverse, which
  // would reverse the easing too and hold everything still until a snap at the end.
  const keyframesFor = (postSide: Keyframe, viewerSide: Keyframe): Array<Keyframe> =>
    isOpening ? [postSide, viewerSide] : [viewerSide, postSide];
  const optionsFor = (duration: number): KeyframeAnimationOptions => ({
    duration,
    easing: EASING,
    // Closing holds the post-side end until the dialog is gone, so nothing snaps back.
    fill: isOpening ? "none" : "forwards"
  });
  const duration = isOpening ? OPEN_DURATION_MS : CLOSE_DURATION_MS;
  const buttonDuration = isOpening ? BUTTON_FADE_IN_MS : BUTTON_FADE_OUT_MS;

  // The backdrop fades by opacity, which a phone's compositor runs on its own, rather
  // than by background-color, which iOS Safari left solid until the close was over.
  const animations = [
    backdrop.animate(keyframesFor(hiddenFade, shownFade), optionsFor(duration)),
    frame.animate(keyframesFor(postPhoto, viewerPhoto), optionsFor(duration)),
    toolbar.animate(keyframesFor(hiddenFade, shownFade), optionsFor(buttonDuration))
  ];
  // Close only. Opening, the backdrop fades in between the post and the photo, so a
  // photo still fading in would show the backdrop through it and flash dark. Without
  // travel the photo already fades, through photoKeyframes' opacity.
  if (!isOpening && origin && !isMotionReduced) {
    const handoffKeyframes: Array<Keyframe> = [
      shownFade,
      { ...shownFade, offset: 1 - HANDOFF_FRACTION },
      hiddenFade
    ];
    const handoffOptions = { ...optionsFor(duration), easing: "linear" };
    animations.push(frame.animate(handoffKeyframes, handoffOptions));
  }
  return animations;
}

/**
 * A blog photo filling the screen, at full resolution.
 *
 * Opens on the display copy the post already loaded, and fades the full-resolution file
 * in over it once that arrives. The photo grows out of its spot in the post on the way
 * in and shrinks back into it on the way out. On a touch screen held the photo's way
 * round, it covers the screen edge to edge, to pan under the thumb; held the other way,
 * the whole photo shows until the phone is turned.
 *
 * A click or tap on the photo zooms in on that spot, and another zooms back out. Zoomed,
 * it pans by dragging with the mouse, or by scrolling as any overflow does, as far as
 * bringing its edges to the middle of the screen. The zoom is the viewer's own, so
 * closing it leaves the page at its own size, as the browser's pinch-zoom would not.
 */
export default function BlogImageViewer(props: BlogImageViewerProps) {
  const { src, previewSrc, alt, getOriginRect, onClose } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
  const dragStartRef = useRef<DragStart | null>(null);
  const hasDraggedRef = useRef(false);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "failed">("loading");
  const [isClosing, setIsClosing] = useState(false);
  const ratio = aspectRatioFor(src) ?? 1.5;

  // Opens as a modal over the whole page, centred on a photo that overflows the screen,
  // and grows the photo out of the post. Measured after both, so it grows into place.
  useEffect(() => {
    const dialog = dialogRef.current;
    const backdrop = backdropRef.current;
    const scroller = scrollerRef.current;
    const frame = frameRef.current;
    const toolbar = toolbarRef.current;
    // Already open is StrictMode's second run in development, which would measure the
    // photo mid-opening and replace the animation with one that goes nowhere.
    if (!dialog || !backdrop || !scroller || !frame || !toolbar || dialog.open) return;

    dialog.showModal();
    centerScroller(scroller);
    playTransition({ backdrop, frame, toolbar }, getOriginRect(), true);
  }, [getOriginRect]);

  // Re-centres the photo when the phone turns, since the fit turns with it.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let lastWidth = window.innerWidth;
    const handleResize = () => {
      // The browser's toolbar sliding away changes only the height - not a turn.
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      centerScroller(scroller);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const close = () => {
    const dialog = dialogRef.current;
    const backdrop = backdropRef.current;
    const frame = frameRef.current;
    const toolbar = toolbarRef.current;
    if (!dialog || isClosingRef.current) return;
    isClosingRef.current = true;
    // Lifts the page's scroll lock (see is-closing in Blog.css) for the length of the
    // close, so a reader scrolling on is scrolling the post.
    setIsClosing(true);
    if (!backdrop || !frame || !toolbar) {
      dialog.close();
      return;
    }

    const elements = { backdrop, frame, toolbar };
    const animations = playTransition(elements, getOriginRect(), false);
    const startScrollY = window.scrollY;
    const finishClose = () => {
      window.removeEventListener("scroll", handleScroll);
      dialog.close();
    };
    // Once the post scrolls, the photo is flying back to a spot that has moved, so the
    // close skips to its end. A scroll event that leaves the page where it was is the
    // lock lifting, not the reader.
    const handleScroll = () => {
      if (window.scrollY !== startScrollY) finishClose();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Waits on the slowest, the close button's fade. finished rejects if an animation
    // is cancelled; the viewer closes either way.
    Promise.all(animations.map((animation) => animation.finished)).finally(finishClose);
  };

  /**
   * Plays the close out on Escape, which would otherwise shut the dialog at once.
   * @param event - The dialog's cancel event.
   */
  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    close();
  };

  /**
   * Fades the full-resolution file in once it can be drawn. load fires when the file
   * has arrived, which for a cached one is at once, but a 24MP photo can take a moment
   * longer to decode, and until it does the img has nothing to show.
   * @param event - The full-resolution img's load event.
   */
  const handleFullLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget
      .decode()
      .then(() => setLoadState("loaded"))
      .catch(() => setLoadState("failed"));
  };

  /**
   * Handles a click or tap anywhere in the viewer but its toolbar. One that ends a drag
   * does nothing. Zoomed, any other zooms back out; at fit, one on the photo zooms in
   * and one around it closes the viewer. A zoom keeps the spot clicked under the
   * pointer.
   * @param event - The click, anywhere in the scroller.
   */
  const handleScrollerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    const frame = frameRef.current;
    if (hasDraggedRef.current || isClosingRef.current || !frame) return;
    const isZoomed = scroller.classList.contains("is-zoomed");
    if (!isZoomed && !frame.contains(event.target as Node)) {
      close();
      return;
    }
    // A zoom during the opening or another zoom measures the photo at rest.
    for (const animation of frame.getAnimations()) animation.cancel();

    const before = frame.getBoundingClientRect();
    const spotX = (event.clientX - before.left) / before.width;
    const spotY = (event.clientY - before.top) / before.height;
    /**
     * is-zoomed is toggled on the element rather than through state,
     * as the new size has to be laid out and measured here, before the next paint.
     * React leaves it alone, since the scroller's className never changes.
     */
    scroller.classList.toggle("is-zoomed");
    const resized = frame.getBoundingClientRect();
    scroller.scrollLeft += resized.left + spotX * resized.width - event.clientX;
    scroller.scrollTop += resized.top + spotY * resized.height - event.clientY;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const settled = frame.getBoundingClientRect();
    frame.animate([{ transform: transformOnto(before, settled) }, { transform: "none" }], {
      duration: ZOOM_DURATION_MS,
      easing: EASING
    });
  };

  /**
   * Starts a mouse drag across a zoomed photo, from the photo or the room around it.
   * Touch pans by scrolling the scroller, which the browser does on its own.
   * @param event - The press, anywhere in the scroller.
   */
  const handleScrollerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    hasDraggedRef.current = false;
    const scroller = event.currentTarget;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    // A press on the scroller itself, rather than the stage filling it, is its scrollbar.
    if (!scroller.classList.contains("is-zoomed") || event.target === scroller) return;

    // Keeps the drag's moves and release coming here when the mouse leaves the window.
    scroller.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop
    };
  };

  /**
   * Pans the zoomed photo along with the mouse, once it has moved far enough to be a
   * drag.
   * @param event - The mouse moving while held down in the scroller.
   */
  const handleScrollerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    const scroller = event.currentTarget;
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;

    const deltaX = event.clientX - dragStart.clientX;
    const deltaY = event.clientY - dragStart.clientY;
    if (!hasDraggedRef.current && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;
    hasDraggedRef.current = true;
    scroller.classList.add("is-panning");
    scroller.scrollLeft = dragStart.scrollLeft - deltaX;
    scroller.scrollTop = dragStart.scrollTop - deltaY;
  };

  /**
   * Ends a mouse drag across the photo, on release or when the browser takes it over.
   * @param event - The release or cancel of the pointer that started the drag.
   */
  const handleScrollerPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = null;
    event.currentTarget.classList.remove("is-panning");
  };

  return (
    <dialog
      ref={dialogRef}
      className={`blog-viewer ${ratio > 1 ? "is-landscape" : "is-portrait"} ${
        loadState === "loaded" ? "is-full-loaded" : ""
      } ${isClosing ? "is-closing" : ""}`}
      aria-label={alt || "Photo"}
      onCancel={handleCancel}
      onClose={onClose}
    >
      <div ref={backdropRef} className="blog-viewer__backdrop" />
      <div
        ref={scrollerRef}
        className="blog-viewer__scroller"
        onClick={handleScrollerClick}
        onPointerDown={handleScrollerPointerDown}
        onPointerMove={handleScrollerPointerMove}
        onPointerUp={handleScrollerPointerEnd}
        onPointerCancel={handleScrollerPointerEnd}
      >
        <div className="blog-viewer__stage">
          <div
            ref={frameRef}
            className="blog-viewer__frame"
            // A runtime value: the photo's own ratio, which sizes the frame.
            style={{ "--ratio": ratio } as React.CSSProperties}
          >
            <img src={previewSrc} alt="" aria-hidden="true" draggable={false} />
            <img
              className="blog-viewer__full"
              src={src}
              alt={alt}
              draggable={false}
              decoding="async"
              onLoad={handleFullLoad}
              onError={() => setLoadState("failed")}
            />
          </div>
        </div>
      </div>
      <div ref={toolbarRef} className="blog-viewer__toolbar">
        {loadState !== "loaded" && (
          <div className="blog-viewer__status" role="status">
            {loadState === "loading"
              ? "Loading full resolution…"
              : "Couldn't load full resolution"}
          </div>
        )}
        <button
          type="button"
          className="blog-viewer__button cursor-pointer"
          onClick={close}
          aria-label="Close"
          title="Close"
        >
          <FiX />
        </button>
      </div>
    </dialog>
  );
}
