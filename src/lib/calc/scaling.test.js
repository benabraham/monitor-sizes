import { describe, expect, it } from 'vitest'
import { getDisplayMetrics } from './geometry.js'
import {
  getBestScale,
  getScaledMetrics,
  getScaleOptions,
  getScalingMatrix,
  isComfortable,
} from './scaling.js'

const COMFORT = {
  mode: 'ppi',
  minPpi: 90,
  maxPpi: 105,
  minPpd: 37,
  maxPpd: 43,
  minWidth: 1024,
}

const fourK42 = { name: '4K', diagonal: 42, width: 3840, height: 2160 }
const laptop = { name: '4K 15.6', diagonal: 15.6, width: 3840, height: 2160 }

const scalesOf = (options) => options.map(({ scale }) => scale)

describe('getScaleOptions', () => {
  describe('windows and linux (factor presets)', () => {
    it('lists the Windows factors in ascending order', () => {
      expect(
        scalesOf(getScaleOptions({ display: fourK42, presetId: 'windows' })),
      ).toEqual([1, 1.25, 1.5, 1.75, 2])
    })

    it('lists the Linux/Wayland factors including 110 %', () => {
      expect(scalesOf(getScaleOptions({ display: fourK42, presetId: 'linux' }))).toEqual([
        1, 1.1, 1.25, 1.5, 1.75, 2,
      ])
    })

    it('does not flag preset entries as custom', () => {
      const [first] = getScaleOptions({ display: fourK42, presetId: 'linux' })
      expect(first).toEqual({ scale: 1 })
    })

    it('merges custom scales and sorts ascending', () => {
      const options = getScaleOptions({
        display: fourK42,
        presetId: 'windows',
        customScales: [3, 1.33],
      })
      expect(scalesOf(options)).toEqual([1, 1.25, 1.33, 1.5, 1.75, 2, 3])
      expect(options.find(({ scale }) => scale === 1.33)).toEqual({
        scale: 1.33,
        isCustom: true,
      })
    })

    it('keeps the preset entry when a custom scale duplicates it', () => {
      const options = getScaleOptions({
        display: fourK42,
        presetId: 'windows',
        customScales: [1.25],
      })
      expect(scalesOf(options)).toEqual([1, 1.25, 1.5, 1.75, 2])
      expect(options.find(({ scale }) => scale === 1.25)).toEqual({ scale: 1.25 })
    })

    it('treats a missing customScales list as empty', () => {
      expect(
        scalesOf(getScaleOptions({ display: fourK42, presetId: 'windows' })),
      ).toHaveLength(5)
    })

    it('falls back to the Windows factors for an unknown preset id', () => {
      expect(scalesOf(getScaleOptions({ display: fourK42, presetId: 'beos' }))).toEqual([
        1, 1.25, 1.5, 1.75, 2,
      ])
    })
  })

  describe('macos (looks-like widths)', () => {
    it('derives s = native width ÷ looks-like width, keeps 1 ≤ s ≤ 2', () => {
      const options = getScaleOptions({ display: fourK42, presetId: 'macos' })
      expect(options).toEqual([
        { scale: 1.2, looksLikeWidth: 3200 },
        { scale: 1.2766, looksLikeWidth: 3008 },
        { scale: 1.5, looksLikeWidth: 2560 },
        { scale: 1.6667, looksLikeWidth: 2304 },
        { scale: 1.875, looksLikeWidth: 2048 },
        { scale: 2, looksLikeWidth: 1920 },
      ])
    })

    it('rounds s to 4 decimals', () => {
      const [, second] = getScaleOptions({ display: fourK42, presetId: 'macos' })
      expect(second.scale).toBe(1.2766)
    })

    it('drops looks-like widths that would need s above 2 or below 1', () => {
      const options = getScaleOptions({ display: laptop, presetId: 'macos' })
      expect(options.every(({ scale }) => scale >= 1 && scale <= 2)).toBe(true)
      expect(options.map(({ looksLikeWidth }) => looksLikeWidth)).not.toContain(1280)
    })

    it('gives a 5K native panel the 1.6, 1.7 and 2 looks-like scales', () => {
      const display = { diagonal: 27, width: 5120, height: 2880 }
      expect(getScaleOptions({ display, presetId: 'macos' })).toEqual([
        { scale: 1.6, looksLikeWidth: 3200 },
        { scale: 1.7021, looksLikeWidth: 3008 },
        { scale: 2, looksLikeWidth: 2560 },
      ])
    })

    it('keeps a 1× looks-like width when the native width equals it', () => {
      const display = { diagonal: 13, width: 1280, height: 800 }
      expect(getScaleOptions({ display, presetId: 'macos' })).toEqual([
        { scale: 1, looksLikeWidth: 1280 },
      ])
    })

    it('appends custom scales as custom, keeping the preset entry on a clash', () => {
      const options = getScaleOptions({
        display: fourK42,
        presetId: 'macos',
        customScales: [1.5, 1.33],
      })
      expect(options.find(({ scale }) => scale === 1.5)).toEqual({
        scale: 1.5,
        looksLikeWidth: 2560,
      })
      expect(options.find(({ scale }) => scale === 1.33)).toEqual({
        scale: 1.33,
        isCustom: true,
      })
      expect(scalesOf(options)).toEqual([...scalesOf(options)].sort((a, b) => a - b))
    })
  })
})

