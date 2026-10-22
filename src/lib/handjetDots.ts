import dotData from "../data/handjet-dots.json";

/**
 * Handjet's dot lattice, extracted from the font file itself.
 *
 * Handjet's glyphs are not outlines: each is a composite of one repeated
 * component named "pixel" sitting on a fixed grid. scripts/extract-handjet-dots.py
 * walks that structure and writes src/data/handjet-dots.json, which means the
 * dot positions here are the font's real ones rather than something recovered
 * by sampling a rendered bitmap.
 *
 * The lattice is the same at every point in the variable font's design space --
 * ELGR, ELSH and wght change the size and shape of the element, never the grid
 * it sits on -- so this data is valid whatever the CSS axis values are.
 */

export type Glyph = {
  /** advance width, in grid cells */
  advance: number;
  /** [col, row] per dot, in grid cells, y up from the baseline */
  dots: [number, number][];
};

// The JSON widens [col, row] to number[], so go via unknown.
const GLYPHS = dotData.glyphs as unknown as Record<string, Glyph>;

/** grid cells per em, so cellPx = fontSize / CELLS_PER_EM */
export const CELLS_PER_EM: number = dotData.cellsPerEm;

export function glyphFor(char: string): Glyph | undefined {
  return GLYPHS[char];
}

/** Whether every character can be drawn from the lattice. */
export function hasDotsFor(text: string): boolean {
  return [...text].every((c) => GLYPHS[c] !== undefined);
}

/** Total advance of a string, in grid cells. */
export function advanceOf(text: string): number {
  let pen = 0;
  for (const char of text) pen += GLYPHS[char]?.advance ?? 0;
  return pen;
}

/**
 * Stable pseudo-random in [0, 1) from two integers.
 * Deterministic so a dot scatters to the same place on every frame and every
 * reload -- Math.random() here would make each dot jitter every frame.
 */
export function hash2(a: number, b: number): number {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
