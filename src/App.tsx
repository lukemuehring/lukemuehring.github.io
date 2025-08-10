import "./App.css";
import MyCanvas from "./components/MyCanvas";
import "./style.css";

export default function App() {
  return (
    <>
      <div aria-hidden="true" className="hidden">
        &nbsp;
      </div>

      <MyCanvas />

      <nav id="nav">
        {/* todo: replace with accessible component for ham-menu button */}
        <div className="ham-menu">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="menu-container">
          <div className="menu">
            <button data-target="resume">Resume</button>
            <button data-target="contact">Contact</button>
            <button data-target="work">My Work</button>
            <button data-target="linkedIn">LinkedIn</button>
          </div>
        </div>
      </nav>

      <div id="toastContainer" className="toast-container"></div>
    </>
  );
}
