import "./Blog.css";
import BlogImage from "./BlogImage";

interface PanelPhotoProps {
  imageSrc: string;
  caption?: string;
}

/**
 * Laid out as wide as the photo needs at the panel's height, so portrait and landscape
 * shots sit side by side at one height. 800px covers that width on a 2x screen.
 */
const PANEL_PHOTO_SIZES = "(min-width: 768px) 800px, 90vw";

/**
 * A photo in an AdventureSection's panel, at the panel's height, which opens in the
 * photo viewer like any blog photo.
 */
export default function PanelPhoto(props: PanelPhotoProps) {
  const { imageSrc, caption } = props;
  return (
    <figure className="adventure__photo">
      <BlogImage src={imageSrc} alt={caption} sizes={PANEL_PHOTO_SIZES} />
      {caption && <figcaption className="blog-caption">{caption}</figcaption>}
    </figure>
  );
}
