import dimensions from "../data/blog-image-dims.json";

/**
 * Pixel dimensions of every image under images/blog, keyed by filename stem.
 *
 * scripts/extract-image-dims.py walks the folder and writes
 * src/data/blog-image-dims.json - re-run it whenever blog images are added, replaced
 * or resized.
 */
const IMAGE_DIMENSIONS: Record<string, number[]> = dimensions;

/** Rollup emits assets as <stem>-<hash><ext>, with an 8-character base64url hash. */
const BUNDLER_HASH = /-[A-Za-z0-9_-]{8}$/;

/**
 * The aspect ratio of the image a src points at, or null if it is not in the manifest.
 *
 * The src has been through the bundler by the time it reaches here, so the path the
 * manifest was built from is gone: in dev it arrives as
 * /images/blog/watch/watch_1.jpg and in a build as /assets/watch_1-Bub7Hv9M.jpg.
 * The stem is the only part that survives both, which is why it is the manifest key -
 * and why blog image names have to stay unique across subfolders (the script fails
 * loudly if they are not).
 */
export function aspectRatioFor(src: string): number | null {
  const file = src.split(/[?#]/)[0].split("/").pop();
  if (!file) return null;

  const stem = file.replace(/\.[^.]+$/, "");
  const size =
    IMAGE_DIMENSIONS[stem] ?? IMAGE_DIMENSIONS[stem.replace(BUNDLER_HASH, "")];

  if (!size || !size[0] || !size[1]) return null;
  return size[0] / size[1];
}
