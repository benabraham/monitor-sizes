import { useEffect, useState } from 'preact/hooks'

/**
 * Viewport query at which the table replaces the phone cards: the `sm` breakpoint
 * of the design system (600 px, DESIGN: Breakpoints).
 *
 * @type {string}
 */
export const WIDE_QUERY = '(min-width: 600px)'

/**
 * Whether `matchMedia` exists. jsdom and very old engines lack it.
 *
 * @returns {boolean}
 */
const hasMatchMedia = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'

/**
 * Track whether the viewport is at least the `sm` breakpoint. Without
 * `matchMedia` the answer is `true`, so the table (the desktop layout) is shown.
 *
 * @returns {boolean}
 *
 * @example
 * const isWide = useIsWide()
 */
export const useIsWide = () => {
  const [isWide, setIsWide] = useState(() =>
    hasMatchMedia() ? window.matchMedia(WIDE_QUERY).matches : true,
  )

  useEffect(() => {
    if (!hasMatchMedia()) return undefined
    const query = window.matchMedia(WIDE_QUERY)
    /** @param {{ matches: boolean }} event */
    const handleChange = (event) => setIsWide(event.matches)
    setIsWide(query.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return isWide
}
