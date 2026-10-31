import "./Blog.css";

interface PanelTextProps {
  /** Markdown from the post: a paragraph or two, or a short list. */
  children: React.ReactNode;
}

/**
 * A card of text in an AdventureSection's panel. It is sized for a paragraph or two;
 * longer writing reads better split across several cards than scrolled inside one.
 */
export default function PanelText(props: PanelTextProps) {
  const { children } = props;
  return <div className="adventure__text-card">{children}</div>;
}
