import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { announceCompareChange } from './compare-feedback.js'

const REGION_ID = 'browse-announcer'

/** The live region the announcement is written to, once it exists. */
const getRegion = () => document.getElementById(REGION_ID)

beforeEach(() => {
  vi.useFakeTimers()
  locale.value = 'en'
})

afterEach(() => {
  vi.useRealTimers()
  delete navigator.vibrate
  getRegion()?.remove()
  locale.value = 'en'
})

describe('announceCompareChange', () => {
  it('says that the display was added, once the region is ready to read it', () => {
    announceCompareChange({ name: '27″ 4K UHD', isNowCompared: true })

    vi.advanceTimersByTime(100)

    expect(getRegion().textContent).toBe('Added 27″ 4K UHD to comparison')
  })

  it('says that the display was removed', () => {
    announceCompareChange({ name: '27″ 4K UHD', isNowCompared: false })

    vi.advanceTimersByTime(100)

    expect(getRegion().textContent).toBe('Removed 27″ 4K UHD from comparison')
  })

  it('uses the Czech text in Czech', () => {
    locale.value = 'cs'

    announceCompareChange({ name: 'Studio', isNowCompared: true })
    vi.advanceTimersByTime(100)

    expect(getRegion().textContent).toBe('Přidáno do porovnání: Studio')
  })

  it('writes to a polite live region that is hidden from sight', () => {
    announceCompareChange({ name: 'Studio', isNowCompared: true })

    const region = getRegion()
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.classList.contains('visually-hidden')).toBe(true)
  })

  it('reuses one region for every announcement', () => {
    announceCompareChange({ name: 'A', isNowCompared: true })
    announceCompareChange({ name: 'B', isNowCompared: false })
    vi.advanceTimersByTime(100)

    expect(document.querySelectorAll(`#${REGION_ID}`)).toHaveLength(1)
    expect(getRegion().textContent).toBe('Removed B from comparison')
  })

  it('vibrates for 10 ms where the device can vibrate', () => {
    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })

    announceCompareChange({ name: 'Studio', isNowCompared: true })

    expect(vibrate).toHaveBeenCalledWith(10)
  })

  it('does not fail where the device cannot vibrate', () => {
    expect(() => announceCompareChange({ name: 'Studio', isNowCompared: true })).not.toThrow()
  })
})
