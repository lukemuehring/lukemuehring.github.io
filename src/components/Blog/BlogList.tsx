import { Link } from "react-router-dom";
import "./Blog.css";
import BlogNavHeader from "./BlogNavHeader";
import { posts } from "./posts";

type BlogListProps = {
  darkMode: boolean;
  onToggleNightMode?: () => void;
};

export default function BlogList({
  darkMode,
  onToggleNightMode,
}: BlogListProps) {
  return (
    // <div className="flex flex-col mx-auto w-full min-h-screen md:max-w-5xl p-2 md:p-8">
    <div className="flex flex-col items-center justify-center p-2 md:p-8">
      <div className="w-full md:max-w-4xl">
        <BlogNavHeader
          text={"Back to Website"}
          route={"/"}
          darkMode={darkMode}
          onToggleNightMode={onToggleNightMode}
        />
        <div className="w-[80%] mx-auto">
          <h1 className="md:text-7xl text-6xl mb-8">Blog</h1>
          <ul className="flex flex-col gap-10 no-dot">
            {posts.map((post) => (
              <li key={post.id}>
                <Link to={`/blog/${post.id}`} className={"blog-link"}>
                  <span>{post.title}</span>
                </Link>
                <div className="blog-date">{post.date}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
