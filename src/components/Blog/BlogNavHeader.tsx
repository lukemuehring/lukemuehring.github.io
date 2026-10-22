import { useEffect, useRef, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import { Link } from "react-router-dom";
import "./Blog.css";
import "../../style.css";
import { useTheme } from "../../context/ThemeContext";

interface BlogNavHeaderProps {
  text: string;
  route: string;
  /**
   * Plays the checker wipe on the way out. Only for links that leave the blog - moving
   * between blog pages is a plain cut.
   */
  startRouteTransition?: (to: string) => void;
}

export default function BlogNavHeader(props: BlogNavHeaderProps) {
  const { text, route, startRouteTransition } = props;
  const { darkMode, toggle } = useTheme();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isScrolledAway, setIsScrolledAway] = useState(false);

  // Slides the header off while scrolling down the page and back on any scroll up.
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const header = headerRef.current;
      if (!header) return;
      // Only once stuck - while still in flow, it would lift off its resting spot.
      const isStuck = header.getBoundingClientRect().top <= 0;
      setIsScrolledAway(isStuck && window.scrollY > lastScrollY);
      lastScrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleToggleNightMode = () => {
    toggle();
  };

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Still a real link underneath, so a modified click can open it in a new tab.
    if (
      !startRouteTransition ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }
    event.preventDefault();
    startRouteTransition(route);
  };

  return (
    <div
      ref={headerRef}
      className={`blog-nav-header flex align-middle justify-between mt-4 mb-4 ${isScrolledAway ? "is-scrolled-away" : ""}`}
    >
      <Link to={route} className="shaf-btn-muted" onClick={handleLinkClick}>
        ← {text}
      </Link>
      <button
        className="menu-button"
        onClick={handleToggleNightMode}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <FiSun /> : <FiMoon />}
      </button>
    </div>
  );
}

// blog design inspo
// https://cursor.com/blog/scaling-agentsz
