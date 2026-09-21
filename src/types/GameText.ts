import { FONT_COLOR_DARK_MODE, FONT_COLOR_LIGHT_MODE } from "../lib/constants";
import { getCanvasFontString } from "../lib/helpers";
import {
  CELLS_PER_EM,
  advanceOf,
  glyphFor,
  hasDotsFor,
  hash2,
} from "../lib/handjetDots";

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

/**
 * Much harder deceleration than easeOutCubic: roughly three quarters of the
 * distance is covered in the first fifth of the time. Used for the blast,
 * where the dots should leave like they were hit and then drift to a stop.
 */
const easeOutExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two hex colours. Falls back to the base if either will not parse. */
function mixHex(base: string, highlight: string, t: number): string {
  const a = hexToRgb(base);
  const b = hexToRgb(highlight);
  if (!a || !b) return base;
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
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

  // --- dots ---
  dots: boolean;
  dotScale: number;
  explodeStrength: number;
  explodeRadius: number;
  explodeDuration: number;
  recoverDelay: number;
  recoverDuration: number;
  rumbleDuration: number;
  rumbleAmplitude: number;
  rumbleStep: number;
  /** when the pre-recovery judder started */
  rumbleStartTime: number | null;
  /** when the word was last clicked, for the idle return */
  lastBlastTime: number | null;
  /** the in-flight return home, and the displacement it started from */
  recoverStartTime: number | null;
  recoverFrom: number[] | null;
  /** when the current blast went off, and where, in screen coords */
  explodeStartTime: number | null;
  explodeX: number;
  explodeY: number;
  /**
   * Where every dot has been blown to and left, 2 entries per dot. Dots do not
   * return home, so this is the accumulated result of every blast so far and a
   * new blast is applied on top of it.
   */
  dotOffsets: number[];
  /** the in-flight blast's per-dot delta, folded into dotOffsets when it lands */
  blastImpulse: number[] | null;
  /** index of each letter's first dot within dotOffsets */
  dotIndexBase: number[] | null;
  totalDots: number;

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

      // --- dots: draw each glyph from Handjet's own element lattice ---

      /**
       * draw the word dot by dot instead of with fillText, which makes every
       * element of every glyph individually addressable.
       */
      dots?: boolean;

      /** dot size as a fraction of one grid cell. 1 fills the cell exactly */
      dotScale?: number;

      /** px a dot at the blast centre is thrown. 0 disables the explosion */
      explodeStrength?: number;

      /**
       * px at which the blast has half its strength. Dots further from the
       * click are thrown progressively less.
       */
      explodeRadius?: number;

      /** ms the blast takes to throw every dot to its new resting place */
      explodeDuration?: number;

      /**
       * ms of no clicking before the scattered dots travel back to their
       * original positions, which is also what re-fires the sheen.
       */
      recoverDelay?: number;

      /** ms the dots take to travel home once recovery starts */
      recoverDuration?: number;

      /** ms the dots judder in place before they are pulled home */
      rumbleDuration?: number;

      /** px a dot shakes at the peak of the rumble */
      rumbleAmplitude?: number;

      /**
       * ms each judder position is held. Small values blur into a buzz, large
       * ones read as a stutter; this is what makes it a rumble and not a wobble.
       */
      rumbleStep?: number;

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

    // Only take the dot path if every character has a lattice; otherwise a
    // single missing glyph would silently vanish from the word.
    this.dots = (options?.dots ?? false) && hasDotsFor(text);
    this.dotScale = options?.dotScale ?? 1;
    this.explodeStrength = options?.explodeStrength ?? 80;
    this.explodeRadius = options?.explodeRadius ?? 120;
    this.explodeDuration = options?.explodeDuration ?? 700;
    this.recoverDelay = options?.recoverDelay ?? 3000;
    this.recoverDuration = options?.recoverDuration ?? 700;
    this.rumbleDuration = options?.rumbleDuration ?? 900;
    this.rumbleAmplitude = options?.rumbleAmplitude ?? 3;
    this.rumbleStep = options?.rumbleStep ?? 45;
    this.rumbleStartTime = null;
    this.lastBlastTime = null;
    this.recoverStartTime = null;
    this.recoverFrom = null;
    this.explodeStartTime = null;
    this.explodeX = 0;
    this.explodeY = 0;
    this.dotOffsets = [];
    this.blastImpulse = null;
    this.dotIndexBase = null;
    this.totalDots = 0;

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

  /**
   * Blow the dots apart from a point, in screen coords. This is what a click
   * does; it deliberately does not hop, so the two effects stay independent
   * and either can be triggered on its own.
   *
   * Re-triggering simply restarts the blast, which is why repeated clicks feel
   * responsive rather than queueing up behind each other.
   */
  explode(origin: { x: number; y: number }, now = Date.now()) {
    if (this.explodeStrength <= 0) return;

    // Freeze whatever is still in flight into the dots' resting positions, so
    // this blast pushes on from where they actually are. A return home is
    // abandoned mid-way for the same reason: dotOffsets already holds the
    // partly-returned positions, so the new blast carries on from those.
    this.settleBlast(now);
    this.recoverStartTime = null;
    this.recoverFrom = null;
    // Clicking during the judder cancels it outright: the dots have only been
    // shaking around their stored positions, never written to them, so this
    // blast starts from exactly where they already are.
    this.rumbleStartTime = null;

    this.explodeStartTime = now;
    this.explodeX = origin.x;
    this.explodeY = origin.y;
    this.lastBlastTime = now;

    // No sheen on a word that is in pieces. It is re-armed by the idle
    // snap-back in recoverIfIdle(), not scheduled here.
    this.sheenStartTime = null;
  }

  /**
   * After recoverDelay with no clicks, start the dots juddering in place. This
   * is the tell that the word is about to pull itself together, and the window
   * in which a click cancels the whole thing.
   */
  private startRumbleIfIdle(now: number) {
    if (this.lastBlastTime === null) return;
    if (this.rumbleStartTime !== null || this.recoverStartTime !== null) return;
    // Wait for the blast itself to finish before starting the idle count.
    if (this.explodeStartTime !== null) return;
    if (now - this.lastBlastTime < this.recoverDelay) return;

    this.rumbleStartTime = now;
    this.lastBlastTime = null;
  }

  /**
   * Once the judder has run its course with no click, send the dots home. The
   * sheen is scheduled for the moment they arrive, so it sweeps the restored
   * word rather than one still reassembling.
   */
  private startRecoveryAfterRumble(now: number) {
    if (this.rumbleStartTime === null) return;
    if (now - this.rumbleStartTime < this.rumbleDuration) return;

    this.rumbleStartTime = null;
    this.recoverFrom = this.dotOffsets.slice();
    this.recoverStartTime = now;
    this.sheenStartTime = now + this.recoverDuration;
  }

  /**
   * Judder progress, 0..1, or null when not rumbling.
   *
   * Applied at draw time and never written into dotOffsets: baking a random
   * shake into the stored positions would let the word drift a little further
   * from home on every frame.
   */
  private rumbleProgress(now: number): number | null {
    if (this.rumbleStartTime === null) return null;
    const p = (now - this.rumbleStartTime) / this.rumbleDuration;
    return p < 0 || p > 1 ? null : p;
  }

  /**
   * Ease every dot from where the blast left it back to its home cell.
   *
   * This writes straight into dotOffsets, so the draw loop needs no knowledge
   * of the return -- and if a click interrupts it, whatever is in dotOffsets at
   * that instant is already the correct starting point for the next blast.
   */
  private applyRecovery(now: number) {
    if (this.recoverStartTime === null || this.recoverFrom === null) return;

    const p = (now - this.recoverStartTime) / this.recoverDuration;
    if (p >= 1) {
      this.dotOffsets.fill(0);
      this.recoverStartTime = null;
      this.recoverFrom = null;
      return;
    }

    // Decelerating into place reads as the word pulling itself together.
    const remaining = 1 - easeOutCubic(Math.max(0, p));
    for (let k = 0; k < this.dotOffsets.length; k++) {
      this.dotOffsets[k] = this.recoverFrom[k] * remaining;
    }
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

    if (this.dots) {
      this.drawDots(
        context,
        originX,
        originY,
        fontSize,
        baseColor,
        darkMode,
        now,
      );
      context.restore();
      return;
    }

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
   * Draw the word from Handjet's element lattice, one fillRect per dot.
   *
   * Letter-level state still applies -- the intro, hop and bounce move whole
   * letters exactly as they do in the fillText path -- and the dot layer adds
   * a per-dot scatter on top, so the two compose rather than replace one
   * another.
   *
   * The sheen survives this path: its gradient lives in canvas space, so one
   * fillStyle spans every rect correctly.
   */
  private drawDots(
    context: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    fontSize: number,
    baseColor: string,
    darkMode: boolean,
    now: number,
  ) {
    this.ensureDotIndex();
    this.startRumbleIfIdle(now);
    this.startRecoveryAfterRumble(now);
    this.applyRecovery(now);

    const cellPx = fontSize / CELLS_PER_EM;
    const dotPx = Math.max(1, Math.round(cellPx * this.dotScale));
    const baseHsl = hexToHsl(baseColor);
    const outerAlpha = context.globalAlpha;
    const highlight = darkMode ? "#ffffff" : "#646464";
    const wordCells = advanceOf(this.text);

    const rumble = this.rumbleProgress(now);
    // One tick index for the whole word, so every dot re-rolls its shake on
    // the same beat. Holding each position for rumbleStep ms is what makes it
    // judder rather than smear.
    const rumbleTick =
      rumble === null
        ? 0
        : Math.floor((now - this.rumbleStartTime!) / this.rumbleStep);

    const travel = this.blastTravel(now);
    // The impulse needs each dot's screen position, which only exists inside
    // the draw loop, so it is computed on the blast's first frame and reused.
    const computeImpulse = travel !== null && this.blastImpulse === null;
    if (computeImpulse) this.blastImpulse = new Array(this.totalDots * 2).fill(0);
    const impulse = this.blastImpulse;

    // Hit box is accumulated from the dots as they are drawn, so blown-apart
    // pixels stay clickable instead of the box staying at the resting word.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    let penCells = 0;
    for (let i = 0; i < this.text.length; i++) {
      const glyph = glyphFor(this.text[i]);
      if (!glyph) continue;

      const state = this.letterState(i, now);
      const alpha = state?.alpha ?? 1;
      const scale = state?.scale ?? 1;
      const hue = state?.hue ?? null;

      if (alpha > 0 && glyph.dots.length > 0) {
        const letterWidthPx = glyph.advance * cellPx;
        const centerX = originX + penCells * cellPx + letterWidthPx / 2;
        const translateX = centerX + (state?.offsetX ?? 0);
        const translateY = originY + (state?.offsetY ?? 0);

        // Where this letter sits along the word, 0..1, for the sheen sweep.
        const fraction =
          wordCells > 0 ? (penCells + glyph.advance / 2) / wordCells : 0;
        const sheen = this.sheenAmountAt(fraction, now);

        context.save();
        context.globalAlpha = outerAlpha * alpha;
        context.fillStyle =
          hue !== null
            ? this.introColor(hue, baseHsl)
            : sheen > 0
              ? mixHex(baseColor, highlight, sheen)
              : baseColor;

        // Scale about the letter's centre so a dot-drawn letter grows the same
        // way a fillText one does.
        context.translate(translateX, translateY);
        if (scale !== 1) context.scale(scale, scale);

        const base = this.dotIndexBase![i];

        for (let d = 0; d < glyph.dots.length; d++) {
          const [col, row] = glyph.dots[d];

          // Cell coordinates are y-up from the baseline, and a dot's stored
          // position is the bottom-left of its cell, so its top edge on screen
          // is one whole cell higher.
          const homeX = -letterWidthPx / 2 + col * cellPx;
          const homeY = -(row + 1) * cellPx;

          const k = (base + d) * 2;
          let x = homeX + this.dotOffsets[k];
          let y = homeY + this.dotOffsets[k + 1];

          if (impulse !== null) {
            if (computeImpulse) {
              // Screen space, because the click that caused the blast is in
              // screen space.
              const kick = this.blastImpulseFor(
                translateX + x * scale,
                translateY + y * scale,
                i,
                d,
              );
              impulse[k] = kick.x;
              impulse[k + 1] = kick.y;
            }
            // Dividing by scale converts the screen-space kick back into this
            // letter's scaled local space, so the dot moves by the intended
            // number of *screen* pixels either way.
            x += (impulse[k] * (travel ?? 0)) / scale;
            y += (impulse[k + 1] * (travel ?? 0)) / scale;
          }

          if (rumble !== null) {
            // Amplitude builds towards the snap, so the shake reads as tension
            // rather than a constant buzz.
            const amp = this.rumbleAmplitude * (0.25 + 0.75 * rumble);
            const angle = hash2(base + d, rumbleTick) * Math.PI * 2;
            x += (Math.cos(angle) * amp) / scale;
            y += (Math.sin(angle) * amp) / scale;
          }

          context.fillRect(Math.round(x), Math.round(y), dotPx, dotPx);

          // Back out to screen space for the hit box: the context is
          // translated (and possibly scaled) around this letter right now.
          const screenX = translateX + x * scale;
          const screenY = translateY + y * scale;
          const size = dotPx * scale;
          if (screenX < minX) minX = screenX;
          if (screenY < minY) minY = screenY;
          if (screenX + size > maxX) maxX = screenX + size;
          if (screenY + size > maxY) maxY = screenY + size;
        }

        context.restore();
      }

      penCells += glyph.advance;
    }

    if (minX < maxX) {
      this.bounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    // Once the blast has landed, bake it in. Dots stay where they were blown,
    // and the next click pushes them on from there rather than from home.
    if (travel === 1) this.settleBlast(now);
  }

  /** Lazily index every dot in the string so displacement can persist per dot. */
  private ensureDotIndex() {
    if (this.dotIndexBase !== null) return;

    const base: number[] = [];
    let n = 0;
    for (let i = 0; i < this.text.length; i++) {
      base.push(n);
      n += glyphFor(this.text[i])?.dots.length ?? 0;
    }
    this.dotIndexBase = base;
    this.totalDots = n;
    this.dotOffsets = new Array(n * 2).fill(0);
  }

  /**
   * Bake however far the current blast has travelled into dotOffsets and clear
   * it, leaving every dot exactly where it is on screen right now.
   *
   * This is what makes a second click *add* to the first. Without it, starting
   * a new blast while one is still in flight resets travel to 0 while the old
   * impulse is still loaded, so the dots snap back to where the previous blast
   * began and fly out along its vectors again instead of the new click's.
   */
  private settleBlast(now: number) {
    const travel = this.blastTravel(now);
    if (travel === null || this.blastImpulse === null) return;

    for (let k = 0; k < this.blastImpulse.length; k++) {
      this.dotOffsets[k] += this.blastImpulse[k] * travel;
    }
    this.blastImpulse = null;
    this.explodeStartTime = null;
  }

  /**
   * How far through the current blast, 0..1. Stays at 1 once it has landed:
   * dots are blown apart and left there, so the displacement holds rather than
   * easing back.
   */
  private blastTravel(now: number): number | null {
    if (this.explodeStartTime === null) return null;
    const p = (now - this.explodeStartTime) / this.explodeDuration;
    return p <= 0 ? 0 : p >= 1 ? 1 : easeOutExpo(p);
  }

  /**
   * How far one dot is thrown by a blast, in screen px, before easing.
   *
   * Direction is straight out from the click, so the word bursts away from
   * wherever it was hit. Strength falls off with distance, which is what makes
   * the click feel located: dots under the cursor are thrown hard, the far end
   * of the word barely stirs.
   */
  private blastImpulseFor(
    dotScreenX: number,
    dotScreenY: number,
    seedA: number,
    seedB: number,
  ): { x: number; y: number } {
    let dx = dotScreenX - this.explodeX;
    let dy = dotScreenY - this.explodeY;
    let dist = Math.hypot(dx, dy);

    // A dot sitting exactly under the cursor has no outward direction, so give
    // it a stable arbitrary one rather than dividing by zero.
    if (dist < 0.001) {
      const angle = hash2(seedA, seedB) * Math.PI * 2;
      dx = Math.cos(angle);
      dy = Math.sin(angle);
      dist = 1;
    }

    // Smooth inverse falloff: full strength at the centre, half at
    // explodeRadius, never abruptly zero at an edge.
    const falloff = this.explodeRadius / (this.explodeRadius + dist);
    const magnitude = this.explodeStrength * falloff;
    return { x: (dx / dist) * magnitude, y: (dy / dist) * magnitude };
  }

  /**
   * Highlight strength, 0..1, for something at `fraction` along the word.
   *
   * The fillText path can use a canvas-space gradient, but the dot path
   * translates per letter before filling, which drags a gradient along with
   * each letter instead of leaving it spanning the word. Evaluating the band
   * per letter sidesteps the transform entirely and is what makes the sweep
   * travel letter by letter.
   */
  private sheenAmountAt(fraction: number, now: number): number {
    if (!this.sheen || this.sheenStartTime === null) return 0;

    const elapsed = now - this.sheenStartTime;
    if (elapsed < 0 || elapsed > this.sheenDuration) return 0;

    const bandWidth = 0.15; // half the width of the highlight band
    // Travel from fully off the left edge to fully off the right edge.
    const pos = (elapsed / this.sheenDuration) * (1 + bandWidth * 2) - bandWidth;

    const d = Math.abs(fraction - pos);
    return d >= bandWidth ? 0 : 1 - d / bandWidth;
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
