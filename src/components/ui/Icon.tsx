import type { SVGProps } from 'react'

/**
 * Line icons, drawn as inline SVG.
 *
 * Emoji were a mistake: they render as a different glyph on every platform,
 * cannot inherit colour or stroke weight, and are read aloud by screen readers
 * as their unicode name ("clock face ten oclock") in the middle of a link.
 * These inherit currentColor, stay visually consistent, and are hidden from
 * assistive technology since the adjacent label already carries the meaning.
 */

export type IconName =
  | 'clock'
  | 'clipboard'
  | 'chart'
  | 'dashboard'
  | 'users'
  | 'download'
  | 'database'
  | 'history'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'close'
  | 'check'
  | 'plus'
  | 'trash'
  | 'external'
  | 'desktop'
  | 'logout'
  | 'search'
  | 'motion'
  | 'motionOff'
  | 'shield'
  | 'bolt'
  | 'calendar'
  | 'mapPin'
  | 'lock'
  | 'sparkles'
  | 'code'
  | 'layers'
  | 'arrowRight'
  | 'mail'
  | 'github'
  | 'facebook'
  | 'instagram'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

/** 24×24 paths, 1.6 stroke, round caps — one visual system throughout. */
const PATHS: Record<IconName, string> = {
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  clipboard:
    'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1ZM8 6H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12h6M9 16h4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  users:
    'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  database:
    'M12 8c4.42 0 8-1.34 8-3s-3.58-3-8-3-8 1.34-8 3 3.58 3 8 3ZM4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8m0 0V4m0 4h4m5-1v5l3 2',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M20 6 9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6M10 11v6M14 11v6',
  external: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  desktop: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 20h8M12 16v4',
  // A door with an arrow leaving it -- the conventional sign-out mark. The
  // external-link glyph used here previously means "opens elsewhere", which is
  // a different promise entirely.
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35',
  // A pulse trace: motion, drawn as the thing being animated.
  motion: 'M2 12h4l3-8 4 16 3-8h6',
  // The same trace flattened, with a strike through it.
  motionOff: 'M2 12h20M4 4l16 16',

  // Landing-page vocabulary. Drawn to the same 24x24 / 1.6-stroke system as
  // everything above, so the marketing page and the application cannot drift
  // into looking like two different products.
  shield: 'M12 3 4 6v6c0 4.5 3.2 7.9 8 9 4.8-1.1 8-4.5 8-9V6l-8-3Z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  calendar:
    'M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
  mapPin: 'M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M6 10h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z',
  sparkles:
    'M12 3l1.7 4.6L18.3 9.3l-4.6 1.7L12 15.6l-1.7-4.6L5.7 9.3l4.6-1.7L12 3ZM18 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z',
  code: 'm9 7-5 5 5 5M15 7l5 5-5 5M13.5 4l-3 16',
  layers: 'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  mail: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM3.5 7l8.5 6 8.5-6',
  github:
    'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
  instagram:
    'M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm8.9 1.5a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',

facebook:
    'M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3.5l.5-4H13V9a1 1 0 0 1 1-1Z',
}

export function Icon({ name, size = 18, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      // The visible label beside every icon already carries the meaning, so
      // announcing the icon too would just repeat it.
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
