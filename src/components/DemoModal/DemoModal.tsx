import { useEffect } from "react";
import "./DemoModal.css";

type DemoModalProps = {
  headerText: string;
  images?: { src: string }[];
  text: string;
  link: string;
  onClose: () => void;
};

export default function DemoModal({
  headerText,
  images = [],
  text,
  link,
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
    <div className="demo-modal">
      {/* Header */}
      <p className="demo-modal__header">{headerText}</p>

      {/* Close button */}
      <button className="demo-modal__close" onClick={onClose}>
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
        <a href={link} target="_blank" className="demo-modal__link">
          See it live!
        </a>
      </div>
    </div>
  );
}