describe('getScaledMetrics', () => {
  const metrics = getDisplayMetrics(fourK42)

  it('derives logical resolution, effective PPI and workspace at a scale', () => {
    const scaled = getScaledMetrics({ display: fourK42, metrics, scale: 1.5 })
    expect(scaled.scale).toBe(1.5)
    expect(scaled.logicalWidth).toBeCloseTo(2560, 9)
    expect(scaled.logicalHeight).toBeCloseTo(1440, 9)
    expect(scaled.effectivePpi).toBeCloseTo(metrics.ppi / 1.5, 9)
    expect(scaled.workspaceMegapixels).toBeCloseTo(3.6864, 9)
  })

  it('scales workspace by s² (PRD fix), not by s', () => {
    const { workspaceMegapixels } = getScaledMetrics({
      display: fourK42,
      metrics,
      scale: 2,
    })
    // 1920 × 1080 logical pixels, not 8.2944 / 2.
    expect(workspaceMegapixels).toBeCloseTo(2.0736, 9)
    expect(workspaceMegapixels).not.toBeCloseTo(8.2944 / 2, 2)
  })

  it('matches the sheet workspace formula (w/s)(h/s)/10⁶ at 110 %', () => {
    const { workspaceMegapixels } = getScaledMetrics({
      display: fourK42,
      metrics,
      scale: 1.1,
    })
    expect(workspaceMegapixels).toBeCloseTo(((3840 / 1.1) * (2160 / 1.1)) / 1e6, 9)
  })

  it('omits logicalPpd when no distance is given', () => {
    const scaled = getScaledMetrics({ display: fourK42, metrics, scale: 1 })
    expect(scaled).not.toHaveProperty('logicalPpd')
  })

  it('computes logicalPpd = ppi · distance · π/180 / scale when distance is given', () => {
    const distance = 60 / 2.54
    const scaled = getScaledMetrics({
      display: fourK42,
      metrics,
      scale: 1.5,
      distance,
    })
    const expected = (metrics.ppi * distance * Math.PI) / 180 / 1.5
    expect(scaled.logicalPpd).toBeCloseTo(expected, 9)
  })

  it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY, undefined, null])(
    'omits logicalPpd for an invalid distance (%s)',
    (distance) => {
      const scaled = getScaledMetrics({
        display: fourK42,
        metrics,
        scale: 1,
        distance,
      })
      expect(scaled).not.toHaveProperty('logicalPpd')
    },
  )
})

