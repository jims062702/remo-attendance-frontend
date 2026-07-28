import { cn } from '@/utils/format'

interface LogoProps {
  /** Tailwind height class. The width follows the artwork's 4.51:1 aspect. */
  className?: string
  /**
   * Announced to assistive technology. Empty when a visible name sits beside
   * it, so the same words are not read twice.
   */
  alt?: string
}

/**
 * The product mark.
 *
 * One component so the logo appears identically in the sidebar, on the landing
 * page and on the sign-in screen — and so replacing the artwork is one file
 * swap rather than a hunt through four call sites.
 *
 * Two variants are shipped rather than one filtered image. The wordmark is
 * near-black on transparent, which disappears against this application's dark
 * theme — its default, since the shift runs overnight. The usual fix,
 * `invert(1) hue-rotate(180deg)`, is a matrix approximation that drags the
 * green mark off its brand hue; the dark file instead has only its achromatic
 * pixels re-lit, so the type flips to white and the mark stays exactly the
 * green it was drawn in.
 *
 * Both are swapped by CSS on the theme attribute rather than by reading theme
 * state in JavaScript, so the correct one is chosen before first paint and the
 * logo never flashes the wrong variant on load.
 */
export function Logo({ className, alt = 'Remotasks GY Shift' }: LogoProps) {
  return (
    <picture className={cn('block shrink-0', className)}>
      <img
        src="/logo-mark.png"
        alt={alt}
        // Trimmed to the artwork's own bounds, so the height class is the
        // height of the mark rather than of a mostly-empty canvas.
        width={469}
        height={104}
        decoding="async"
        className="app-logo h-full w-auto object-contain"
        draggable={false}
      />
    </picture>
  )
}
