/**
 * Canonical motion primitives and variant presets for CVere.
 *
 * All feature/widget/view code must import from "@/shared/lib/motion" —
 * never directly from "motion/react". This keeps a single swap point and
 * satisfies FSD shared-layer import rules.
 *
 * When adding new animations, reuse the presets below. Do not scatter
 * ad-hoc duration/easing values across the codebase.
 */

export {
  motion,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
  useMotionValue,
  useTransform,
  useSpring,
  useAnimate,
  useInView,
  type Variants,
  type Transition,
  type MotionProps,
} from 'motion/react';

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/** Short ease-out tween (~150ms). Use for opacity / enter-exit. */
export const tweenFast: import('motion/react').Transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.15,
};

/** Soft spring. Use for layout / position / scale changes. */
export const springSoft: import('motion/react').Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// ---------------------------------------------------------------------------
// Variant presets
// ---------------------------------------------------------------------------

/** Simple opacity fade. */
export const fadeIn: import('motion/react').Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tweenFast },
  exit: { opacity: 0, transition: tweenFast },
};

/** Fade + subtle upward slide (~8px). Standard enter/exit for panels and messages. */
export const fadeSlideUp: import('motion/react').Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: tweenFast },
  exit: { opacity: 0, y: 8, transition: tweenFast },
};

/** Fade + subtle scale (0.96 → 1). Use for cards and modals. */
export const scaleIn: import('motion/react').Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: springSoft },
  exit: { opacity: 0, scale: 0.96, transition: tweenFast },
};

/**
 * Stagger container. Wrap a mapped list with this variant on a motion element.
 * Children should use `listItem`.
 */
export const listContainer: import('motion/react').Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      when: 'beforeChildren',
    },
  },
};

/** Stagger child. Pair with `listContainer` on the parent. */
export const listItem: import('motion/react').Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: tweenFast },
  exit: { opacity: 0, y: 6, transition: tweenFast },
};
