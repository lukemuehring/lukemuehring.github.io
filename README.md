# Personal Website

This is my personal website.
It uses:

- React
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

Credits

- [This tutorial](https://levelup.gitconnected.com/creating-a-simple-2d-game-with-html5-javascript-889aa06035ef) was a good starting point to learn the basics
- [This MDN guide](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps/Square_tilemaps_implementation:_Scrolling_maps) also helped explain scrolling tilemaps and camera movement
- Thanks you to Anokolsia for the pixel art for floor tiles at [this website](https://anokolisa.itch.io/basic-140-tiles-grassland-and-mines)
- Player sprite created using [maples.im](https://maples.im/)

# dev notes

## starting local dev

npm run start

## deploying

git checkout master
npm run deploy

## writing a blog post

Posts live in `src/components/Blog/posts/` as `NN-slug.mdx`, each starting with:

```mdx
export const date = "2026-10-23";
export const title = "Post Title";
```

Every `.mdx` file in that folder shows up in the blog list, drafts included.

## adding photos to a blog post

Photos go through `scripts/build-blog-images.swift` (macOS only - it uses Apple's
image library). It turns full-size originals into the files the site serves.

1. **Export from Photos:** File › Export › Export N Photos, with JPEG, Quality
   Maximum, Size Full Size and Color Profile Original. HEIC works too.
2. **Put them in `blog-originals/<post>/`**, e.g. `blog-originals/peak/peak_01.jpg`.
   This folder is gitignored, so the originals stay on your machine. Names must be
   unique across all posts.
3. **Run the script:**

   ```sh
   swift scripts/build-blog-images.swift
   ```

   For each photo it writes:
   - `images/blog/<post>/<name>.avif` - full resolution, about a third the size of
     the export. This is what the post imports and the photo viewer opens.
   - `images/blog/<post>/display/<name>-1024.avif` and `-2048.avif` - the smaller
     copies the post shows, picked by the browser for the screen.
   - an entry in `src/data/blog-image-dims.json`, so the page reserves the photo's
     space before it loads.

   It also strips GPS location from every file. Only new or changed photos are
   redone, and copies of deleted photos are cleaned up, so re-run it after any
   add, replace or remove.
4. **Use them in the post:**

   ```mdx
   import peak_01 from '../../../../images/blog/peak/peak_01.avif';
   import peak_02 from '../../../../images/blog/peak/peak_02.avif';
   import BlogPicture from "../BlogPicture";
   import BlogDoublePicture from "../BlogDoublePicture";

   <BlogPicture imageSrc={peak_01} fullSize={true} caption={"Full column width."}/>
   <BlogPicture imageSrc={peak_01} caption={"Half width on desktop."}/>
   <BlogDoublePicture imageSrc1={peak_01} imageSrc2={peak_02} caption={"Side by side."}/>
   ```

5. **Commit** `images/blog/<post>/` (including `display/`) and
   `src/data/blog-image-dims.json`.

Things to know:

- **Size limit:** GitHub Pages caps the site at 1 GB. A 50-photo post is roughly
  400 MB. Check with `npm run build && du -sh dist` before deploying.
- **Rotated photos:** the script stops on a photo stored rotated. Re-export it from
  Photos, which writes it upright.
- **Older posts** (watch, pfeiff) keep their JPEGs and PNGs in `images/blog/<post>/`
  as the full-resolution file. The script still makes their display copies.


### Notes
https://www.spriters-resource.com/game_boy_advance/metfusion/asset/1671/
https://www.spriters-resource.com/game_boy_advance/metfusion/asset/61915/
https://www.spriters-resource.com/game_boy_advance/metfusion/asset/152436/
https://www.spriters-resource.com/game_boy_advance/metfusion/asset/1640/
https://www.spriters-resource.com/game_boy_advance/metfusion/asset/61882/
