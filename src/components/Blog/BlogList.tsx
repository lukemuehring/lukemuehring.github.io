import { useState } from "react";
import { Link } from "react-router-dom";
import "./Blog.css";
import BlogNavHeader from "./BlogNavHeader";
import { posts } from "./posts";

interface BlogListProps {
  startRouteTransition: (to: string) => void;
}

export default function BlogList(props: BlogListProps) {
  const { startRouteTransition } = props;
  const [searchQuery] = useState("");
  const cleanedQuery = searchQuery.trim().toLowerCase();
  const filteredPosts =
    cleanedQuery === ""
      ? posts
      : posts.filter((p) => p.title.toLowerCase().includes(cleanedQuery));

  return (
    // <div className="flex flex-col mx-auto w-full min-h-screen md:max-w-5xl p-2 md:p-8">
    <div className="flex flex-col items-center justify-center p-2 md:p-8">
      <div className="w-[80%] mx-auto md:max-w-4xl">
        <BlogNavHeader
          text={"Back to Website"}
          route={"/"}
          startRouteTransition={startRouteTransition}
        />
        <div className="">
          <h1 className="md:text-7xl text-6xl mb-8">Blog</h1>
          {/* SEARCH BAR */}
          {/* uncomment when needed */}
          {/* <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          /> */}
          {/* BLOG LIST */}
          <ul className="flex flex-col gap-10 no-dot mt-8">
            {filteredPosts.map((post) => (
              <li key={post.id}>
                <Link to={`/blog/${post.id}`} className="blog-link">
                  <div>{post.title}</div>
                  <div className="blog-date">{post.date}</div>
                </Link>
              </li>
            ))}
          </ul>
          {/* NO RESULTS */}
          {filteredPosts.length === 0 && (
            <div>No results for "{searchQuery}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
