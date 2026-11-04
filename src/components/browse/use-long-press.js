import { useCallback, useEffect, useRef } from 'preact/hooks'

/** Hold time that makes a press a long press, in milliseconds. */
export const LONG_PRESS_DELAY_MS = 500

/** Movement, in CSS pixels, that turns a press into a drag or a scroll. */
export const LONG_PRESS_TOLERANCE_PX = 10

/** The scroll listener is attached while a press is held, and during the capture phase. */
const SCROLL_LISTENER_OPTIONS = Object.freeze({ capture: true, passive: true })

/**
 * Long press for one element, such as a Browse card or a table row (PRD: "Long-press or a
 * checkbox adds a display to compare").
 *
 * A press counts when a finger or a pen stays down for `delay` milliseconds without moving
 * more than `tolerance` pixels. A mouse does not start one: a held mouse button is not a
 * long press, and the checkbox is the mouse's way to compare. The press ends early on
 * pointer up or cancel, when the pointer leaves the element, on a scroll anywhere on the
 * page, on a move beyond the tolerance, and when text selection starts.
 *
 * The click that the release produces is swallowed, so a long press on a button inside the
 * element does not also press it. A normal tap is not touched. The context menu is
 * prevented while a press is held or has fired, because on touch screens a held press is
 * how the browser asks for it.
 *
 * Spread the returned handlers on the element. The hook keeps no DOM of its own.
 *
 * @param {object} options
 * @param {() => void} [options.onLongPress] Called once per long press.
 * @param {number} [options.delay=500] Hold time in milliseconds.
 * @param {number} [options.tolerance=10] Movement in pixels that cancels the press.
 * @returns {{
 *   onPointerDown: (event: PointerEvent) => void,
 *   onPointerMove: (event: PointerEvent) => void,
 *   onPointerUp: () => void,
 *   onPointerCancel: () => void,
 *   onPointerLeave: () => void,
 *   onSelectStart: () => void,
 *   onContextMenu: (event: Event) => void,
 *   onClickCapture: (event: Event) => void,
 * }}
 *
 * @example
 * const longPress = useLongPress({ onLongPress: () => toggleCompare(id) })
 * return <li {...longPress}>…</li>
 */
export const useLongPress = ({
  onLongPress,
  delay = LONG_PRESS_DELAY_MS,
  tolerance = LONG_PRESS_TOLERANCE_PX,
} = {}) => {
  // The latest options are read at event time, so the handlers below can stay stable.
  const options = useRef({ onLongPress, delay, tolerance })
  options.current = { onLongPress, delay, tolerance }

  /** The press being held: where it started, and its timer. Null when nothing is held. */
  const press = useRef(null)
  /** The last press fired, so the click it leads to is swallowed. */
  const hasFired = useRef(false)

  /** Ends the press: clears the timer and stops listening for scrolls. */
  const stop = useCallback(() => {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
    globalThis.removeEventListener('scroll', stop, SCROLL_LISTENER_OPTIONS)
  }, [])

  /** The hold time has passed: the press is a long press. */
  const fire = useCallback(() => {
    press.current = null
    hasFired.current = true
    globalThis.removeEventListener('scroll', stop, SCROLL_LISTENER_OPTIONS)
    options.current.onLongPress?.()
  }, [stop])

  /**
   * A press starts. Mice, secondary pointers and buttons other than the main one are
   * ignored, but they still reset the previous press.
   *
   * @param {PointerEvent} event
   */
  const handlePointerDown = useCallback(
    (event) => {
      stop()
      hasFired.current = false
      if (event.button > 0) return
      if (event.pointerType === 'mouse' || event.isPrimary === false) return
      const timer = setTimeout(fire, options.current.delay)
      press.current = { x: event.clientX, y: event.clientY, timer }
      globalThis.addEventListener('scroll', stop, SCROLL_LISTENER_OPTIONS)
    },
    [fire, stop],
  )

  /**
   * A finger that drifts further than the tolerance has become a drag, not a press.
   *
   * @param {PointerEvent} event
   */
  const handlePointerMove = useCallback(
    (event) => {
      if (!press.current) return
      const distance = Math.hypot(
        event.clientX - press.current.x,
        event.clientY - press.current.y,
      )
      if (distance > options.current.tolerance) stop()
    },
    [stop],
  )

  /**
   * The context menu is prevented while a press is held, and after one has fired. The
   * browser's own long press opens it, and the long press has taken that gesture.
   *
   * @param {Event} event
   */
  const handleContextMenu = useCallback((event) => {
    if (press.current || hasFired.current) event.preventDefault()
  }, [])

  /**
   * The click after a long press is swallowed in the capture phase, so it reaches neither
   * the button inside nor a checkbox label. It is swallowed once; the next press clears it.
   *
   * @param {Event} event
   */
  const handleClickCapture = useCallback((event) => {
    if (!hasFired.current) return
    hasFired.current = false
    event.preventDefault()
    event.stopPropagation()
  }, [])

  // A press still held when the element unmounts must not fire later.
  useEffect(() => stop, [stop])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
    onSelectStart: stop,
    onContextMenu: handleContextMenu,
    onClickCapture: handleClickCapture,
  }
}
