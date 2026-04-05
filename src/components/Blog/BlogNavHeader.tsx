import { FiMoon, FiSun } from "react-icons/fi";
import { Link } from "react-router-dom";
import "./Blog.css";

type BlogNavHeaderProps = {
  text: string;
  route: string;
  darkMode: boolean;
  onToggleNightMode?: () => void;
};

export default function BlogNavHeader({
  text,
  route,
  darkMode,
  onToggleNightMode,
}: BlogNavHeaderProps) {
  const handleToggleNightMode = () => {
    if (onToggleNightMode) onToggleNightMode();
  };

  return (
    <div className="flex align-middle justify-between px-2 mb-8">
      <Link to={route} className="shaf-btn-muted">
        ← {text}
      </Link>
      <button onClick={handleToggleNightMode}>
        {darkMode ? <FiSun /> : <FiMoon />}
      </button>
    </div>
  );
}

// blog design inspo
// https://cursor.com/blog/scaling-agentsz
