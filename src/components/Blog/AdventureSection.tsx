import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { srcSetFor } from "../../lib/blogImages";
import { AdventureListContext, scrollStripByCard } from "./AdventureListContext";
import "./Blog.css";

interface AdventureSectionProps {
  title: string;
  /** One short line on what the section is about, shown under the title. */
  logline: string;
  /** The showcase photo on the card. Without one, the card is text only. */
  image?: string;
  /** The details: PanelPhoto and PanelText, in the order they scroll. */
  children: React.ReactNode;
}

/** The card's photo: two fifths of the 896px column from md up, the column below. */
const CARD_IMAGE_SIZES = "(min-width: 768px) 360px, 80vw";

/**
 * One part of an adventure season: a card with a showcase photo, a title and a
 * logline. Opened, the card shrinks to a header bar and the container grows a strip of
 * photos and text that scrolls sideways, so the page itself only grows by the strip.
 * Whether it is open lives in the AdventureList around it, for Expand all.
 */
export default function AdventureSection(props: AdventureSectionProps) {
  const { title, logline, image, children } = props;
  const list = useContext(AdventureListContext);
  const register = list?.register;
  const stripRef = useRef<HTMLDivElement>(null);
  // Only used outside an AdventureList, which otherwise keeps this.
  const [isOpenAlone, setIsOpenAlone] = useState(false);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const panelId = `adventure-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const isOpen = list ? list.isOpen(panelId) : isOpenAlone;


  const updateEdges = () => {
    const strip = stripRef.current;
    if (!strip) return;
    setIsAtStart(strip.scrollLeft <= 1);
    setIsAtEnd(strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1);
  };

  // Sets the arrows for a freshly opened panel, before the reader has scrolled it.
  useEffect(() => {
    if (isOpen) updateEdges();
  }, [isOpen]);

  /**
   * Scrolls this section's strip a card. Its arrow buttons call this, and so do the
   * arrow keys, through the list.
   * @param direction - 1 for onwards, -1 for back.
   */
  const scrollStrip = useCallback((direction: number) => {
    if (stripRef.current) scrollStripByCard(stripRef.current, direction);
  }, []);

  // Adds the section to its list, in page order, with its scroll function.
  useEffect(() => register?.(panelId, scrollStrip), [register, panelId, scrollStrip]);

  const handleTriggerClick = () => {
    if (list) {
      list.setOpen(panelId, !isOpen);
    } else {
      setIsOpenAlone(!isOpen);
    }
  };

  return (
    <div className={`adventure ${image ? "has-image" : ""} ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="adventure__trigger cursor-pointer"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={handleTriggerClick}
      >
        {image && (
          <div className="adventure__image">
            <img
              src={image}
              srcSet={srcSetFor(image) ?? undefined}
              sizes={CARD_IMAGE_SIZES}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
        <div className="adventure__summary">
          <div className="adventure__title">{title}</div>
          <div className="adventure__logline">{logline}</div>
        </div>
      </button>
      {/* Always rendered, so opening and closing can grow and shrink it rather than
          pop it in and out. inert keeps a closed panel out of the tab order. */}
      <div className="adventure__collapse" inert={!isOpen}>
        <div className="adventure__collapse-inner">
          <div
            id={panelId}
            className="adventure__panel"
            role="region"
            aria-label={title}
            // A click or tap anywhere in an open panel hands it the arrow keys.
            onPointerDown={() => list?.claimArrowKeys(panelId)}
          >
            <div ref={stripRef} className="adventure__strip" onScroll={updateEdges}>
              {children}
            </div>
            <button
              type="button"
              className="adventure__arrow adventure__arrow--back cursor-pointer"
              onClick={() => scrollStrip(-1)}
              disabled={isAtStart}
              aria-label="Scroll back"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="adventure__arrow adventure__arrow--on cursor-pointer"
              onClick={() => scrollStrip(1)}
              disabled={isAtEnd}
              aria-label="Scroll on"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
