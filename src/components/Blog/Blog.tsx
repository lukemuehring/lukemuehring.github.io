import { Route, Routes } from "react-router-dom";
import "./Blog.css";
import BlogList from "./BlogList";
import BlogPost from "./BlogPost";

export default function Blog({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`blog ${darkMode ? "dark" : ""} w-[100%]`}>
      <Routes>
        <Route path="/" element={<BlogList />} />
        <Route path=":id" element={<BlogPost  />} />
      </Routes>
    </div>
  );
}



// blog design inspo
// https://cursor.com/blog/scaling-agentsz



// <figure className="flex flex-col" style={{ textAlign: 'center' }}>
// <div className="flex flex-col gap-4 md:flex md:flex-row md:gap-0 md:flex-nowrap md:w-[50%]">
//   <img src={watch_3} alt="afternoon view of the mountain" />
//   <img src={watch_4} alt="alpenglow view of the mountain" />
// </div>
//   <figcaption className="blog-caption">Views looking up and north. </figcaption>
// </figure>