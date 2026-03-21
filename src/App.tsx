import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Blog from "./components/Blog/Blog";
import MyCanvas from "./components/MyCanvas";
import Nav from "./components/Nav/Nav";
import "./tailwind.css";
import "./style.css";
import type { Button } from "./types/Button";
import type { Player } from "./types/Player";

export default function App() {
  const IsUserInputAllowedRef = useRef(true);
  const IsNavMenuOpenRef = useRef(false);
  const IsDemoModalOpenRef = useRef(false);
  const PlayerRef = useRef<Player | null>(null);
  const DemosRef = useRef<Button[] | null>(null);

  // Initialize dark mode: localStorage > system preference > ˝-based fallback
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    // Fall back to system preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (mediaQuery.media !== "not all") {
      return mediaQuery.matches;
    }
    // Fall back to time-based
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7;
  });

  const darkModeRef = useRef(darkMode);
  const handleToggleNightMode = () => setDarkMode((prev) => !prev);

    // Keep darkModeRef, html class, and localStorage in sync with state
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    darkModeRef.current = darkMode;
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const updateDerivedRef = () => {
    IsUserInputAllowedRef.current =
      !IsNavMenuOpenRef.current && !IsDemoModalOpenRef.current;
  };

  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [location.pathname]);

  return (
    <Routes>
      {/* Main "Home" route */}
      <Route
        path="/"
        element={
          <div className="canvas-no-scroll">
            {/* this is used to load the fonts as soon as possible */}
            <div aria-hidden="true" className="hidden-font-loader">
              &nbsp;
            </div>
            <MyCanvas
              IsUserInputAllowedRef={IsUserInputAllowedRef}
              IsDemoModalOpenRef={IsDemoModalOpenRef}
              onRefChange={updateDerivedRef}
              PlayerRef={PlayerRef}
              DemosRef={DemosRef}
              darkModeRef={darkModeRef}
              darkModeValue={darkMode}
            />
            <Nav
              IsNavMenuOpenRef={IsNavMenuOpenRef}
              onRefChange={updateDerivedRef}
              PlayerRef={PlayerRef}
              DemosRef={DemosRef}
              darkMode={darkMode}
              onToggleNightMode={handleToggleNightMode}
            />

            <div id="toastContainer" className="toast-container"></div>
          </div>
        }
      />

      <Route path="/blog/*" element={<Blog darkMode={darkMode} />} />
    </Routes>
  );
}
