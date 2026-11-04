import { describe, expect, it } from 'vitest'
import { getDisplayMetrics, getPpi, getRelativeMetrics } from './geometry.js'

const close = (actual, expected, digits = 6) =>
  expect(actual).toBeCloseTo(expected, digits)

describe('getPpi', () => {
  it('is the diagonal in pixels divided by the diagonal in inches', () => {
    // 3840 × 2160 at 42″: √(3840² + 2160²) / 42
    close(getPpi({ width: 3840, height: 2160, diagonal: 42 }), 104.9003414, 6)
  })

  it('gives the classic 24″ FHD value of about 92 PPI', () => {
    close(getPpi({ width: 1920, height: 1080, diagonal: 24 }), 91.7878, 4)
  })
})

describe('getDisplayMetrics', () => {
  const fhd24 = { name: 'FHD 24', diagonal: 24, width: 1920, height: 1080 }

  it('derives PPI and physical size from the inputs', () => {
    const metrics = getDisplayMetrics(fhd24)
    close(metrics.ppi, 91.7878, 4)
    close(metrics.widthIn, 1920 / metrics.ppi, 9)
    close(metrics.heightIn, 1080 / metrics.ppi, 9)
  })

  it('derives the physical diagonal back from width and height', () => {
    const { widthIn, heightIn } = getDisplayMetrics(fhd24)
    close(Math.hypot(widthIn, heightIn), 24, 9)
  })

  it('derives area in square inches and megapixels', () => {
    const metrics = getDisplayMetrics(fhd24)
    close(metrics.areaIn2, metrics.widthIn * metrics.heightIn, 9)
    close(metrics.megapixels, 2.0736, 9)
  })

  it('attaches the aspect label', () => {
    expect(getDisplayMetrics(fhd24).aspect).toEqual({
      label: '16:9',
      isApprox: false,
      isMapped: true,
    })
  })

  it('ignores display fields that are not inputs to the metrics', () => {
    const tagged = { ...fhd24, tag: 'monitor', isCustom: true, id: 'x' }
    expect(getDisplayMetrics(tagged)).toEqual(getDisplayMetrics(fhd24))
  })
})

describe('getRelativeMetrics', () => {
  const ref = getDisplayMetrics({ diagonal: 42, width: 3840, height: 2160 })
  const laptop = getDisplayMetrics({ diagonal: 15.6, width: 3840, height: 2160 })
  const fhd = getDisplayMetrics({ diagonal: 24, width: 1920, height: 1080 })

  it('is all zero against itself', () => {
    expect(getRelativeMetrics({ metrics: ref, baselineMetrics: ref })).toEqual({
      relativePixelSize: 0,
      widthDiffIn: 0,
      heightDiffIn: 0,
      areaRatio: 0,
      megapixelRatio: 0,
    })
  })

  it('computes relative pixel size as ppi_ref / ppi − 1', () => {
    const { relativePixelSize } = getRelativeMetrics({
      metrics: laptop,
      baselineMetrics: ref,
    })
    close(relativePixelSize, ref.ppi / laptop.ppi - 1, 12)
    // The sheet shows −63 % for the 15.6″ 4K row.
    close(relativePixelSize, -0.6286, 3)
  })

  it('gives a positive relative pixel size for a coarser display', () => {
    const { relativePixelSize } = getRelativeMetrics({
      metrics: fhd,
      baselineMetrics: ref,
    })
    expect(relativePixelSize).toBeGreaterThan(0)
  })

  it('computes size differences in inches (metrics minus baseline)', () => {
    const { widthDiffIn, heightDiffIn } = getRelativeMetrics({
      metrics: fhd,
      baselineMetrics: ref,
    })
    close(widthDiffIn, fhd.widthIn - ref.widthIn, 12)
    close(heightDiffIn, fhd.heightIn - ref.heightIn, 12)
    expect(widthDiffIn).toBeLessThan(0)
  })

  it('computes area ratio as area / area_ref − 1 without an absolute value', () => {
    const { areaRatio } = getRelativeMetrics({ metrics: fhd, baselineMetrics: ref })
    close(areaRatio, fhd.areaIn2 / ref.areaIn2 - 1, 12)
    expect(areaRatio).toBeLessThan(0)
  })

  it('keeps a negative area ratio negative (no ABS, PRD fix)', () => {
    const bigger = getDisplayMetrics({ diagonal: 55, width: 3840, height: 2160 })
    const { areaRatio } = getRelativeMetrics({
      metrics: ref,
      baselineMetrics: bigger,
    })
    expect(areaRatio).toBeLessThan(0)
  })

  it('computes megapixel ratio as Mpix / Mpix_ref − 1', () => {
    const { megapixelRatio } = getRelativeMetrics({
      metrics: fhd,
      baselineMetrics: ref,
    })
    close(megapixelRatio, 2.0736 / 8.2944 - 1, 9)
  })
})
