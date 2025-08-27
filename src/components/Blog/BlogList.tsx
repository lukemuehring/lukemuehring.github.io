import { Link } from "react-router-dom";
import { posts } from "./posts";

export default function BlogList() {
  return (
    <div className="flex flex-col mx-auto w-full md:max-w-4xl p-2 md:p-8">
      <h1 className="blog-h1">Blog</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id} style={{ margin: "1rem 0" }}>
            <Link to={`/blog/${post.id}`} className={"blog-link"}>
              {post.title}
            </Link>
            <div className="blog-date">{post.date}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
