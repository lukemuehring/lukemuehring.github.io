import "./Blog.css";

export default function BlogPicture({
  imageSrc,
  caption,
  fullSize
}: {
  imageSrc: string;
  caption: string | undefined;
  fullSize: boolean | undefined;
}) {
  return (
    <figure style={{ textAlign: "center" }}>
      <img src={imageSrc} className= {fullSize ? "" : "mx-auto w-full md:w-[50%]"} />
      <figcaption className="blog-caption">{caption}</figcaption>
    </figure>
  );
}