describe('isComfortable', () => {
  const at = (overrides) => ({
    logicalWidth: 2560,
    effectivePpi: 100,
    logicalPpd: 40,
    ...overrides,
  })

  describe('ppi mode', () => {
    it('is true inside the PPI window and above the minimum width', () => {
      expect(isComfortable({ scaled: at(), comfort: COMFORT })).toBe(true)
    })

    it('includes both PPI bounds', () => {
      expect(isComfortable({ scaled: at({ effectivePpi: 90 }), comfort: COMFORT })).toBe(
        true,
      )
      expect(isComfortable({ scaled: at({ effectivePpi: 105 }), comfort: COMFORT })).toBe(
        true,
      )
    })

    it('is false just outside the PPI bounds', () => {
      expect(
        isComfortable({ scaled: at({ effectivePpi: 89.9 }), comfort: COMFORT }),
      ).toBe(false)
      expect(
        isComfortable({ scaled: at({ effectivePpi: 105.1 }), comfort: COMFORT }),
      ).toBe(false)
    })

    it('includes the minimum logical width', () => {
      expect(
        isComfortable({ scaled: at({ logicalWidth: 1024 }), comfort: COMFORT }),
      ).toBe(true)
    })

    it('is false below the minimum logical width even when PPI fits', () => {
      expect(
        isComfortable({ scaled: at({ logicalWidth: 1023 }), comfort: COMFORT }),
      ).toBe(false)
    })

    it('ignores logicalPpd', () => {
      const scaled = at({ logicalPpd: 10 })
      expect(isComfortable({ scaled, comfort: COMFORT })).toBe(true)
    })
  })

  describe('ppd mode', () => {
    const ppd = { ...COMFORT, mode: 'ppd' }

    it('is true inside the PPD window and above the minimum width', () => {
      expect(isComfortable({ scaled: at(), comfort: ppd })).toBe(true)
    })

    it('includes both PPD bounds', () => {
      expect(isComfortable({ scaled: at({ logicalPpd: 37 }), comfort: ppd })).toBe(true)
      expect(isComfortable({ scaled: at({ logicalPpd: 43 }), comfort: ppd })).toBe(true)
    })

    it('is false just outside the PPD bounds', () => {
      expect(isComfortable({ scaled: at({ logicalPpd: 36.9 }), comfort: ppd })).toBe(
        false,
      )
      expect(isComfortable({ scaled: at({ logicalPpd: 43.1 }), comfort: ppd })).toBe(
        false,
      )
    })

    it('ignores effectivePpi', () => {
      const scaled = at({ effectivePpi: 300 })
      expect(isComfortable({ scaled, comfort: ppd })).toBe(true)
    })

    it('is false when logicalPpd is undefined (no distance)', () => {
      const scaled = { logicalWidth: 2560, effectivePpi: 100 }
      expect(isComfortable({ scaled, comfort: ppd })).toBe(false)
    })

    it('is false when logicalPpd is not a number', () => {
      expect(isComfortable({ scaled: at({ logicalPpd: NaN }), comfort: ppd })).toBe(false)
    })

    it('still applies the minimum width', () => {
      expect(isComfortable({ scaled: at({ logicalWidth: 1000 }), comfort: ppd })).toBe(
        false,
      )
    })
  })
})

describe('getScalingMatrix', () => {
  const metrics = getDisplayMetrics(fourK42)
  const scaleOptions = [1, 1.1, 1.25, 1.5, 1.75, 2].map((scale) => ({ scale }))

  it('returns one row per scale option, in the same order', () => {
    const rows = getScalingMatrix({
      display: fourK42,
      metrics,
      scaleOptions,
      comfort: COMFORT,
    })
    expect(rows.map(({ scale }) => scale)).toEqual([1, 1.1, 1.25, 1.5, 1.75, 2])
  })

  it('merges the scaled metrics and the isComfortable flag into each row', () => {
    const [row] = getScalingMatrix({
      display: fourK42,
      metrics,
      scaleOptions,
      comfort: COMFORT,
    })
    expect(row).toMatchObject({
      scale: 1,
      logicalWidth: 3840,
      logicalHeight: 2160,
      isComfortable: true,
    })
    expect(row.effectivePpi).toBeCloseTo(metrics.ppi, 9)
  })

  it('keeps extra scale-option fields such as looksLikeWidth', () => {
    const [row] = getScalingMatrix({
      display: fourK42,
      metrics,
      scaleOptions: [{ scale: 2, looksLikeWidth: 1920 }],
      comfort: COMFORT,
    })
    expect(row.looksLikeWidth).toBe(1920)
  })

  it('flags scales outside the comfort window as not comfortable', () => {
    const rows = getScalingMatrix({
      display: laptop,
      metrics: getDisplayMetrics(laptop),
      scaleOptions,
      comfort: COMFORT,
    })
    expect(rows.every(({ isComfortable }) => isComfortable === false)).toBe(true)
  })

  it('adds logicalPpd to every row when a distance is given', () => {
    const rows = getScalingMatrix({
      display: fourK42,
      metrics,
      scaleOptions,
      comfort: COMFORT,
      distance: 60 / 2.54,
    })
    expect(rows.every(({ logicalPpd }) => Number.isFinite(logicalPpd))).toBe(true)
  })

  it('returns an empty matrix for no scale options', () => {
    expect(
      getScalingMatrix({ display: fourK42, metrics, scaleOptions: [], comfort: COMFORT }),
    ).toEqual([])
  })
})

