import { useMotion } from './useMotion'

/**
 * Whether the user has asked for reduced motion.
 *
 * The CSS in the base layer already neutralises transitions and keyframes, but
 * animation driven from JavaScript -- a counting number, a chart's draw-in --
 * is invisible to that rule and has to opt out itself.
 *
 * Resolution lives in MotionProvider: the OS preference is the default, and an
 * explicit in-app choice overrides it. This stays as a thin alias because it is
 * consumed by a dozen components that only ever need the boolean.
 */
export function useReducedMotion(): boolean {
  return useMotion().reduced
}
