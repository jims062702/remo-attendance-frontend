import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/utils/format'
import { Icon } from '@/components/ui/Icon'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SpotlightPortraitProps {
  /** The illustrated layer, always visible. */
  art: string
  /** The photograph, revealed only under the pointer. */
  photo: string
  alt: string
  /** Radius of the revealed circle, in pixels. */
  radius?: number
  className?: string
}

/**
 * A portrait that reveals the real photograph under the cursor.
 *
 * The illustration sits underneath and the photograph on top, masked to a soft
 * circle that tracks the pointer. Moving across the image wipes a hole through
 * to the person rather than cross-fading the whole picture — the reveal is
 * local, so what you get is a torch being moved over a surface.
 *
 * The pointer position is written straight to CSS custom properties on the
 * node instead of through React state. At pointer-event frequency a setState
 * per move would re-render this subtree ~120 times a second to change two
 * numbers; writing the properties lets the compositor repaint one masked layer
 * and never involves React at all.
 */
export function SpotlightPortrait({
  art,
  photo,
  alt,
  radius = 150,
  className,
}: SpotlightPortraitProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)
  const reducedMotion = useReducedMotion()

  /*
   * A failed layer is dropped rather than swapped for a placeholder file.
   *
   * Pointing at a stand-in only moves the problem: the placeholder is itself a
   * file that can be deleted, and then the fallback 404s too. Hiding the photo
   * layer degrades to the illustration on its own — which is a portrait that
   * simply has no reveal, not a broken one.
   *
   * Worth guarding because the failure is invisible in dev: Vite answers a
   * missing public file with index.html at status 200, so a wrong extension
   * resolves to HTML the browser cannot decode rather than a clean 404.
   */
  const [artFailed, setArtFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)

  // Only for the hint overlay, which changes once per enter/leave rather than
  // once per frame — cheap enough to be state.
  const [active, setActive] = useState(false)

  const move = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = layerRef.current
    if (!stage) return

    const rect = stage.getBoundingClientRect()
    stage.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
    stage.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
  }, [])

  const open = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      move(event)
      layerRef.current?.style.setProperty('--spot-r', `${radius}px`)
      setActive(true)
    },
    [move, radius],
  )

  const close = useCallback(() => {
    // Collapsing the radius closes the hole; fading the layer would dissolve
    // the whole photograph instead, which reads as a crossfade rather than a
    // light going out.
    layerRef.current?.style.setProperty('--spot-r', '0px')
    setActive(false)
  }, [])

  return (
    <div
      ref={layerRef}
      className={cn(
        // Square, matching the artwork. A 5:6 frame would crop the sides off
        // a square illustration and take the scene with it.
        'spotlight-stage group relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-sunken shadow-raised',
        className,
      )}
      // Pointer events rather than mouse events, so a finger dragged across
      // the picture reveals it too instead of the whole effect being
      // desktop-only.
      onPointerMove={move}
      onPointerEnter={open}
      onPointerDown={open}
      onPointerLeave={close}
      onPointerCancel={close}
    >
      {!artFailed && (
        <img
          src={art}
          alt={alt}
          onError={() => setArtFailed(true)}
          // The illustration is the largest element on the section and the one
          // the reader waits on, so it is fetched eagerly and decoded off the
          // main thread rather than blocking paint.
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}

      {!photoFailed && (
        <div className="spotlight-photo absolute inset-0">
          <img
            src={photo}
            // Empty alt: the illustration underneath already carries the
            // description, and announcing the same portrait twice is noise.
            alt=""
            onError={() => setPhotoFailed(true)}
            decoding="async"
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* A soft rim on the revealed circle.
          Without it the photograph appears through a hole with a hard-ish
          edge and reads as a cut-out; a faint light ring at the boundary makes
          the same mask read as a lens being moved over the picture. Shares the
          pointer variables, so it tracks for free. */}
      {!photoFailed && (
        <div
          className={cn(
            'spotlight-ring pointer-events-none absolute inset-0 transition-opacity duration-300',
            active ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden="true"
        />
      )}

      {/* The effect is invisible until someone happens to hover, so it is
          advertised. Fades out once they have found it. */}
      {!photoFailed && (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-4',
            'bg-gradient-to-t from-black/70 to-transparent text-[13px] font-semibold text-white',
            'transition-opacity duration-300',
            active ? 'opacity-0' : 'opacity-100',
          )}
        >
          <Icon name="sparkles" size={15} />
          {reducedMotion ? 'Move over the portrait to reveal' : 'Hover to reveal'}
        </div>
      )}
    </div>
  )
}
