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
    <figure className="flex flex-col items-center">
      <img src={imageSrc} className={fullSize ? "max-h-screen w-auto object-contain" : "w-full md:w-[50%]"} />
      <figcaption className="blog-caption text-center">{caption}</figcaption>
    </figure>
  );
}
