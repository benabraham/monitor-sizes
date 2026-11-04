import { describe, expect, it } from 'vitest'
import { guessScreen } from './screen-guess.js'

describe('guessScreen', () => {
  it('reports the logical size and the native pixels at the device pixel ratio', () => {
    expect(
      guessScreen({
        screen: { width: 1920, height: 1080 },
        devicePixelRatio: 1.5,
      }),
    ).toEqual({
      logicalWidth: 1920,
      logicalHeight: 1080,
      scale: 1.5,
      width: 2880,
      height: 1620,
    })
  })

  it('uses the larger side as the width when the screen is in portrait', () => {
    expect(
      guessScreen({
        screen: { width: 1080, height: 1920 },
        devicePixelRatio: 1,
      }),
    ).toEqual({
      logicalWidth: 1920,
      logicalHeight: 1080,
      scale: 1,
      width: 1920,
      height: 1080,
    })
  })

  it('rounds the pixel size to whole pixels and the scale to 4 decimals', () => {
    const guess = guessScreen({
      screen: { width: 1366, height: 768 },
      devicePixelRatio: 1.3333333,
    })
    expect(guess.scale).toBe(1.3333)
    expect(guess.width).toBe(1821)
    expect(guess.height).toBe(1024)
  })

  it('keeps a whole scale as a whole number', () => {
    const guess = guessScreen({
      screen: { width: 1440, height: 900 },
      devicePixelRatio: 2,
    })
    expect(guess).toMatchObject({ scale: 2, width: 2880, height: 1800 })
  })

  it('returns null when the screen size is missing or zero (jsdom, workers)', () => {
    expect(
      guessScreen({ screen: { width: 0, height: 0 }, devicePixelRatio: 1 }),
    ).toBeNull()
    expect(guessScreen({ screen: undefined, devicePixelRatio: 1 })).toBeNull()
    expect(guessScreen({ screen: { width: 1920 }, devicePixelRatio: 1 })).toBeNull()
  })

  it('returns null when the device pixel ratio is unusable', () => {
    const screen = { width: 1920, height: 1080 }
    expect(guessScreen({ screen, devicePixelRatio: null })).toBeNull()
    expect(guessScreen({ screen, devicePixelRatio: 0 })).toBeNull()
    expect(guessScreen({ screen, devicePixelRatio: Number.NaN })).toBeNull()
  })

  it('reads the browser globals when no arguments are given', () => {
    const result = guessScreen()
    expect(result === null || typeof result.width === 'number').toBe(true)
  })
})
