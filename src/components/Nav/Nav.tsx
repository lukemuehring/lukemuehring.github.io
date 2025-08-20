import { useEffect, useState } from "react";
import { movePlayerToScreenCoords } from "../../lib/helpers";
import type { Player } from "../../types/Player";
import type { Button } from "../../types/Button";

type NavProps = {
  IsNavMenuOpenRef: React.RefObject<boolean>;
  onRefChange: () => void;
  PlayerRef: React.RefObject<Player | null>;
  DemosRef: React.RefObject<Button[] | null>;
};

export default function Nav({
  IsNavMenuOpenRef,
  onRefChange,
  PlayerRef,
  DemosRef,
}: NavProps) {
  const [isActive, setIsActive] = useState(false);

  const onClose = () => {
    setIsActive(false); // update local state
    IsNavMenuOpenRef.current = false; // update the parent ref
    onRefChange(); // update derived ref
  };

  const handleMenuToggle = () => {
    setIsActive((prev) => {
      const newState = !prev;
      IsNavMenuOpenRef.current = newState;
      onRefChange();
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

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // handlers for each menu item
  const handleResume = () => {
    window.open("../../assets/Resume.pdf", "_blank");
    onClose();
  };

  const handleContact = () => {
    navigator.clipboard.writeText("muehring.luke@gmail.com");
    showToast("Email copied to clipboard!");
    onClose();
  };

  const handleWork = () => {
    if (PlayerRef.current && DemosRef.current) {
      movePlayerToScreenCoords(PlayerRef.current, DemosRef.current[0].x, 0);
    }
    onClose();
  };

  const handleLinkedIn = () => {
    window.open(
      "https://www.linkedin.com/in/lukemuehring/",
      "_blank",
      "noopener,noreferrer"
    );
    onClose();
  };

  function showToast(
    message: string,
    duration = 3000,
    containerId = "toastContainer"
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
    <nav id="nav">
      <button
        className={`ham-menu ${isActive ? "active" : ""}`}
        onClick={handleMenuToggle}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`menu-container ${isActive ? "active" : ""}`}>
        <div className="menu">
          <button onClick={handleResume}>Resume</button>
          <button onClick={handleContact}>Contact</button>
          <button onClick={handleWork}>My Work</button>
          <button onClick={handleLinkedIn}>LinkedIn</button>
        </div>
      </div>
    </nav>
  );
}
