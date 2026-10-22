import { aspectRatioFor } from "../../lib/blogImages";
import "./Blog.css";
import BlogImage from "./BlogImage";

export default function BlogDoublePicture({
  imageSrc1,
  imageSrc2,
  caption,
}: {
  imageSrc1: string;
  imageSrc2: string;
  caption: string | undefined;
}) {
  const ratio1 = aspectRatioFor(imageSrc1);
  const ratio2 = aspectRatioFor(imageSrc2);
  // Side by side, the pair is one row whose ratio is the two summed. Knowing it lets a
  // tall pair narrow to fit the viewport height, as the full-bleed shots do. Left unset
  // when either image is missing from the manifest, which leaves the pair uncapped.
  const pairStyle =
    ratio1 && ratio2
      ? ({ "--pair-ratio": ratio1 + ratio2 } as React.CSSProperties)
      : undefined;

  return (
    <figure className="flex flex-col items-center" style={{ textAlign: "center" }}>
      <div
        className="w-full flex flex-col gap-4 md:flex md:flex-row md:gap-0 md:flex-nowrap md:max-w-[calc(100vh*var(--pair-ratio))]"
        style={pairStyle}
      >
        <BlogImage src={imageSrc1} alt={caption} className="md:flex-1 md:min-w-0" />
        <BlogImage src={imageSrc2} alt={caption} className="md:flex-1 md:min-w-0" />
      </div>
      <figcaption className="blog-caption">{caption}</figcaption>
    </figure>
  );
}
