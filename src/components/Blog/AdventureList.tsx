import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdventureListContext } from "./AdventureListContext";
import "./Blog.css";

interface AdventureListProps {
  /** AdventureSection cards, in the order they happened. */
  children: React.ReactNode;
}

/** Past this many sections, an Expand all button sits above the first. */
const EXPAND_ALL_MIN_SECTIONS = 4;

/**
 * Stacks AdventureSection cards down the page, with room between them. It keeps which
 * sections are open, offers Expand all once there are enough of them, and lets the left
 * and right arrow keys step through the last-used open section's strip.
 */
export default function AdventureList(props: AdventureListProps) {
  const { children } = props;
  const [sectionIds, setSectionIds] = useState<Array<string>>([]);
  const [openIds, setOpenIds] = useState<Array<string>>([]);
  /** Each section's own scroll function, the one its arrow buttons call. */
  const scrollStripsRef = useRef(new Map<string, (direction: number) => void>());
  /** Open sections, least recently used first: the arrow keys move the last one. */
  const keyOrderRef = useRef<Array<string>>([]);
  const isAllOpen =
    sectionIds.length > 0 &&
    sectionIds.every((sectionId) => openIds.includes(sectionId));

  const register = useCallback((id: string, scrollStrip: (direction: number) => void) => {
    scrollStripsRef.current.set(id, scrollStrip);
    setSectionIds((currentIds) => [...currentIds, id]);
    return () => {
      scrollStripsRef.current.delete(id);
      setSectionIds((currentIds) => currentIds.filter((currentId) => currentId !== id));
    };
  }, []);

  const claimArrowKeys = useCallback((id: string) => {
    keyOrderRef.current = [...keyOrderRef.current.filter((keyId) => keyId !== id), id];
  }, []);

  const setOpen = useCallback(
    (id: string, isOpen: boolean) => {
      setOpenIds((currentIds) => {
        const otherIds = currentIds.filter((currentId) => currentId !== id);
        return isOpen ? [...otherIds, id] : otherIds;
      });
      if (isOpen) {
        claimArrowKeys(id);
      } else {
        keyOrderRef.current = keyOrderRef.current.filter((keyId) => keyId !== id);
      }
    },
    [claimArrowKeys]
  );

  const contextValue = useMemo(
    () => ({
      isOpen: (id: string) => openIds.includes(id),
      setOpen,
      claimArrowKeys,
      register
    }),
    [openIds, setOpen, claimArrowKeys, register]
  );

  // Moves the last-used open section a card with the left and right arrow keys, through
  // the same function as its arrow buttons.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isArrow = event.key === "ArrowLeft" || event.key === "ArrowRight";
      if (!isArrow) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      // Typing keeps its arrow keys, and so does a photo open in the viewer.
      const eventTarget = event.target;
      const isTyping =
        eventTarget instanceof Element &&
        eventTarget.closest("input, textarea, [contenteditable], dialog");
      if (isTyping) return;
      const targetId = keyOrderRef.current.at(-1);
      const scrollStrip = targetId ? scrollStripsRef.current.get(targetId) : null;
      if (!scrollStrip) return;

      event.preventDefault();
      scrollStrip(event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleAll = () => {
    if (isAllOpen) {
      setOpenIds([]);
      keyOrderRef.current = [];
      return;
    }
    setOpenIds(sectionIds);
    // Reversed, so the first section is the last used: the one the arrow keys move.
    keyOrderRef.current = [...sectionIds].reverse();
  };

  return (
    <AdventureListContext.Provider value={contextValue}>
      {sectionIds.length >= EXPAND_ALL_MIN_SECTIONS && (
        <div className="adventure-list__controls">
          <button
            type="button"
            className="adventure-list__toggle cursor-pointer"
            onClick={handleToggleAll}
          >
            {/* Both labels hold the space, so the button keeps one width. */}
            <div className="adventure-list__labels">
              <div className={isAllOpen ? "is-hidden" : undefined}>Expand all</div>
              <div className={isAllOpen ? undefined : "is-hidden"}>Collapse all</div>
            </div>
          </button>
        </div>
      )}
      <div className="adventure-list">{children}</div>
    </AdventureListContext.Provider>
  );
}
