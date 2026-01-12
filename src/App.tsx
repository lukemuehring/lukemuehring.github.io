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

  const [darkMode, setDarkMode] = useState(false);
  const darkModeRef = useRef(darkMode);
  const handleToggleNightMode = () => setDarkMode((prev) => !prev);

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

  // Keep darkModeRef in sync with state
  useEffect(() => {
    darkModeRef.current = darkMode;
  }, [darkMode]);

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
