import { FONT_COLOR_DARK_MODE, FONT_COLOR_LIGHT_MODE } from "../lib/constants";
import { getCanvasFontString } from "../lib/helpers";

type Hsl = { h: number; s: number; l: number };

/**
 * One scheduled pass of the hop across the word. Keeping height and stagger
 * on the wave rather than on the class is what lets the entrance hop be tall
 * and synced to the intro while the follow-up hop is shorter and runs at its
 * own rhythm.
 */
type JumpWave = {
  /** absolute ms timestamp the wave starts */
  at: number;
  /** peak height, as a fraction of fontSize */
  height: number;
  /** ms between one letter leaving the ground and the next */
  stagger: number;
  /** ms this pass keeps a single letter in the air */
  duration: number;
};

type LetterState = {
  alpha: number;
  scale: number;
  /** screen-space pixel offsets from the letter's home, canvas convention:
   *  positive x is right, positive y is DOWN. The jump therefore uses a
   *  negative offsetY to rise. */
  offsetX: number;
  offsetY: number;
  /** 0..1 through the intro rainbow, or null to use the flat theme colour */
  hue: number | null;
};

/** #rrggbb -> HSL, so the intro rainbow can land exactly on the theme colour. */
function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  return { h: (((h * 60) % 360) + 360) % 360, s: s * 100, l: l * 100 };
}

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const clamp01to100 = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Progress of one letter through a staggered phase, or null when the letter
 * has not started yet or has already finished.
 */
function letterProgress(
  elapsed: number,
  index: number,
  stagger: number,
  duration: number,
): number | null {
  const t = elapsed - index * stagger;
  if (t < 0 || t >= duration) return null;
  return t / duration;
}

export class GameText {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isVisible: boolean;
  canShowText: React.RefObject<boolean>;
  color?: string;

  // --- intro: fade, scale, spin and rainbow, staggered per letter ---
  introDuration: number;
  introStagger: number;
  introScale: number;
  introOffsetX: number;
  introOffsetY: number;
  introSaturation: number;
  introLightness: number;
  introHueTurns: number;

  // --- jump: the Game Boy style hop, staggered per letter ---
  jumpHeight: number;
  introJumpHeight: number;
  jumpStagger: number;
  jumpDuration: number;
  introJumpDuration: number;
  /** null means "derive it from the preceding hop" */
  bounceDuration: number | null;
  jumpWithIntro: boolean;

  // --- sheen: a single highlight sweep across the settled word ---
  sheen: boolean;
  sheenDuration: number;

  /** ms between phases. Negative overlaps them. */
  introJumpGap: number;
  jumpSheenGap: number;

  /**
   * Absolute start times for each phase; null means "not scheduled".
   * The whole sequence is driven by these three numbers, so the on-load run
   * A click adds to these rather than replacing them, so it composes with an
   * entrance that is still running.
   */
  introStartTime: number | null;
  /** every hop pass currently scheduled; they compose, so they may overlap */
  jumpWaves: JumpWave[];
  sheenStartTime: number | null;
  /** whether the first visible frame has kicked off the load sequence */
  hasStarted: boolean;

  hover: boolean;
  /** resting hit box in screen space, refreshed on each draw */
  bounds: { x: number; y: number; width: number; height: number } | null;

