import { useCallback, useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Blog from "./components/Blog/Blog";
import CheckerWipe from "./components/CheckerWipe/CheckerWipe";
import MyCanvas from "./components/MyCanvas";
import Nav from "./components/Nav/Nav";
import "./tailwind.css";
import "./style.css";
import type { Button } from "./types/Button";
import type { Controller } from "./types/Controller";
import type { Player } from "./types/Player";
import { useTheme } from "./context/ThemeContext";

export default function App() {
  const IsUserInputAllowedRef = useRef(true);
  const IsDemoModalOpenRef = useRef(false);
  const IsRouteTransitionRef = useRef(false);
  const PlayerRef = useRef<Player | null>(null);
  const DemosRef = useRef<Button[] | null>(null);
  // Handed to the nav so it can start walks and read the character's position each frame.
  // Refs rather than context: re-rendering MyCanvas would redefine its animation loop
  // while the previous one keeps running against a stale closure.
  const ControllerRef = useRef<Controller | null>(null);

  // Dark mode now lives in ThemeContext (see context/ThemeContext.tsx).
  const { darkMode } = useTheme();
  const darkModeRef = useRef(darkMode);

  // Mirror darkMode into a ref so the canvas's imperative code reads the latest value.
  useEffect(() => {
    darkModeRef.current = darkMode;
  }, [darkMode]);

  const updateDerivedRef = () => {
    IsUserInputAllowedRef.current =
      !IsDemoModalOpenRef.current && !IsRouteTransitionRef.current;
  };

  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Where a route transition is headed, or null when none is running. The wipe is
   * rendered here rather than inside the route it leaves, so it survives the navigation
   * and can uncover the page it landed on.
   */
  const [routeWipeTarget, setRouteWipeTarget] = useState<string | null>(null);

  const startRouteTransition = useCallback((to: string) => {
    // Clicking the marker twice should not restart the wipe half way through it.
    if (IsRouteTransitionRef.current) return;
    IsRouteTransitionRef.current = true;
    updateDerivedRef();
    setRouteWipeTarget(to);
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [location.pathname]);

  return (
    <>
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
                ControllerRef={ControllerRef}
                darkModeRef={darkModeRef}
                darkModeValue={darkMode}
                startRouteTransition={startRouteTransition}
              />
              <Nav PlayerRef={PlayerRef} ControllerRef={ControllerRef} />

              <div id="toastContainer" className="toast-container"></div>
            </div>
          }
        />

        <Route
          path="/blog/*"
          element={<Blog startRouteTransition={startRouteTransition} />}
        />
      </Routes>

      {routeWipeTarget && (
        <CheckerWipe
          reverse={routeWipeTarget === "/"}
          onCovered={() => navigate(routeWipeTarget)}
          onDone={() => {
            setRouteWipeTarget(null);
            IsRouteTransitionRef.current = false;
            updateDerivedRef();
          }}
        />
      )}
    </>
  );
}
