import { t } from '../../i18n/index.js'

/** Length of the vibration that confirms a long press, in milliseconds. */
export const VIBRATE_MS = 10

/** Id of the live region that carries the announcements. */
const REGION_ID = 'browse-announcer'

/**
 * Wait before the text goes into the region. A region that is created and filled in the
 * same moment is often not read out, so the text follows a short pause.
 */
const ANNOUNCE_DELAY_MS = 100

/**
 * The polite live region for announcements, created on first use. It is not `role="status"`,
 * so it does not collide with the status regions the views render.
 *
 * @returns {HTMLElement}
 */
const getRegion = () => {
  const existing = document.getElementById(REGION_ID)
  if (existing) return existing
  const region = document.createElement('div')
  region.id = REGION_ID
  region.className = 'visually-hidden'
  region.setAttribute('aria-live', 'polite')
  document.body.append(region)
  return region
}

/**
 * Reads a message out through the live region, after a short pause.
 *
 * @param {string} message
 */
const announce = (message) => {
  const region = getRegion()
  region.textContent = ''
  globalThis.setTimeout(() => {
    region.textContent = message
  }, ANNOUNCE_DELAY_MS)
}

/**
 * Feedback for a long press that changed Compare: a spoken message ("Added 27″ 4K UHD to
 * comparison") and a short vibration, where the device has one. A normal tap gives neither.
 *
 * @param {object} params
 * @param {string} params.name Display name, as the card shows it.
 * @param {boolean} params.isNowCompared Whether the display is in Compare after the change.
 * @returns {void}
 *
 * @example
 * announceCompareChange({ name: '27″ 4K UHD', isNowCompared: true })
 */
export const announceCompareChange = ({ name, isNowCompared }) => {
  announce(
    isNowCompared
      ? t('browse.compareAdded', { name })
      : t('browse.compareRemoved', { name }),
  )
  globalThis.navigator?.vibrate?.(VIBRATE_MS)
}
