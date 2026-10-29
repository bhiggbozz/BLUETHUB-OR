import type { Transition, Variants } from "framer-motion";

/** Shared motion language for the parent portal: short, eased, transform + opacity only. */

export const ease = [0.22, 1, 0.36, 1] as const;

export const quick: Transition = { duration: 0.18, ease };
export const smooth: Transition = { duration: 0.32, ease };
export const springy: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: smooth },
};

export const stagger = (step = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.26, ease } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.14, ease } },
};
