import { useEffect, useRef, useState } from 'preact/hooks'
import { Button } from '../ui/button/button.jsx'
import './help-popover.css'

/** Below this width the panel is a bottom sheet (matches `--bp-sm`). */
const NARROW_BREAKPOINT = 600

/** Minimum distance, px, between the panel and the viewport edges. */
const VIEWPORT_MARGIN = 8

/** Gap, px, between the trigger and the panel. */
const TRIGGER_GAP = 6

/**
 * Whether the browser implements the Popover API (absent in jsdom and very old engines).
 *
 * @returns {boolean}
 */
const hasPopoverApi = () =>
  typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype

/**
 * Place the panel next to its trigger, without CSS anchor positioning (not in
 * Baseline 2024). The panel goes below the trigger, or above when there is no room,
 * and is clamped into the viewport. Below the narrow breakpoint the CSS bottom sheet
 * applies, so the inline offsets are cleared.
 *
 * @param {object} params
 * @param {HTMLElement | null} params.panel The popover element.
 * @param {HTMLElement | null} params.trigger The button that opens it.
 * @returns {void}
 */
const placePanel = ({ panel, trigger }) => {
  if (!panel || !trigger) return
  if (window.innerWidth < NARROW_BREAKPOINT) {
    panel.style.left = ''
    panel.style.top = ''
    return
  }

  const anchor = trigger.getBoundingClientRect()
  const { width, height } = panel.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth
  const viewportHeight = window.innerHeight

  const maxLeft = viewportWidth - width - VIEWPORT_MARGIN
  const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, maxLeft))

  const below = anchor.bottom + TRIGGER_GAP
  const above = anchor.top - TRIGGER_GAP - height
  const fitsBelow = below + height <= viewportHeight - VIEWPORT_MARGIN
  const fitsAbove = above >= VIEWPORT_MARGIN
  const preferredTop = !fitsBelow && fitsAbove ? above : below
  const maxTop = viewportHeight - height - VIEWPORT_MARGIN
  const top = Math.max(VIEWPORT_MARGIN, Math.min(preferredTop, maxTop))

  panel.style.left = `${left}px`
  panel.style.top = `${top}px`
}

/**
 * Small `?` button that opens a panel with a title and explanatory text. Used for
 * every metric header (PRD: "every metric header has a help popover").
 *
 * - Click or keyboard only. There is no hover and no `interestfor`.
 * - Built on the Popover API: the trigger's `popovertarget` opens and closes the
 *   panel, Esc and an outside click dismiss it, and the panel sits in the top layer.
 * - On open the panel is placed beside the trigger; on phones (below 600 px) it is a
 *   bottom sheet.
 * - Where the Popover API is missing, the trigger toggles a `hidden` attribute.
 *
 * `label` is the trigger's accessible name and should say what it explains, for
 * example `"Help: PPI"`. Pass translated strings from the caller.
 *
 * @param {object} props
 * @param {string} props.id Unique id of the panel. The trigger points to it.
 * @param {string} props.label Accessible name of the `?` button, e.g. `'Help: PPI'`.
 * @param {import('preact').ComponentChildren} props.title Heading inside the panel.
 * @param {import('preact').ComponentChildren} props.children Explanatory text.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <HelpPopover id="help-ppi" label="Help: PPI" title="PPI">
 *   <p>Pixels per inch: diagonal pixels divided by the diagonal in inches.</p>
 * </HelpPopover>
 */
export const HelpPopover = ({ id, label, title, children }) => {
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const titleId = `${id}-title`
  const supportsPopover = hasPopoverApi()

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !supportsPopover) return undefined

    let detachViewport = () => {}

    /**
     * Open or close handler. `newState` is set by the browser on ToggleEvent.
     *
     * @param {Event & { newState?: string }} event
     */
    const handleToggle = (event) => {
      const isNowOpen = event.newState === 'open'
      setIsOpen(isNowOpen)
      detachViewport()
      detachViewport = () => {}
      if (!isNowOpen) return

      const reposition = () => placePanel({ panel, trigger: triggerRef.current })
      placePanel({ panel, trigger: triggerRef.current })
      window.addEventListener('resize', reposition)
      window.addEventListener('scroll', reposition, { passive: true, capture: true })
      detachViewport = () => {
        window.removeEventListener('resize', reposition)
        window.removeEventListener('scroll', reposition, { capture: true })
      }
    }

    panel.addEventListener('toggle', handleToggle)
    return () => {
      panel.removeEventListener('toggle', handleToggle)
      detachViewport()
    }
  }, [supportsPopover])

  useEffect(() => {
    if (supportsPopover || !isOpen) return
    placePanel({ panel: panelRef.current, trigger: triggerRef.current })
  }, [isOpen, supportsPopover])

  /**
   * Fallback for browsers without the Popover API: the trigger toggles the panel
   * itself. With the API the native `popovertarget` does the work.
   */
  const handleTriggerClick = () => {
    if (supportsPopover) return
    setIsOpen((wasOpen) => !wasOpen)
  }

  return (
    <>
      <Button
        ref={triggerRef}
        class="help-popover__trigger"
        variant="ghost"
        size="sm"
        icon="help"
        aria-label={label}
        aria-controls={id}
        aria-expanded={isOpen ? 'true' : 'false'}
        popovertarget={id}
        onClick={handleTriggerClick}
      />
      <div
        ref={panelRef}
        id={id}
        class="help-popover__panel"
        popover="auto"
        role="dialog"
        aria-labelledby={titleId}
        hidden={supportsPopover ? undefined : !isOpen}
      >
        <h3 id={titleId} class="help-popover__title">
          {title}
        </h3>
        <div class="help-popover__body">{children}</div>
      </div>
    </>
  )
}
