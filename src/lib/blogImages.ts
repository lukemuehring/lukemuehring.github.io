import dimensions from "../data/blog-image-dims.json";

/**
 * Pixel dimensions of every full-resolution image under images/blog, keyed by filename
 * stem.
 *
 * scripts/build-blog-images.swift writes src/data/blog-image-dims.json along with the
 * display copies - re-run it whenever blog images are added, replaced or removed.
 */
const IMAGE_DIMENSIONS: Record<string, Array<number>> = dimensions;

/**
 * The display copies the build script makes, by path. Their URLs come through the
 * bundler like any import, so they pick up its hashed names in a build.
 */
const DISPLAY_COPY_URLS = import.meta.glob<string>(
  "../../images/blog/*/display/*.avif",
  { eager: true, query: "?url", import: "default" }
);

/** Rollup emits assets as <stem>-<hash><ext>, with an 8-character base64url hash. */
const BUNDLER_HASH = /-[A-Za-z0-9_-]{8}$/;

/** A display copy is named <stem>-<width>.avif after the image it was made from. */
const DISPLAY_COPY_NAME = /\/([^/]+)-(\d+)\.avif$/;

/**
 * `sizes` for a photo across the post column: BlogPost's w-[80%], capped at 896px by
 * md:max-w-4xl from a 1120px viewport.
 */
export const COLUMN_SIZES = "(min-width: 1120px) 896px, 80vw";

/** `sizes` for a photo given half the column from md up. */
export const HALF_COLUMN_SIZES =
  "(min-width: 1120px) 448px, (min-width: 768px) 40vw, 80vw";

interface DisplayCopy {
  width: number;
  url: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

/** Each image's display copies, keyed by the stem of the image, narrowest first. */
const DISPLAY_COPIES = new Map<string, Array<DisplayCopy>>();
for (const [path, url] of Object.entries(DISPLAY_COPY_URLS)) {
  const match = path.match(DISPLAY_COPY_NAME);
  if (!match) continue;
  const [, stem, width] = match;
  const displayCopies = DISPLAY_COPIES.get(stem) ?? [];
  displayCopies.push({ width: Number(width), url });
  DISPLAY_COPIES.set(stem, displayCopies);
}
for (const displayCopies of DISPLAY_COPIES.values()) {
  displayCopies.sort((narrower, wider) => narrower.width - wider.width);
}

/**
 * Finds the stem an image is keyed under.
 *
 * The src has been through the bundler by the time it reaches here, so the path the
 * manifest was built from is gone: in dev it arrives as
 * /images/blog/watch/watch_1.jpg and in a build as /assets/watch_1-Bub7Hv9M.jpg.
 * The stem is the only part that survives both, which is why it is the manifest key -
 * and why blog image names have to stay unique across subfolders (the build script
 * fails loudly if they are not).
 * @param src - An image URL, as the bundler handed it over.
 * @returns The filename stem less any bundler hash, or null for a src with no file.
 */
function stemFor(src: string): string | null {
  const file = src.split(/[?#]/)[0].split("/").pop();
  if (!file) return null;

  const stem = file.replace(/\.[^.]+$/, "");
  return stem in IMAGE_DIMENSIONS ? stem : stem.replace(BUNDLER_HASH, "");
}

/**
 * Looks up an image's full-resolution pixel size.
 * @param src - The image's URL, as the post imported it.
 * @returns Its width and height, or null if it is not in the manifest.
 */
function dimensionsFor(src: string): ImageDimensions | null {
  const stem = stemFor(src);
  const size = stem ? IMAGE_DIMENSIONS[stem] : null;
  if (!size || !size[0] || !size[1]) return null;
  return { width: size[0], height: size[1] };
}

/**
 * Looks up the aspect ratio of the image a src points at.
 * @param src - The image's URL, as the post imported it.
 * @returns Width over height, or null if the image is not in the manifest.
 */
export function aspectRatioFor(src: string): number | null {
  const size = dimensionsFor(src);
  return size ? size.width / size.height : null;
}

/**
 * Builds the srcset that lets the browser pick a display copy for the screen. The
 * full-resolution file goes in last, for a screen that outgrows every copy.
 * @param src - The full-resolution image's URL, as the post imported it.
 * @returns A srcset of width descriptors, or null if the image has no display copies.
 */
export function srcSetFor(src: string): string | null {
  const stem = stemFor(src);
  const displayCopies = stem ? DISPLAY_COPIES.get(stem) : null;
  const size = dimensionsFor(src);
  if (!displayCopies || !size) return null;

  return [
    ...displayCopies.map((displayCopy) => `${displayCopy.url} ${displayCopy.width}w`),
    `${src} ${size.width}w`
  ].join(", ");
}
