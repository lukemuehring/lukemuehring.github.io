import type { Post } from "../../../types/Post";
const modules = import.meta.glob("./*.mdx", { eager: true });

export const posts: Post[] = Object.entries(modules).map(([path, mod]) => {
  const Component = (mod as any).default;

  const id = path.replace("./", "").replace(".mdx", "");
  const title = (mod as any).title ?? id;
  const date = (mod as any).date ?? "";

  return {
    id,
    title,
    date,
    component: Component,
  };
});