  constructor(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    canShowText: React.RefObject<boolean>,
    options?: {
      color?: string;

      // --- intro: each letter fades, shrinks and slides into place ---

      /** ms for one letter to fade, shrink and slide into place */
      introDuration?: number;

      /** ms between one letter starting its intro and the next */
      introStagger?: number;

      /** starting scale for the intro. 1.5 = enters 50% oversized */
      introScale?: number;

      /**
       * how far right of its final home a letter starts, in pixels. The whole
       * word therefore sits offset until the stagger resolves it letter by
       * letter, each sliding back to 0 as it lands.
       */
      introOffsetX?: number;

      /**
       * how far below its final home a letter starts, in pixels. Positive is
       * down, so the letter rises into place. Slides back to 0 on the same
       * curve as introOffsetX.
       */
      introOffsetY?: number;

      /** peak HSL saturation of the intro rainbow, 0-100. 100 is fully vivid */
      introSaturation?: number;

      /**
       * peak HSL lightness of the intro rainbow, 0-100. Around 50 gives the
       * most saturated colour; higher washes toward white, lower toward black.
       */
      introLightness?: number;

      /** trips around the colour wheel during one letter's intro */
      introHueTurns?: number;

      // --- jump: the Game Boy style hop ---

      /** peak hop height, as a fraction of fontSize */
      jumpHeight?: number;

      /**
       * peak hop height for the first-load hop only, as a fraction of
       * fontSize. Lets the entrance land harder than the replays that follow.
       * Defaults to twice jumpHeight. A cap height in this font is ~0.65em
       * (11 of the 17 grid rows), so 0.65 clears exactly one letter.
       */
      introJumpHeight?: number;

      /** ms between one letter leaving the ground and the next following */
      jumpStagger?: number;

      /** ms a single letter spends in the air */
      jumpDuration?: number;

      /**
       * ms a letter spends in the air on the first-load hop only. Separate
       * from jumpDuration so the entrance can hang longer without slowing
       * the click replays, exactly as introJumpHeight does for height.
       * Defaults to jumpDuration.
       */
      introJumpDuration?: number;

      /**
       * ms the follow-up bounce keeps a letter in the air. Left unset it is
       * derived from the hop it follows, so the two stay in proportion --
       * see bounceDurationFor().
       */
      bounceDuration?: number;

      /**
       * run the hop at the same time as the intro instead of after it, so a
       * letter fades, slides and hops in one move. introJumpGap is ignored.
       */
      jumpWithIntro?: boolean;

      // --- sheen: one highlight sweep across the settled word ---

      sheen?: boolean;

      /** ms for the highlight to sweep the word once */
      sheenDuration?: number;

      // --- sequencing ---

      /**
       * ms between the intro ending and the jump starting. Negative overlaps
       * them, so the first letters start hopping while the last ones are
       * still arriving.
       */
      introJumpGap?: number;

      /** ms between the jump ending and the sheen starting. Negative overlaps. */
      jumpSheenGap?: number;
    },
  ) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.fontSize = fontSize;
    this.isVisible = true;
    this.canShowText = canShowText;
    this.color = options?.color;

    this.introDuration = options?.introDuration ?? 650;
    this.introStagger = options?.introStagger ?? 90;
    this.introScale = options?.introScale ?? 1.5;
    this.introOffsetX = options?.introOffsetX ?? 50;
    this.introOffsetY = options?.introOffsetY ?? 50;
    this.introSaturation = options?.introSaturation ?? 100;
    this.introLightness = options?.introLightness ?? 50;
    this.introHueTurns = options?.introHueTurns ?? 1;

    this.jumpHeight = options?.jumpHeight ?? 0.22;
    this.introJumpHeight = options?.introJumpHeight ?? this.jumpHeight * 2;
    this.jumpStagger = options?.jumpStagger ?? 70;
    this.jumpDuration = options?.jumpDuration ?? 420;
    this.introJumpDuration = options?.introJumpDuration ?? this.jumpDuration;
    this.bounceDuration = options?.bounceDuration ?? null;
    this.jumpWithIntro = options?.jumpWithIntro ?? false;

    this.sheen = options?.sheen ?? false;
    this.sheenDuration = options?.sheenDuration ?? 1400;
    this.introJumpGap = options?.introJumpGap ?? 0;
    this.jumpSheenGap = options?.jumpSheenGap ?? 0;

    this.introStartTime = null;
    this.jumpWaves = [];
    this.sheenStartTime = null;
    this.hasStarted = false;

