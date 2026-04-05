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
      <div className="w-full md:max-w-4xl markdown">
        <BlogNavHeader
          text={"Back to Website"}
          route={"/"}
          darkMode={darkMode}
          onToggleNightMode={onToggleNightMode}
        />

        <h1 className="md:text-8xl text-7xl mb-8 text-center">Blog</h1>
        <ul className="flex flex-col gap-10 markdown">
          {posts.map((post) => (
            <li key={post.id} className="markdown">
              <Link to={`/blog/${post.id}`} className={"blog-link"}>
                <span>{post.title}</span>
              </Link>
              <div className="blog-date">{post.date}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
