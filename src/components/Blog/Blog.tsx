import { Route, Routes } from "react-router-dom";
import "./Blog.css";
import BlogList from "./BlogList";
import BlogPost from "./BlogPost";

export default function Blog() {
  return (
    <div className="blog tracking-tight">
      <Routes>
        <Route path="/" element={<BlogList />} />
        <Route path=":id" element={<BlogPost />} />
      </Routes>
    </div>
  );
}
