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

/** The photo growing out of the post, and the background fading in. */
const OPEN_DURATION_MS = 280;

/** The photo shrinking back into the post, and the background fading out. */
const CLOSE_DURATION_MS = 220;

/** The close button fading in. Longer than the photo, so it settles in after it. */
const BUTTON_FADE_IN_MS = 800;

/** The close button fading out. The viewer stays open until this finishes too. */
const BUTTON_FADE_OUT_MS = 350;

/**
 * Quick off the mark and easing into place, both ways: the photo arrives rather than
 * lands, and the background starts fading the moment the viewer is asked to close.
 */
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

/**
 * The share of the travel, at the post end, over which the photo fades in or out. The
 * viewer sits over everything, the blog's sticky header included, so a photo landing
 * on a spot the header covers would sit on top of it until the dialog closed. Fading
 * hands over to the post's own photo, identical underneath, with the header in place.
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
  // Without travel the photo already fades, through photoKeyframes' opacity.
  if (origin && !isMotionReduced) {
    const handoffKeyframes: Array<Keyframe> = isOpening
      ? [hiddenFade, { ...shownFade, offset: HANDOFF_FRACTION }, shownFade]
      : [shownFade, { ...shownFade, offset: 1 - HANDOFF_FRACTION }, hiddenFade];
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
 * the whole photo shows until the phone is turned. It has no zoom of its own; the
 * browser's pinch-zoom works on it, on a phone as on a trackpad.
 */
export default function BlogImageViewer(props: BlogImageViewerProps) {
  const { src, previewSrc, alt, getOriginRect, onClose } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
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
   * Closes on a click or tap around the photo, not on it.
   * @param event - The click, anywhere in the scroller.
   */
  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (frameRef.current?.contains(event.target as Node)) return;
    close();
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
        onClick={handleBackgroundClick}
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
              onLoad={() => setLoadState("loaded")}
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
