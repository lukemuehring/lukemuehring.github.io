import { useParams, Link } from "react-router-dom";
import { posts } from "./posts";
import type { Post } from "../../types/Post";

export default function BlogPost() {
  const { id } = useParams();
  const post: Post | undefined = posts.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="" style={{ padding: "2rem" }}>
        <h1>Post not found</h1>
        <Link to="/blog">← Back to Blog</Link>
      </div>
    );
  }

  const PostContent = post.component;

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl markdown">
        <h1>{post.title}</h1>
        <div className="text-gray-500 text-sm">{post.date}</div>
        <div className="mt-4 w-full  text-pink-500 mx-auto">
          <PostContent />
        </div>
        <Link to="/blog" className="block mt-8">
          ← Back to Blog
        </Link>
      </div>
    </div>
  );
}
