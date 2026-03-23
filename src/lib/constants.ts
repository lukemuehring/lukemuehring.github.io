// Animation + timing
export const ANIMATION_TIME_BUFFER = 30; // Used to time the animation cadence of Player sprite
export const FPS_TARGET = 60;
export const FRAME_DURATION = 1000 / FPS_TARGET; // ~16.67ms per frame (60fps)

// Physics
export const JUMP_HEIGHT = 20;
export const GRAVITY = 1.5;

// Fonts
export const FONT_HEADING = {
  H1: 100,
  H2: 48,
  P: 38,
};

export const FONT_COLOR_LIGHT_MODE = "#111111";
export const FONT_BG_LIGHT_MODE = "#F9FAFB";
export const FONT_COLOR_DARK_MODE = "#ececec";
export const FONT_BG_DARK_MODE = "#323232";

/**
 * Dark Mode Color Palette
Background: #323232
Surface:    #020617
Text:       #ececec
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
