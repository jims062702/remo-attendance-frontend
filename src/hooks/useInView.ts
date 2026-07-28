import { useEffect, useRef, useState } from 'react'

interface Options {
  /** Fraction of the element that must be visible before it counts. */
  threshold?: number
  /** Shrinks the viewport so a reveal fires slightly before the edge. */
  rootMargin?: string
  /**
   * Stop observing after the first entry.
   *
   * Off by default: an entrance that plays once is invisible to anyone who
   * scrolls back up, and on a page people move around in that is most of the
   * time. Leaving it live means the section animates whenever it is actually
   * being looked at, which is the point of the animation.
   */
  once?: boolean
}

/**
 * Whether an element has scrolled into view.
 *
 * IntersectionObserver rather than a scroll listener: the callback fires only
 * when the answer actually changes, off the main thread's scroll path, so a
 * page with twenty revealing sections costs nothing per frame. A scroll handler
 * doing twenty getBoundingClientRect() calls is the classic way to make a
 * landing page stutter on exactly the cheap laptops it is trying to impress.
 *
 * Disconnects itself once fired when `once` is set, so a long page is not left
 * holding observers for content the reader has already passed.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -10% 0px',
  once = false,
}: Options = {}) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Without IntersectionObserver the honest fallback is "always visible":
    // content that never reveals is content nobody can read.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, inView }
}
