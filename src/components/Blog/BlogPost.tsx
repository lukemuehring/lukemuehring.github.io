import Prism from "prismjs";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import type { Post } from "../../types/Post";
import "./Blog.css";
import BlogNavHeader from "./BlogNavHeader";
import { posts } from "./posts";

type BlogPostProps = {
  darkMode: boolean;
  onToggleNightMode?: () => void;
};

export default function BlogPost({
  darkMode,
  onToggleNightMode,
}: BlogPostProps) {
  const { id } = useParams();
  const post: Post | undefined = posts.find((p) => p.id === id);

  useEffect(() => {
    Prism.highlightAll(); // highlight code blocks after rendering
  }, [post]);

  if (!post) {
    return (
      <div className="" style={{ padding: "2rem" }}>
        <h1>Post not found</h1>
        <Link to="/blog" className="shaf-btn-muted">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const PostContent = post.component;

  return (
    <div className="flex flex-col items-center justify-center p-2 md:p-8">
      <div className="w-full md:max-w-4xl markdown">
        <BlogNavHeader
          text={"Back to Blog"}
          route={"/blog"}
          darkMode={darkMode}
          onToggleNightMode={onToggleNightMode}
        />
        <div className="mt-8 mb-8 w-[80%] mx-auto">
        <h1 className="blog-link">{post.title}</h1>
        <div className="blog-date">{post.date}</div>
          <PostContent />
        </div>
      </div>
    </div>
  );
}
