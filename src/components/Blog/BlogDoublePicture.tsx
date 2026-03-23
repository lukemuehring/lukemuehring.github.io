import "./Blog.css";

export default function BlogDoublePicture({ imageSrc1, imageSrc2, caption }: { imageSrc1: string, imageSrc2: string, caption: string | undefined }) {
  return (
    <figure className="flex flex-col" style={{ textAlign: "center" }}>
      <div className="flex flex-col gap-4 md:flex md:flex-row md:gap-0 md:flex-nowrap md:w-[50%]">
        <img src={imageSrc1} />
        <img src={imageSrc2} />
      </div>
      <figcaption className="blog-caption">
        {caption}
      </figcaption>
    </figure>
  );
}
