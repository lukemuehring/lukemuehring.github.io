import { useCallback, useEffect, useRef, useState } from "react";
import { aspectRatioFor, COLUMN_SIZES, srcSetFor } from "../../lib/blogImages";
import "./Blog.css";
import BlogImageViewer from "./BlogImageViewer";

interface BlogImageProps {
  /** The full-resolution file. The column shows its display copies (see srcSetFor). */
  src: string;
  alt?: string;
  /** How wide the image is laid out, for the browser's pick of display copy. */
  sizes?: string;
  className?: string;
}

/**
 * A blog photo with a skeleton held in its place until it arrives, which opens
 * full-resolution in BlogImageViewer on a click.
 *
 */
export default function BlogImage(props: BlogImageProps) {
  const { src, alt = "", sizes = COLUMN_SIZES, className } = props;
  const ratio = aspectRatioFor(src);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [isDisplayCopyFailed, setIsDisplayCopyFailed] = useState(false);
  const [viewerPreviewSrc, setViewerPreviewSrc] = useState<string | null>(null);
  const srcSet = isDisplayCopyFailed ? null : srcSetFor(src);

  // A cached image can finish decoding before React has attached onLoad, in which case
  // the event never fires and the skeleton would shimmer over it forever.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  const handleError = () => {
    // A display copy that fails falls back to src, the full-resolution file, rather
    // than leaving the box empty - dropping srcSet makes the browser load src instead.
    if (srcSet) {
      setIsDisplayCopyFailed(true);
      return;
    }
    // A broken image has to clear the skeleton too, or it reads as still loading.
    setLoaded(true);
  };

  // One identity for the viewer's lifetime: its opening effect depends on it.
  const getOriginRect = useCallback(
    () => boxRef.current?.getBoundingClientRect() ?? null,
    []
  );

  /**
   * Opens the photo in BlogImageViewer.
   * @param event - The click on the photo, from a pointer or the keyboard.
   */
  const handleOpenViewer = (event: React.MouseEvent<HTMLButtonElement>) => {
    /**
     * event.detail is 0 only when Enter or Space pressed the button.
     * A click focuses it too, which the dialog restores on closing,
     * so closing with Escape left the photo outlined as keyboard focus.
     */
    if (event.detail > 0) event.currentTarget.blur();
    // currentSrc is whichever display copy the browser chose, already decoded.
    setViewerPreviewSrc(imgRef.current?.currentSrc || src);
  };

  return (
    <>
      <div
        ref={boxRef}
        className={`blog-image w-full ${loaded ? "is-loaded" : ""} ${className ?? ""}`}
        // Read by the box's aspect-ratio and its height-matched width cap. Left unset for
        // an image missing from the manifest, and the stylesheet falls back to 3:2.
        style={ratio ? ({ "--ratio": ratio } as React.CSSProperties) : undefined}
      >
        <button
          type="button"
          className="blog-image__open"
          onClick={handleOpenViewer}
          aria-label={alt ? `View full resolution: ${alt}` : "View full resolution"}
        >
          <img
            ref={imgRef}
            srcSet={srcSet ?? undefined}
            sizes={sizes}
            src={src}
            alt={alt}
            // The posts are long and image-heavy; without this every photo in a post is
            // fetched before the reader has scrolled past the first paragraph.
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={handleError}
          />
        </button>
      </div>
      {viewerPreviewSrc !== null && (
        <BlogImageViewer
          src={src}
          previewSrc={viewerPreviewSrc}
          alt={alt}
          getOriginRect={getOriginRect}
          onClose={() => setViewerPreviewSrc(null)}
        />
      )}
    </>
  );
}
