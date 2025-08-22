import { useParams, Link } from "react-router-dom";
import { posts } from "./posts";

export default function BlogPost() {
  const { id } = useParams();
  const post = posts.find((p) => p.id === id);

  if (!post) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Post not found</h1>
        <Link to="/blog">← Back to Blog</Link>
      </div>
    );
  }

  const PostContent = post.component;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{post.title}</h1>
      <div style={{ fontSize: "0.8rem", color: "gray" }}>{post.date}</div>
      <div style={{ marginTop: "1rem" }}>
        <PostContent />
      </div>
      <Link to="/blog" style={{ display: "block", marginTop: "2rem" }}>
        ← Back to Blog
      </Link>
    </div>
  );
}
