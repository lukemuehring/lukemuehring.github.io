import { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Blog from "./components/Blog/Blog";
import MyCanvas from "./components/MyCanvas";
import Nav from "./components/Nav/Nav";
import "./tailwind.css";
import "./style.css";
import type { Button } from "./types/Button";
import type { Player } from "./types/Player";
import { useTheme } from "./context/ThemeContext";

export default function App() {
  const IsUserInputAllowedRef = useRef(true);
  const IsNavMenuOpenRef = useRef(false);
  const IsDemoModalOpenRef = useRef(false);
  const PlayerRef = useRef<Player | null>(null);
  const DemosRef = useRef<Button[] | null>(null);

  // Dark mode now lives in ThemeContext (see context/ThemeContext.tsx).
  const { darkMode } = useTheme();
  const darkModeRef = useRef(darkMode);

  // Mirror darkMode into a ref so the canvas's imperative code reads the latest value.
  useEffect(() => {
    darkModeRef.current = darkMode;
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
            />

            <div id="toastContainer" className="toast-container"></div>
          </div>
        }
      />

      <Route path="/blog/*" element={<Blog />} />
    </Routes>
  );
}
