import "./Blog.css";
import BlogImage from "./BlogImage";

export default function BlogPicture({
  imageSrc,
  caption,
  fullSize,
}: {
  imageSrc: string;
  caption: string | undefined;
  fullSize: boolean | undefined;
}) {
  return (
    <figure className="flex flex-col items-center">
      <BlogImage
        src={imageSrc}
        alt={caption}
        fullSize={fullSize}
        className={fullSize ? "" : "md:w-[50%]"}
      />
      <figcaption className="blog-caption text-center">{caption}</figcaption>
    </figure>
  );
}
