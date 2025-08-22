import type { Post } from "../../../types/Post";
const modules = import.meta.glob("./*.mdx", { eager: true });

export const posts: Post[] = Object.entries(modules).map(([path, mod]) => {
  const Component = (mod as any).default;

  // Automatically derive the id from the filename
  // Remove "./" prefix and ".mdx" extension
  const id = path.replace(/^.\//, "").replace(/\.mdx$/, "");

  // Access exported variables from the MDX module
  const title = (mod as any).title ?? id;
  const date = (mod as any).date ?? "";

  return {
    id,
    title,
    date,
    component: Component,
  };
});
