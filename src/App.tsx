import { useRef } from "react";
import { Route, Routes } from "react-router-dom";
import Blog from "./components/Blog/Blog";
import MyCanvas from "./components/MyCanvas";
import Nav from "./components/Nav/Nav";
import "./style.css";
import "./tailwind.css";
import type { Button } from "./types/Button";
import type { Player } from "./types/Player";

export default function App() {
  const IsUserInputAllowedRef = useRef(true);
  const IsNavMenuOpenRef = useRef(false);
  const IsDemoModalOpenRef = useRef(false);
  const PlayerRef = useRef<Player | null>(null);
  const DemosRef = useRef<Button[] | null>(null);

  const updateDerivedRef = () => {
    IsUserInputAllowedRef.current =
      !IsNavMenuOpenRef.current && !IsDemoModalOpenRef.current;
  };

  return (
    <Routes>
      {/* Main "Home" route */}
      <Route
        path="/"
        element={
          <>
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
            />
            <Nav
              IsNavMenuOpenRef={IsNavMenuOpenRef}
              onRefChange={updateDerivedRef}
              PlayerRef={PlayerRef}
              DemosRef={DemosRef}
            />

            <div id="toastContainer" className="toast-container"></div>
          </>
        }
      />

      <Route path="/blog/*" element={<Blog />} />
    </Routes>
  );
}