describe('getBestScale', () => {
  const row = (overrides) => ({
    scale: 1,
    effectivePpi: 100,
    logicalPpd: 40,
    logicalWidth: 2560,
    isComfortable: true,
    ...overrides,
  })

  it('returns null for empty rows', () => {
    expect(getBestScale({ rows: [], comfort: COMFORT })).toBeNull()
  })

  describe('ppi mode', () => {
    it('picks the comfortable row closest to the middle of the window', () => {
      // Middle of 90–105 is 97.5.
      const rows = [
        row({ scale: 1, effectivePpi: 88, isComfortable: false }),
        row({ scale: 1.25, effectivePpi: 96 }),
        row({ scale: 1.5, effectivePpi: 100 }),
        row({ scale: 1.75, effectivePpi: 104 }),
      ]
      expect(getBestScale({ rows, comfort: COMFORT })).toBe(rows[1])
    })

    it('breaks a tie on distance to the middle by the larger logical width', () => {
      // 95 and 100 are both 2.5 away from 97.5.
      const narrow = row({ scale: 1.25, effectivePpi: 95, logicalWidth: 2000 })
      const wide = row({ scale: 1.5, effectivePpi: 100, logicalWidth: 2500 })
      expect(getBestScale({ rows: [narrow, wide], comfort: COMFORT })).toBe(wide)
      expect(getBestScale({ rows: [wide, narrow], comfort: COMFORT })).toBe(wide)
    })

    it('falls back to the row nearest the window when none is comfortable', () => {
      const rows = [
        row({ scale: 1, effectivePpi: 60, isComfortable: false }),
        row({ scale: 1.25, effectivePpi: 120, isComfortable: false }),
        row({ scale: 1.5, effectivePpi: 150, isComfortable: false }),
      ]
      // Distances to the window: 30, 15, 45.
      expect(getBestScale({ rows, comfort: COMFORT })).toBe(rows[1])
    })

    it('measures the fallback distance to the nearest bound on either side', () => {
      // 80 is 10 below the window, 115 is 10 above it: a tie, so the wider wins.
      const below = row({
        scale: 1,
        effectivePpi: 80,
        logicalWidth: 2560,
        isComfortable: false,
      })
      const above = row({
        scale: 2,
        effectivePpi: 115,
        logicalWidth: 3000,
        isComfortable: false,
      })
      expect(getBestScale({ rows: [below, above], comfort: COMFORT })).toBe(above)

      // 107 is 2 above the window, so it beats 80 (10 below) on either side.
      const nearAbove = row({
        scale: 1.5,
        effectivePpi: 107,
        logicalWidth: 2000,
        isComfortable: false,
      })
      expect(getBestScale({ rows: [below, nearAbove], comfort: COMFORT })).toBe(nearAbove)
    })

    it('ignores the logicalPpd values in ppi mode', () => {
      const rows = [
        row({ scale: 1.25, effectivePpi: 96, logicalPpd: 999 }),
        row({ scale: 1.5, effectivePpi: 60, logicalPpd: 1, isComfortable: false }),
      ]
      expect(getBestScale({ rows, comfort: COMFORT })).toBe(rows[0])
    })
  })

  describe('ppd mode', () => {
    const ppd = { ...COMFORT, mode: 'ppd' }

    it('picks the comfortable row closest to the middle of the PPD window', () => {
      // Middle of 37–43 is 40.
      const rows = [
        row({ scale: 1, logicalPpd: 36, isComfortable: false }),
        row({ scale: 1.25, logicalPpd: 38 }),
        row({ scale: 1.5, logicalPpd: 40.5 }),
        row({ scale: 1.75, logicalPpd: 43 }),
      ]
      expect(getBestScale({ rows, comfort: ppd })).toBe(rows[2])
    })

    it('falls back by PPD distance when none is comfortable', () => {
      const rows = [
        row({ scale: 1, logicalPpd: 30, isComfortable: false }),
        row({ scale: 1.25, logicalPpd: 50, isComfortable: false }),
        row({ scale: 1.5, logicalPpd: 36, isComfortable: false }),
      ]
      // Distances: 7, 7 and 1; the 36 row is nearest.
      expect(getBestScale({ rows, comfort: ppd })).toBe(rows[2])
    })

    it('returns null when no row has a logicalPpd (no distance)', () => {
      const rows = [
        { scale: 1, effectivePpi: 100, logicalWidth: 3840, isComfortable: false },
      ]
      expect(getBestScale({ rows, comfort: ppd })).toBeNull()
    })

    it('ignores rows without a logicalPpd when others have one', () => {
      const noDistance = {
        scale: 1,
        effectivePpi: 100,
        logicalWidth: 3840,
        isComfortable: false,
      }
      const withDistance = row({ scale: 1.5, logicalPpd: 40 })
      expect(getBestScale({ rows: [noDistance, withDistance], comfort: ppd })).toBe(
        withDistance,
      )
    })
  })
})
