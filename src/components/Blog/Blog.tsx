import { Route, Routes } from "react-router-dom";
import "./Blog.css";
import BlogList from "./BlogList";
import BlogPost from "./BlogPost";

export default function Blog({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`blog ${darkMode ? "dark" : ""} w-[100%] tracking-tight`}>
      <Routes>
        <Route path="/" element={<BlogList />} />
        <Route path=":id" element={<BlogPost darkMode={darkMode} />} />
      </Routes>
    </div>
  );
}
