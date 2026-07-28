import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * 'system' follows the OS; the other two are explicit overrides.
 */
export type MotionPreference = 'system' | 'full' | 'reduced'

interface MotionContextValue {
  preference: MotionPreference
  /** The resolved answer: true when animation should be suppressed. */
  reduced: boolean
  setPreference: (preference: MotionPreference) => void
  toggle: () => void
}

const MotionContext = createContext<MotionContextValue | null>(null)
const STORAGE_KEY = 'remo-motion'
const QUERY = '(prefers-reduced-motion: reduce)'

function initialPreference(): MotionPreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'full' || stored === 'reduced' || stored === 'system') return stored
  } catch {
    /* localStorage unavailable */
  }
  return 'system'
}

/**
 * Whether animation should play.
 *
 * Defaults to the operating system's reduced-motion setting, which is the
 * correct default: for people with vestibular disorders that preference is not
 * advisory. But it is a silent, global switch, and Windows in particular turns
 * it on as part of broader "visual effects" and battery settings that people
 * do not associate with animation at all. The symptom is an application that
 * appears to have no animation anywhere, with nothing on screen to explain why
 * or any way to get it back.
 *
 * So the OS wins by default and an explicit in-app choice wins over the OS.
 * The preference is mirrored onto the document element as `data-motion`, which
 * is what lets the CSS in the base layer honour the same override -- otherwise
 * JavaScript-driven animation would come back while every CSS keyframe stayed
 * suppressed.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<MotionPreference>(initialPreference)
  const [systemReduced, setSystemReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  // Subscribed rather than read once, so changing the OS setting takes effect
  // without a reload.
  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const handler = (event: MediaQueryListEvent) => setSystemReduced(event.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.motion = preference
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* localStorage unavailable */
    }
  }, [preference])

  const reduced =
    preference === 'reduced' ? true : preference === 'full' ? false : systemReduced

  const setPreference = useCallback((next: MotionPreference) => setPreferenceState(next), [])

  // The toggle only ever moves between the two explicit states. Cycling back
  // through 'system' would make the button's effect depend on an OS setting
  // the user cannot see from here.
  const toggle = useCallback(() => {
    setPreferenceState(reduced ? 'full' : 'reduced')
  }, [reduced])

  const value = useMemo(
    () => ({ preference, reduced, setPreference, toggle }),
    [preference, reduced, setPreference, toggle],
  )

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export function useMotion(): MotionContextValue {
  const context = useContext(MotionContext)

  if (!context) {
    throw new Error('useMotion must be used inside a <MotionProvider>.')
  }

  return context
}
