import type { Transition, Variants } from "framer-motion";

/* ------------------------------------------------------------------ *
 * Springs: Tuned for Linear/Raycast feel, settling in ~250ms.
 * ------------------------------------------------------------------ */
export const spring = {
  panel: { type: "spring", stiffness: 380, damping: 38, mass: 0.9 },
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
  pop: { type: "spring", stiffness: 600, damping: 32 },
} satisfies Record<string, Transition>;

/* ------------------------------------------------------------------ *
 * Collapsible Job Configurator Drawer (280px <-> 0px)
 * Animate width; inner container maintains fixed 280px width so child
 * elements smoothly slide/fade without disruptive reflow.
 * ------------------------------------------------------------------ */
export const DRAWER_WIDTH = 280;

export const drawerVariants: Variants = {
  open: {
    width: DRAWER_WIDTH,
    visibility: "visible",
    transition: spring.panel,
  },
  closed: {
    width: 0,
    transition: spring.panel,
    transitionEnd: { visibility: "hidden" },
  },
};

export const drawerContentVariants: Variants = {
  open: {
    opacity: 1,
    x: 0,
    transition: { delay: 0.05, duration: 0.18, ease: "easeOut" },
  },
  closed: {
    opacity: 0,
    x: -14,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

/* ------------------------------------------------------------------ *
 * Bottom Results Panel: Collapsed bar (36px) <-> Expanded height (200px)
 * ------------------------------------------------------------------ */
export const BOTTOM_BAR_HEIGHT = 36;
export const BOTTOM_EXPANDED_HEIGHT = 200;

export const bottomPanelTransition = (isDragging: boolean): Transition =>
  isDragging ? { duration: 0 } : spring.panel;

/* ------------------------------------------------------------------ *
 * Gantt Chart Blocks: Staggered entrance rise capped at 350ms so
 * large traces render instantly and fluidly.
 * ------------------------------------------------------------------ */
export const segmentVariants: Variants = {
  hidden: { opacity: 0, scaleY: 0.65 },
  visible: (i: number) => ({
    opacity: 1,
    scaleY: 1,
    transition: { ...spring.snappy, delay: Math.min(i * 0.015, 0.35) },
  }),
};

/* ------------------------------------------------------------------ *
 * Playback Fill + Playhead:
 * - When playing live at 60fps, duration is 0 for exact clock synchronization.
 * - When scrubbing or stepping manually, smoothly spring into place.
 * ------------------------------------------------------------------ */
export const playbackTransition = (isPlaying: boolean): Transition =>
  isPlaying ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 40 };

/* Sliding layout pill behind active speed selector (0.5x, 1x, 2x, 5x) */
export const speedPillTransition: Transition = spring.snappy;

/* Floating Gantt Segment Tooltip */
export const tooltipVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.12, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.08 } },
};

/* Command Palette (Cmd + K) Backdrop & Modal */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, y: -12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring.pop },
  exit: { opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.1 } },
};

/* Floating Action Menus & Popovers */
export const menuVariants: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.12, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.08 } },
};
