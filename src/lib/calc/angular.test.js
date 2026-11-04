import { describe, expect, it } from 'vitest'
import { getDisplayMetrics } from './geometry.js'
import {
  getAngularMetrics,
  getEquivalentDistances,
  getFieldOfView,
  getPpd,
} from './angular.js'

const CM_PER_INCH = 2.54
const cm = (inches) => inches * CM_PER_INCH
const DISTANCE_60_CM = 60 / CM_PER_INCH

const fhd24 = { name: 'FHD 24', diagonal: 24, width: 1920, height: 1080 }
const uhd32 = { name: '4K 32', diagonal: 32, width: 3840, height: 2160 }
const uw34 = { name: '2K UW 34', diagonal: 34, width: 3440, height: 1440 }

describe('getFieldOfView', () => {
  it('computes 2 · atan(size / 2v) in degrees', () => {
    // 2 · atan(10 / 20) = 2 · atan(0.5) ≈ 53.13°
    expect(getFieldOfView({ size: 10, distance: 10 })).toBeCloseTo(53.13010235, 6)
  })

  it('is 0° for zero size', () => {
    expect(getFieldOfView({ size: 0, distance: 20 })).toBe(0)
  })

  it('approaches size / v in radians for a far viewer', () => {
    // For a small angle, FOV (rad) ≈ size / distance, so degrees ≈ size / v · 180/π.
    const fov = getFieldOfView({ size: 1, distance: 1000 })
    expect(fov).toBeCloseTo((1 / 1000) * (180 / Math.PI), 4)
  })

  it('narrows as the viewer moves back', () => {
    const near = getFieldOfView({ size: 20, distance: 20 })
    const far = getFieldOfView({ size: 20, distance: 60 })
    expect(far).toBeLessThan(near)
  })

  it('gives the 24″ FHD horizontal FOV at 60 cm, about 47.8°', () => {
    const { widthIn } = getDisplayMetrics(fhd24)
    expect(getFieldOfView({ size: widthIn, distance: DISTANCE_60_CM })).toBeCloseTo(
      47.7637,
      3,
    )
  })
})

describe('getPpd', () => {
  it('computes ppi · v · π / 180 with v in inches', () => {
    const { ppi } = getDisplayMetrics(fhd24)
    expect(getPpd({ ppi, distance: DISTANCE_60_CM })).toBeCloseTo(37.8425, 3)
  })

  it('is proportional to distance', () => {
    expect(getPpd({ ppi: 100, distance: 20 })).toBeCloseTo(
      2 * getPpd({ ppi: 100, distance: 10 }),
      9,
    )
  })

  it('is 0 for a zero distance', () => {
    expect(getPpd({ ppi: 100, distance: 0 })).toBe(0)
  })
})

describe('getAngularMetrics', () => {
  const metrics = getDisplayMetrics(fhd24)

  it('returns horizontal and vertical field of view, PPD and logical PPD', () => {
    const result = getAngularMetrics({
      metrics,
      distance: DISTANCE_60_CM,
      scale: 1.25,
    })
    expect(result.horizontalFov).toBeCloseTo(47.7637, 3)
    expect(result.verticalFov).toBeCloseTo(27.9703, 3)
    expect(result.ppd).toBeCloseTo(37.8425, 3)
    expect(result.logicalPpd).toBeCloseTo(37.8425 / 1.25, 3)
  })

  it('reports PPD at scale 1 as logical PPD', () => {
    const result = getAngularMetrics({
      metrics,
      distance: DISTANCE_60_CM,
      scale: 1,
    })
    expect(result.logicalPpd).toBeCloseTo(result.ppd, 12)
  })
})

