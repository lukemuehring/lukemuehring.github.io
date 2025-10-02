import { Link } from "react-router-dom";
import { posts } from "./posts";
import "./Blog.css";

export default function BlogList() {
  return (
    <div className="flex flex-col mx-auto w-full md:max-w-4xl p-2 md:p-8">
      <Link to="/" className="shaf-btn-muted mb-8">
        ← Back to website
      </Link>
      <h1 className="md:text-6xl text-4xl">Blog</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id} style={{ margin: "1rem 0" }}>
            <Link to={`/blog/${post.id}`} className={"blog-link"}>
              <span>{post.title}</span>
            </Link>
            <div className="blog-date text-xl md:text-2xl">{post.date}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
