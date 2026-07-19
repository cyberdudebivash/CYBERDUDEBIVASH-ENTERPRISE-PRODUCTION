// Motion Tokens — Animation + Transitions
//
// Covers both requested categories together since Tailwind treats them
// as one family (animate-* and transition-*) and this app's usage
// interleaves them constantly. Frequencies from src/: animate-pulse
// 34x (status dots), transition-all 61x, transition-colors 37x,
// animate-fade-in 10x. The five custom keyframes (fade-in, slide-up,
// glow-pulse, scan, radar-sweep) are declared once, in
// src/styles/index.css's @theme block — this file only names them for
// discoverability, it does not redefine them.

export const animation = {
  fadeIn: "animate-fade-in",     // entrance for whole sections/views
  slideUp: "animate-slide-up",   // entrance for cards within a section
  pulse: "animate-pulse",        // "live" status dots — the most common animation in the app
  ping: "animate-ping",          // radar-style single-shot ping (paired with a static pulse dot)
  spin: "animate-spin",          // loading indicators
  glowPulse: "animate-glow-pulse",
  scan: "animate-scan",
  radarSweep: "animate-radar",
} as const;

export const transition = {
  all: "transition-all",         // default — used more than every other transition combined
  colors: "transition-colors",
  transform: "transition-transform",
  opacity: "transition-opacity",
} as const;

export const duration = {
  fast: "duration-300",
  slow: "duration-700",
  slowest: "duration-1000",
} as const;
