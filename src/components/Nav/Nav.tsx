import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./Nav.css";

type NavProps = {
  IsNavMenuOpenRef?: React.RefObject<boolean>;
  onRefChange?: () => void;
  darkMode: boolean;
  onToggleNightMode?: () => void;
};

export default function Nav({
  IsNavMenuOpenRef,
  onRefChange,
  darkMode,
  onToggleNightMode,
}: NavProps) {
  const [isActive, setIsActive] = useState(false);

  const navigate = useNavigate();

  const onClose = () => {
    setIsActive(false);
    if (IsNavMenuOpenRef) IsNavMenuOpenRef.current = false;
    if (onRefChange) onRefChange();
  };

  const handleMenuToggle = () => {
    setIsActive((prev) => {
      const newState = !prev;
      if (IsNavMenuOpenRef) IsNavMenuOpenRef.current = newState; // update IsNavMenuOpenRef so we can derive IsUserInputAllowedRef in App.tsx
      if (onRefChange) onRefChange(); // update App.tsx IsUserInputAllowedRef to block user input if nav menu is open.
      return newState;
    });
  };

  // Listen for ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    // Cleanup function runs on component unmount and before re-running the effect
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // handlers for each menu item

  const handleBlog = () => {
    navigate("/blog");
    onClose();
  };

  const handleResume = () => {
    window.open("/Resume.pdf", "_blank");
    onClose();
  };

  const handleContact = () => {
    navigator.clipboard.writeText("muehring.luke@gmail.com");
    showToast("Email copied to clipboard!");
    onClose();
  };

  const handleToggleNightMode = () => {
    if (onToggleNightMode) onToggleNightMode();
    onClose();
  };

  function showToast(
    message: string,
    duration = 3000,
    containerId = "toastContainer",
  ) {
    const newDiv = document.createElement("div");
    newDiv.classList.add("toast", "toast-in");
    newDiv.textContent = message;

    const container = document.getElementById(containerId);
    container?.appendChild(newDiv);

    // Set a timeout to remove the toast after the specified duration
    setTimeout(() => {
      newDiv.classList.remove("toast-in");

      newDiv.classList.add("toast-out");

      setTimeout(() => {
        newDiv.remove(); // Remove the toast after animation
      }, 500); // Wait for animation to finish
    }, duration);
  }

  return (
    <nav id="nav" className={darkMode ? "dark" : ""}>
      {/* hamburger menu icon btn */}
      <button
        className={`ham-menu ${isActive ? "active" : ""} ${darkMode ? "dark" : ""}`}
        onClick={handleMenuToggle}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* menu options */}
      <div
        className={`menu-container ${isActive ? "active" : ""} ${
          darkMode ? "dark" : ""
        }`}
      >
        <div className={`menu ${darkMode ? "dark" : ""}`}>
          <button onClick={handleBlog}>Blog</button>
          <button onClick={handleContact}>Contact</button>
          <button onClick={handleResume}>Resume</button>
          <button onClick={handleToggleNightMode}>
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>
        </div>
      </div>
    </nav>
  );
}