    this.hover = false;
    this.bounds = null;
  }

  /** Wall-clock length of the staggered intro, last letter included. */
  get introLength(): number {
    return this.introStagger * (this.text.length - 1) + this.introDuration;
  }

  /**
   * Stagger the hop actually uses. When the hop runs with the intro it has to
   * borrow the intro's stagger: on its own, the faster jump wave outruns the
   * intro wave, and since a letter is alpha 0 until its own intro begins, the
   * later letters finish hopping while still invisible. Sharing the stagger
   * lands each letter's hop exactly on its fade-in.
   */
  /** Wall-clock length of one hop pass, last letter included. */
  waveLength(stagger: number, duration: number): number {
    return stagger * (this.text.length - 1) + duration;
  }

  /**
   * How long the bounce after a given hop should last.
   *
   * Under gravity a hop's airtime scales with the square root of its height,
   * so a bounce reaching 0.22 after a hop of 0.65 takes sqrt(0.22/0.65) ~= 0.58
   * of its airtime. Deriving it keeps "slow first hop, quicker bounce" true
   * whatever the heights and durations are tuned to -- a fixed default read
   * wrong here because it was a fraction of jumpDuration (the *click* hop),
   * which has nothing to do with the much slower entrance hop it follows.
   */
  bounceDurationFor(hop: JumpWave): number {
    if (this.bounceDuration !== null) return this.bounceDuration;
    if (hop.height <= 0) return hop.duration;
    return hop.duration * Math.sqrt(this.jumpHeight / hop.height);
  }

  /** When a scheduled pass has finished for every letter. */
  waveEnd(w: JumpWave): number {
    return w.at + this.waveLength(w.stagger, w.duration);
  }

  /**
   * Full first-load sequence: letters animate in, then hop, then the sheen
   * sweeps. Each phase is scheduled off the end of the previous one.
   */
  playIntro(now = Date.now()) {
    this.introStartTime = now;
    const introEnd = now + this.introLength;

    // Pass 1 rides along with the intro (borrowing its stagger, so each hop
    // lands on its own letter's fade-in) or waits for it, per jumpWithIntro.
    const firstStagger = this.jumpWithIntro
      ? this.introStagger
      : this.jumpStagger;
    const firstAt = this.jumpWithIntro ? now : introEnd + this.introJumpGap;

    const entrance: JumpWave = {
      at: firstAt,
      height: this.introJumpHeight,
      stagger: firstStagger,
      duration: this.introJumpDuration,
    };

    // Pass 2 is the bounce. It shares pass 1's stagger and starts exactly one
    // entrance-hop later, so every letter begins its second hop the instant it
    // lands from its first -- rather than the whole word waiting on the
    // slowest letter, which read as two separate hops instead of a bounce.
    const bounce: JumpWave = {
      at: firstAt + entrance.duration,
      height: this.jumpHeight,
      stagger: firstStagger,
      duration: this.bounceDurationFor(entrance),
    };

    this.jumpWaves = [entrance, bounce];

    // The sheen waits on whatever finishes last: with the bounce tucked in
    // early, that is usually the intro rather than the hops.
    const lastEnd = Math.max(introEnd, ...this.jumpWaves.map((w) => this.waveEnd(w)));
    this.sheenStartTime = lastEnd + this.jumpSheenGap;
  }

  /**
   * Add a hop pass. Deliberately additive rather than a restart: clicking
   * while the entrance is still running used to null introStartTime and
   * replace jumpWaves, which snapped every letter to full opacity and its
   * final position and threw away the scheduled follow-up hop. Now the click
   * layers another wave over whatever is already in flight, and the phases
   * compose the same way they do on load.
   */
  playJump(now = Date.now()) {
    this.pruneJumpWaves(now);
    const wave: JumpWave = {
      at: now,
      height: this.jumpHeight,
      stagger: this.jumpStagger,
      duration: this.jumpDuration,
    };
    this.jumpWaves.push(wave);

    // The sheen waits for whatever now finishes last, so a late click delays
    // it rather than letting it sweep over still-moving letters.
    const end = this.waveEnd(wave) + this.jumpSheenGap;
    this.sheenStartTime = Math.max(this.sheenStartTime ?? 0, end);
  }

  /** Drops waves that have finished, so repeated clicks cannot grow the list. */
  private pruneJumpWaves(now: number) {
    this.jumpWaves = this.jumpWaves.filter((w) => now < this.waveEnd(w));
  }

  /**
   * Per-letter state this instant, or null when that letter is at rest.
   * Add new first-load effects here: anything returned is applied by draw().
   */
  /**
   * Per-letter state this instant, or null when that letter is at rest.
   *
   * Every phase *contributes* to one shared state rather than returning its
   * own and short-circuiting, so phases can run at the same time: scales
   * multiply, offsets add. That is what lets a letter be mid-intro and
   * mid-hop on the same frame.
   *
   * Add new first-load effects here -- anything folded in is applied by draw().
   */
  private letterState(index: number, now: number): LetterState | null {
    const out: LetterState = {
      alpha: 1,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      hue: null,
    };
    let active = false;

    if (this.introStartTime !== null) {
      const elapsed = now - this.introStartTime;

      if (elapsed < index * this.introStagger) {
        // Before its turn a letter is not on screen at all, otherwise the
        // whole word would flash into view before the stagger begins.
        out.alpha = 0;
        out.scale = this.introScale;
        out.offsetX = this.introOffsetX;
        out.offsetY = this.introOffsetY;
        out.hue = 0;
        active = true;
      } else {
        const p = letterProgress(
          elapsed,
          index,
          this.introStagger,
          this.introDuration,
        );
        if (p !== null) {
          const e = easeOutCubic(p);
          out.alpha *= p;
          out.scale *= this.introScale + (1 - this.introScale) * e;
          // Slides back to its real home as it lands.
          out.offsetX += this.introOffsetX * (1 - e);
          out.offsetY += this.introOffsetY * (1 - e);
          out.hue = p;
          active = true;
        }
      }
    }

    // Every scheduled pass contributes, so overlapping waves simply sum.
    for (const wave of this.jumpWaves) {
      const p = letterProgress(
        now - wave.at,
        index,
        wave.stagger,
        wave.duration,
      );
      if (p !== null) {
        // sin over 0..PI is a clean arc: zero at both ends, so the letter
        // leaves and lands without a jolt. Negative because it rises.
        out.offsetY += -Math.sin(Math.PI * p) * wave.height * this.fontSize;
        active = true;
      }
    }

    return active ? out : null;
  }

  /** Rainbow -> theme colour. At p = 1 this is exactly baseHsl. */
  private introColor(p: number, baseHsl: Hsl): string {
    // Deliberately NOT the easing used for motion. easeOutCubic is ~0.88 by
    // the halfway point, so the colour collapsed to the theme almost at once
    // and the rainbow was never really seen. Cubic ease-IN holds full
    // saturation for most of the run and snaps to the theme colour at the end.
    const e = p * p * p;

    const hue = (baseHsl.h + p * 360 * this.introHueTurns) % 360;
    const sat = clamp01to100(
      this.introSaturation + (baseHsl.s - this.introSaturation) * e,
    );
    const light = clamp01to100(
      this.introLightness + (baseHsl.l - this.introLightness) * e,
    );
    return `hsl(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`;
  }

  draw(
    context: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    darkMode: boolean,
  ) {
    if (!this.isVisible || !this.canShowText.current) return;

    const now = Date.now();

    // The text is gated behind the webfont loading, so the load sequence is
    // started on the first frame it is actually on screen rather than in the
    // constructor, which would play it out of sight.
    if (!this.hasStarted) {
      this.hasStarted = true;
      this.playIntro(now);
    }

    context.save();

    const fontSize = this.fontSize;
    context.font = getCanvasFontString(fontSize);

    const metrics = context.measureText(this.text);
    const textWidth = metrics.width;
    const textX = this.x - cameraX - textWidth / 2;
    const textY = this.y - cameraY;

    // Resting hit box from real glyph metrics. Deliberately the resting
    // position and not the animated one, so the cursor does not flicker
    // between pointer and default while the letters move.
    const ascent = metrics.actualBoundingBoxAscent || fontSize;
    const descent = metrics.actualBoundingBoxDescent || 0;
    this.bounds = {
      x: textX,
      y: textY - ascent,
      width: textWidth,
      height: ascent + descent,
    };

    // One rounded origin shared by both draw paths below. The per-letter path
    // must place glyph i at exactly originX + prefixWidth, which is where a
    // single fillText from originX puts it -- rounding each letter separately
    // shifts every glyph by up to half a pixel and the word visibly twitches
    // when the animation ends and the whole-string path takes over.
    const originX = Math.round(textX);
    const originY = Math.round(textY);

    const baseColor =
      this.color ?? (darkMode ? FONT_COLOR_DARK_MODE : FONT_COLOR_LIGHT_MODE);

    const states: (LetterState | null)[] = [];
    let isAnimating = false;
    for (let i = 0; i < this.text.length; i++) {
      const s = this.letterState(i, now);
      states.push(s);
      if (s !== null) isAnimating = true;
    }

    if (!isAnimating) {
      // Every letter is at rest, so the word draws as a single fillText.
      // That matters for the sheen: its gradient lives in canvas space, and
      // the per-letter path below applies a transform per letter, which would
      // drag the gradient along with each one.
      context.fillStyle = this.sheenFillStyle(
        context,
        textX,
        textY,
        textWidth,
        fontSize,
        baseColor,
        darkMode,
        now,
      );
      context.fillText(this.text, originX, originY);
      context.restore();
      return;
    }

    const baseHsl = hexToHsl(baseColor);
    const outerAlpha = context.globalAlpha;
    const atRest: LetterState = {
      alpha: 1,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      hue: null,
    };

    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i];
      if (char === " ") continue;

      const state = states[i] ?? atRest;
      if (state.alpha <= 0) continue;

      // x comes from measuring the string *prefix* rather than summing
      // per-character advances: that keeps kerning and the exact layout a
      // single fillText would produce. Summing advances drifts and opens gaps.
      const prefixWidth = context.measureText(this.text.slice(0, i)).width;
      const charX = originX + prefixWidth + Math.round(state.offsetX);
      const charY = originY + Math.round(state.offsetY);

      context.save();
      context.globalAlpha = outerAlpha * state.alpha;
      context.fillStyle =
        state.hue !== null ? this.introColor(state.hue, baseHsl) : baseColor;

      if (state.scale === 1) {
        // No transform needed: draw straight at the shared origin so a resting
        // letter is pixel-identical to the whole-string path. Offsets are whole
        // pixels, so a hopping or sliding letter stays on the grid too.
        context.fillText(char, charX, charY);
      } else {
        // Scale about the letter's own centre, on the baseline.
        const charWidth = context.measureText(char).width;
        context.translate(charX + charWidth / 2, charY);
        context.scale(state.scale, state.scale);
        context.fillText(char, -charWidth / 2, 0);
      }
      context.restore();
    }

    context.restore();
  }

  /**
   * The sheen sweep, as a fillStyle. Plays once, starting when the jump
   * finishes, and falls back to the flat colour outside that window.
   */
  private sheenFillStyle(
    context: CanvasRenderingContext2D,
    textX: number,
    textY: number,
    textWidth: number,
    fontSize: number,
    baseColor: string,
    darkMode: boolean,
    now: number,
  ): string | CanvasGradient {
    if (!this.sheen || this.sheenStartTime === null) return baseColor;

    const elapsed = now - this.sheenStartTime;
    if (elapsed < 0 || elapsed > this.sheenDuration) return baseColor;

    const progress = elapsed / this.sheenDuration;
    const bandWidth = 0.15; // half the width of the highlight band
    // Travel from fully off the left edge to fully off the right edge.
    const pos = progress * (1 + bandWidth * 2) - bandWidth;

    const gradient = context.createLinearGradient(
      textX,
      textY - fontSize,
      textX + textWidth,
      textY,
    );
    const highlightColor = darkMode
      ? "rgb(255, 255, 255)"
      : "rgb(100, 100, 100)";

    const left = Math.max(0, Math.min(1, pos - bandWidth));
    const center = Math.max(0, Math.min(1, pos));
    const right = Math.max(0, Math.min(1, pos + bandWidth));

    // When the centre sits on an edge, start/end on the highlight so the band
    // does not pop as it enters or leaves.
    gradient.addColorStop(0, center <= 0 ? highlightColor : baseColor);
    if (left > 0 && left < 1) gradient.addColorStop(left, baseColor);
    if (center > 0 && center < 1) gradient.addColorStop(center, highlightColor);
    if (right > 0 && right < 1) gradient.addColorStop(right, baseColor);
    gradient.addColorStop(1, center >= 1 ? highlightColor : baseColor);

    return gradient;
  }

  /**
   * Updates this.hover from the cursor position. Mouse.draw() reads .hover to
   * decide the cursor style, so setting it here is what gives the text its
   * pointer.
   */
  detectMouseHover(mouseX: number, mouseY: number): boolean {
    const b = this.bounds;
    this.hover =
      this.isVisible &&
      this.canShowText.current &&
      b !== null &&
      mouseX >= b.x &&
      mouseX <= b.x + b.width &&
      mouseY >= b.y &&
      mouseY <= b.y + b.height;
    return this.hover;
  }
}
