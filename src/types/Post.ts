import type { ComponentType } from "react";

export type Post = {
  id: string; // unique identifier, used in URL (e.g. "getting-started")
  title: string; // post title
  date: string; // ISO date string ("2025-08-21")
  displayDate: string; // date as shown on the page ("August 21, 2025")
  component: ComponentType; // the rendered MDX component
};