describe('getEquivalentDistances', () => {
  // Worked example (PRD): baseline 24″ FHD at 60 cm and 100 %, candidate 32″ 4K at 150 %.
  const baseline = {
    metrics: getDisplayMetrics(fhd24),
    distance: DISTANCE_60_CM,
    scale: 1,
  }
  const candidate = { metrics: getDisplayMetrics(uhd32), scale: 1.5 }

  it('matches the worked example: same size ≈ 80 cm', () => {
    const { sameSize } = getEquivalentDistances({ baseline, candidate })
    expect(Math.abs(cm(sameSize) - 80)).toBeLessThan(0.5)
  })

  it('matches the worked example: same sharpness ≈ 40 cm', () => {
    const { sameSharpness } = getEquivalentDistances({ baseline, candidate })
    expect(Math.abs(cm(sameSharpness) - 40)).toBeLessThan(0.5)
  })

  it('matches the worked example: same text size ≈ 60 cm', () => {
    const { sameTextSize } = getEquivalentDistances({ baseline, candidate })
    expect(Math.abs(cm(sameTextSize) - 60)).toBeLessThan(0.5)
  })

  it('defaults to matching by height', () => {
    expect(getEquivalentDistances({ baseline, candidate })).toEqual(
      getEquivalentDistances({ baseline, candidate, sizeMatchBy: 'height' }),
    )
  })

  describe('sizeMatchBy', () => {
    // A 34″ 21:9 candidate is not 16:9, so height, width and diagonal differ.
    const ultrawide = { metrics: getDisplayMetrics(uw34), scale: 1 }

    it('matches by height: v_ref × H / H_ref', () => {
      const { sameSize } = getEquivalentDistances({
        baseline,
        candidate: ultrawide,
        sizeMatchBy: 'height',
      })
      expect(cm(sameSize)).toBeCloseTo(66.9474, 3)
    })

    it('matches by width: v_ref × W / W_ref', () => {
      const { sameSize } = getEquivalentDistances({
        baseline,
        candidate: ultrawide,
        sizeMatchBy: 'width',
      })
      expect(cm(sameSize)).toBeCloseTo(89.9606, 3)
    })

    it('matches by diagonal: v_ref × D / D_ref', () => {
      const { sameSize } = getEquivalentDistances({
        baseline,
        candidate: ultrawide,
        sizeMatchBy: 'diagonal',
      })
      // 34″ / 24″ × 60 cm = 85 cm
      expect(cm(sameSize)).toBeCloseTo(85, 6)
    })

    it('falls back to height for an unknown key', () => {
      const { sameSize } = getEquivalentDistances({
        baseline,
        candidate: ultrawide,
        sizeMatchBy: 'depth',
      })
      expect(cm(sameSize)).toBeCloseTo(66.9474, 3)
    })

    it('leaves sameSharpness and sameTextSize unchanged', () => {
      const byHeight = getEquivalentDistances({
        baseline,
        candidate: ultrawide,
        sizeMatchBy: 'height',
      })
      const byWidth = getEquivalentDistances({
        baseline,
        candidate: ultrawide,
        sizeMatchBy: 'width',
      })
      expect(byWidth.sameSharpness).toBe(byHeight.sameSharpness)
      expect(byWidth.sameTextSize).toBe(byHeight.sameTextSize)
    })
  })

  it('returns the viewing distance unchanged for an identical display at the same scale', () => {
    const same = getEquivalentDistances({
      baseline,
      candidate: { metrics: getDisplayMetrics(fhd24), scale: 1 },
    })
    expect(same.sameSize).toBeCloseTo(DISTANCE_60_CM, 12)
    expect(same.sameSharpness).toBeCloseTo(DISTANCE_60_CM, 12)
    expect(same.sameTextSize).toBeCloseTo(DISTANCE_60_CM, 12)
  })

  it('makes same text size equal same sharpness when both scales match', () => {
    const { sameSharpness, sameTextSize } = getEquivalentDistances({
      baseline: { ...baseline, scale: 1.5 },
      candidate: { metrics: getDisplayMetrics(uhd32), scale: 1.5 },
    })
    expect(sameTextSize).toBeCloseTo(sameSharpness, 12)
  })

  it('moves same text size with the candidate scale', () => {
    const at1 = getEquivalentDistances({
      baseline,
      candidate: { metrics: getDisplayMetrics(uhd32), scale: 1 },
    })
    const at15 = getEquivalentDistances({ baseline, candidate })
    // Text size at 100 % on a 138 PPI panel needs a closer seat than at 150 %.
    expect(at1.sameTextSize).toBeLessThan(at15.sameTextSize)
    expect(cm(at1.sameTextSize)).toBeCloseTo(40, 0)
  })
})
