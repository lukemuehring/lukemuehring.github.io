import { Routes, Route } from "react-router-dom";
import BlogList from "./BlogList";
import BlogPost from "./BlogPost";

export default function Blog() {
  return (
    <Routes>
      <Route path="/" element={<BlogList />} /> {/* /blog */}
      <Route path=":id" element={<BlogPost />} /> {/* /blog/:id */}
    </Routes>
  );
}
