"""
Record the pixel dimensions of every blog image, so a post can reserve exactly the
right space for a photo before that photo has downloaded.

The blog's images are phone photos and screenshots in mixed orientations -- 4032x3024
landscape, 3024x4032 portrait, 1812x3044 screenshots -- so there is no single aspect
ratio the layout could assume. Without the real numbers the column lurches every time
one of them lands, which is the whole thing an image skeleton exists to prevent.

Only the header of each file is read (PNG IHDR, JPEG SOFn, WebP VP8/VP8L/VP8X), so
this needs no image library and stays fast over ~100MB of photos.

Run manually when blog images are added, replaced or resized:

    python3 scripts/extract-image-dims.py

Writes src/data/blog-image-dims.json.
"""

import json
import pathlib
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "images" / "blog"
OUTPUT = ROOT / "src" / "data" / "blog-image-dims.json"

SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}

# Start-of-frame markers carry the dimensions. 0xc4, 0xc8 and 0xcc share the range but
# are Huffman/arithmetic tables, not frames.
JPEG_SOF_MARKERS = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}


def png_size(data: bytes) -> "tuple[int, int] | None":
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", data[16:24])


def jpeg_size(data: bytes) -> "tuple[int, int] | None":
    if data[:2] != b"\xff\xd8":
        return None
    i = 2
    while i < len(data) - 1:
        if data[i] != 0xFF:
            i += 1  # resync; padding between segments is legal
            continue
        marker = data[i + 1]
        i += 2
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            continue  # standalone markers, no payload
        if marker == 0xD9 or marker == 0xDA:
            return None  # end of image, or start of scan - no frame header found
        if i + 2 > len(data):
            return None
        (length,) = struct.unpack(">H", data[i : i + 2])
        if marker in JPEG_SOF_MARKERS:
            height, width = struct.unpack(">HH", data[i + 3 : i + 7])
            return width, height
        i += length
    return None


def webp_size(data: bytes) -> "tuple[int, int] | None":
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8X":
        width = int.from_bytes(data[24:27], "little") + 1
        height = int.from_bytes(data[27:30], "little") + 1
        return width, height
    if chunk == b"VP8L":
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b"VP8 ":
        start = data.find(b"\x9d\x01\x2a")
        if start < 0:
            return None
        width, height = struct.unpack("<HH", data[start + 3 : start + 7])
        return width & 0x3FFF, height & 0x3FFF
    return None


def size_of(path: pathlib.Path) -> "tuple[int, int] | None":
    # 64KB is far more than any of these headers need, but EXIF blocks sit ahead of the
    # JPEG frame header and can run to tens of KB.
    with path.open("rb") as handle:
        data = handle.read(65536)
    for reader in (png_size, jpeg_size, webp_size):
        size = reader(data)
        if size:
            return size
    return None


def main() -> int:
    if not SOURCE_DIR.is_dir():
        print(f"no such directory: {SOURCE_DIR}", file=sys.stderr)
        return 1

    dims: dict[str, list[int]] = {}
    owners: dict[str, pathlib.Path] = {}
    failures: list[pathlib.Path] = []

    for path in sorted(SOURCE_DIR.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in SUFFIXES:
            continue

        # Keyed by filename stem, because that is all the lookup gets to work with: the
        # bundler rewrites these to /assets/<stem>-<hash>.jpg, losing the directory.
        key = path.stem
        if key in owners:
            print(
                f"duplicate image name {key!r}: {owners[key]} and {path}.\n"
                "Blog image names have to be unique across subfolders - rename one.",
                file=sys.stderr,
            )
            return 1

        size = size_of(path)
        if not size:
            failures.append(path)
            continue

        owners[key] = path
        dims[key] = [size[0], size[1]]

    for path in failures:
        print(f"could not read dimensions: {path.relative_to(ROOT)}", file=sys.stderr)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(dims, indent=2, sort_keys=True) + "\n")
    print(f"wrote {len(dims)} entries to {OUTPUT.relative_to(ROOT)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
