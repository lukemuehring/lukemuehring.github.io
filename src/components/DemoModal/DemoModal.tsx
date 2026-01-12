import { useEffect } from "react";
import "./DemoModal.css";

type DemoModalProps = {
  content?: (props: { darkMode: boolean }) => React.ReactNode;
  headerText: string;
  images?: { src: string }[];
  text: string;
  link: string;
  darkMode: boolean;
  onClose: () => void;
};

export default function DemoModal({
  content,
  headerText,
  images = [],
  text,
  link,
  darkMode,
  onClose,
}: DemoModalProps) {
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
  }, [onClose]);

  return (
    <div className={darkMode ? "demo-modal demo-modal--dark" : "demo-modal"}>
      {/* Header */}
      <p className="demo-modal__header">{headerText}</p>
      {/* Close button */}
      <button
        className={
          darkMode
            ? "demo-modal__close demo-modal__close--dark"
            : "demo-modal__close"
        }
        onClick={onClose}
      >
        &times;
      </button>
      {/* Images */}
      {images.length > 0 && (
        <div className="demo-modal__image-container">
          <div className="demo-modal__slider-wrapper">
            <div className="demo-modal__image-list">
              {images.concat(images).map((img, idx) => (
                <img
                  key={idx}
                  src={img.src}
                  className="demo-modal__image-item"
                  aria-hidden={idx >= images.length ? "true" : "false"}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Text + Link */}
      <div className="demo-modal__content">
        <p className="demo-modal__text">{text}</p>

        {link.length > 0 && (
          <a
            href={link}
            target="_blank"
            className={
              darkMode
                ? "demo-modal__link demo-modal__link--dark"
                : "demo-modal__link"
            }
          >
            See it live!
          </a>
        )}
      </div>
      {/* Content */}
      {typeof content === "function" ? content({ darkMode }) : content}{" "}
    </div>
  );
}
