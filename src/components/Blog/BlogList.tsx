import { Link } from "react-router-dom";
import { posts } from "./posts";

export default function BlogList() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Blog</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id} style={{ margin: "1rem 0" }}>
            <Link to={`/blog/${post.id}`} style={{ color: "blue" }}>
              {post.title}
            </Link>
            <div style={{ fontSize: "0.8rem", color: "gray" }}>{post.date}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
