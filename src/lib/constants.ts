// Animation + timing
export const ANIMATION_TIME_BUFFER = 30; // Used to time the animation cadence of Player sprite
export const FPS_TARGET = 60;
export const FRAME_DURATION = 1000 / FPS_TARGET; // ~16.67ms per frame (60fps)

// Physics
export const JUMP_HEIGHT = 20;
export const GRAVITY = 1.5;

/** Per-frame horizontal acceleration applied while a walk input is held. */
export const WALK_ACCELERATION = 0.5;
/**
 * How long a nav-driven auto-walk takes, regardless of distance - 0.5s at 60fps, the
 * same duration the nav underline used to CSS-transition for.
 *
 * Fixed duration rather than a fixed speed because the underline is paced by the
 * character (see Nav.tsx), so the walk sets the tempo of both, and the bar keeps the
 * same timing whatever the distance.
 *
 * The trade is that speed scales with distance: a 744px hop averages 25px/frame while a
 * 6000px one averages 200px/frame and, since easeInOutCubic peaks at 3x its average,
 * tops out near 500px/frame. That is deliberate - the long hops read as a blur. It also
 * means widening the floor makes them faster still, so if a hop ever has to cover an
 * order of magnitude more ground, scale this with distance rather than raising it flat.
 */
export const AUTO_WALK_DURATION_FRAMES = 30;

// Fonts
export const FONT_HEADING = {
  H1: 100,
  H2: 48,
  P: 38,
};

export const FONT_COLOR_LIGHT_MODE = "#111111";
export const FONT_BG_LIGHT_MODE = "#F9FAFB";
export const FONT_COLOR_DARK_MODE = "#d4d4d4";
export const FONT_BG_DARK_MODE = "#191919";

/**
 * Dark Mode Color Palette
Background: #191919
Surface:    #020617
Text:       #d4d4d4
Secondary:  #9CA3AF
 */

/**
 * Light Mode Color Palette
Background: #F9FAFB
Surface:    #FFFFFF
Text:       #111111
Secondary:  #4B5563
 */

// border colors for text bubble
export const BORDER_COLORS_TOP_BOTTOM_LIGHT = ["#000000", "#98A4CA", "#A9ACCB", "#C9D7F2", "#ECEFF8"];
export const BORDER_COLORS_LEFT_RIGHT_LIGHT = ["#000000", "#AFB5CF", "#CCD5E7", "#ECEFF8"];
export const BORDER_COLORS_TOP_BOTTOM_DARK = ["#ececec", "#aeb1b7", "#474e57", "#464646", "#3f3f3f"];
export const BORDER_COLORS_LEFT_RIGHT_DARK = ["#ececec", "#aeb1b7", "#474e57", "#464646"];

// Text layout
export const TextLeading = 10;
export const ElementPadding = 10;
