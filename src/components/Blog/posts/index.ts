import type { Post } from "../../../types/Post";
const modules = import.meta.glob("./*.mdx", { eager: true });

export const posts: Post[] = Object.entries(modules)
  .map(([path, mod]) => {
    const Component = (mod as any).default;

    // Automatically derive the id from the filename
    // Remove "./" prefix and ".mdx" extension
    const id = path.replace(/^.\//, "").replace(/\.mdx$/, "");

    // Access exported variables from the MDX module
    const title = (mod as any).title ?? id;
    const date = (mod as any).date ?? "";
    // "2026-09-30" parses as UTC midnight, so it is formatted in UTC as well, or a
    // reader west of Greenwich would see the day before.
    const displayDate = date
      ? new Date(date).toLocaleDateString("en-US", {
          timeZone: "UTC",
          month: "long",
          day: "numeric",
          year: "numeric"
        })
      : "";

    return {
      id,
      title,
      date,
      displayDate,
      component: Component,
    };
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  