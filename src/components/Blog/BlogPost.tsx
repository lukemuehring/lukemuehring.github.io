import { Link, useParams } from "react-router-dom";
import type { Post } from "../../types/Post";
import { posts } from "./posts";
import Prism from "prismjs";
// core languages
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";

// TSX support
import "prismjs/components/prism-tsx";

import { useEffect } from "react";

export default function BlogPost() {
  const { id } = useParams();
  const post: Post | undefined = posts.find((p) => p.id === id);

  useEffect(() => {
    Prism.highlightAll(); // highlight code blocks after rendering
  }, [post]);

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
    <div className="flex flex-col items-center justify-center p-2 md:p-8">
      <div className="w-full md:max-w-4xl markdown">
        <Link to="/blog" className="block mb-8">
          ← Back to Blog
        </Link>
        <h1 className="blog-link">{post.title}</h1>
        <div className="blog-date">{post.date}</div>
        <div className="mt-4 w-full mx-auto">
          <PostContent />
        </div>
      </div>
    </div>
  );
}
