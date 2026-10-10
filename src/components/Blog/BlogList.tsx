import { useState } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../SearchBar";
import "./Blog.css";
import BlogNavHeader from "./BlogNavHeader";
import { posts } from "./posts";

export default function BlogList() {
  const [searchQuery, setSearchQuery] = useState("");
  const cleanedQuery = searchQuery.trim().toLowerCase();
  const filteredPosts =
    cleanedQuery === ""
      ? posts
      : posts.filter((p) => p.title.toLowerCase().includes(cleanedQuery));

  return (
    // <div className="flex flex-col mx-auto w-full min-h-screen md:max-w-5xl p-2 md:p-8">
    <div className="flex flex-col items-center justify-center p-2 md:p-8">
      <div className="w-[80%] mx-auto md:max-w-4xl">
        <BlogNavHeader text={"Back to Website"} route={"/"} />
        <div className="">
          <h1 className="md:text-7xl text-6xl mb-8">Blog</h1>
          {/* SEARCH BAR */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          {/* BLOG LIST */}
          <ul className="flex flex-col gap-10 no-dot">
            {filteredPosts.map((post) => (
              <li key={post.id}>
                <Link to={`/blog/${post.id}`} className={"blog-link"}>
                  <span>{post.title}</span>
                </Link>
                <div className="blog-date">{post.date}</div>
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
