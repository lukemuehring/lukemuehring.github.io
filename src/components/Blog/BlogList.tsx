import { Link } from "react-router-dom";
import { posts } from "./posts";
import "./Blog.css";

export default function BlogList() {
  return (
    <div className="flex flex-col mx-auto w-full min-h-screen md:max-w-5xl p-2 md:p-8">
      <Link to="/" className="shaf-btn-muted mb-8">
        ← Back to website
      </Link>
      <h1 className="md:text-8xl text-7xl mb-8">Blog</h1>
      <ul className="flex flex-col gap-10">
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
  );
}
