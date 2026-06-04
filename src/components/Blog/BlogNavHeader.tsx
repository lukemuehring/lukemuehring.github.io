import { FiMoon, FiSun } from "react-icons/fi";
import { Link } from "react-router-dom";
import "./Blog.css";
import "../../style.css";
import { useTheme } from "../../context/ThemeContext";

type BlogNavHeaderProps = {
  text: string;
  route: string;
};

export default function BlogNavHeader({ text, route }: BlogNavHeaderProps) {
  const { darkMode, toggle } = useTheme();

  const handleToggleNightMode = () => {
    toggle();
  };

  return (
    <div className="flex align-middle justify-between mt-8 mb-8">
      <Link to={route} className="shaf-btn-muted">
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
