import type { ComponentType } from "react";

export type Post = {
  id: string; // unique identifier, used in URL (e.g. "getting-started")
  title: string; // post title
  date: string; // ISO date string ("2025-08-21")
  component: ComponentType; // the rendered MDX component
};
