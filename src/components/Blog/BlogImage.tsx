import { useEffect, useRef, useState } from "react";
import { aspectRatioFor } from "../../lib/blogImages";
import "./Blog.css";

type BlogImageProps = {
  src: string;
  alt?: string;
  /** Caps the image at the viewport height, for the full-bleed shots that open a post. */
  fullSize?: boolean;
  className?: string;
};

/**
 * A blog photo with a skeleton held in its place until it arrives.
 *
 * The posts carry 3-6MB photos, a dozen and more at a time, so the gap between the text
 * rendering and the images landing is long and very visible. The box is sized from the
 * image's real dimensions rather than a guess (see lib/blogImages), which is what keeps
 * the column from jumping as each one drops in.
 */
export default function BlogImage({
  src,
  alt = "",
  fullSize = false,
  className = "",
}: BlogImageProps) {
  const ratio = aspectRatioFor(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish decoding before React has attached onLoad, in which case
  // the event never fires and the skeleton would shimmer over it forever.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div
      className={`blog-image ${fullSize ? "blog-image--full" : ""} ${
        loaded ? "is-loaded" : ""
      } ${className}`}
      // Read by both the box's aspect-ratio and the full-bleed width cap. Left unset for
      // an image missing from the manifest, and the stylesheet falls back to 3:2.
      style={ratio ? ({ "--ratio": ratio } as React.CSSProperties) : undefined}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        // The posts are long and image-heavy; without this every photo in a 60MB post is
        // fetched before the reader has scrolled past the first paragraph.
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        // A broken image has to clear the skeleton too, or it reads as still loading.
        onError={() => setLoaded(true)}
      />
    </div>
  );
}
