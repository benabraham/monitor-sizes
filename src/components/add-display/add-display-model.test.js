import { describe, expect, it } from 'vitest'
import {
  windowsScaleOptionsFor,
  DISPLAY_4K_27,
  DISPLAY_MBP_14,
} from './add-display.fixtures.js'
import {
  buildPayload,
  DEFAULT_COMFORT,
  DIAGONAL_RANGE,
  getDefaultScale,
  getPreview,
  isMeasurable,
  PIXEL_RANGE,
  RESOLUTION_PRESETS,
  suggestTag,
  validateDraft,
} from './add-display-model.js'

const VALID_VALUES = {
  name: 'Office',
  diagonal: 27,
  width: 3840,
  height: 2160,
  distance: 23.622,
  isFamiliar: false,
}

describe('suggestTag', () => {
  it.each([
    [{ diagonal: 13.3, width: 2560, height: 1600 }, 'laptop'],
    [{ diagonal: 17.3, width: 1920, height: 1080 }, 'laptop'],
    [{ diagonal: 27, width: 3840, height: 2160 }, 'monitor'],
    [{ diagonal: 34, width: 3440, height: 1440 }, 'ultrawide'],
    [{ diagonal: 49, width: 5120, height: 1440 }, 'ultrawide'],
    [{ diagonal: 17.4, width: 3440, height: 1440 }, 'ultrawide'],
    [{ diagonal: NaN, width: 3440, height: 1440 }, 'ultrawide'],
    [{ diagonal: NaN, width: NaN, height: NaN }, 'monitor'],
    [{ diagonal: 27, width: 3840, height: 0 }, 'monitor'],
  ])('suggests the tag for %j', (display, expected) => {
    expect(suggestTag(display)).toBe(expected)
  })
})

describe('isMeasurable', () => {
  it('is true only when all three values are positive numbers', () => {
    expect(isMeasurable({ diagonal: 27, width: 3840, height: 2160 })).toBe(true)
    expect(isMeasurable({ diagonal: 0, width: 3840, height: 2160 })).toBe(false)
    expect(isMeasurable({ diagonal: 27, width: NaN, height: 2160 })).toBe(false)
    expect(isMeasurable({ diagonal: 27, width: 3840, height: -1 })).toBe(false)
  })
})

describe('validateDraft', () => {
  it('accepts a complete display', () => {
    expect(validateDraft({ values: VALID_VALUES })).toEqual({ errors: {}, isValid: true })
  })

  it('requires a name, ignoring surrounding spaces', () => {
    expect(validateDraft({ values: { ...VALID_VALUES, name: '   ' } }).errors).toEqual({
      name: 'required',
    })
  })

  it('reports empty numbers as required and out-of-range numbers as range', () => {
    const { errors, isValid } = validateDraft({
      values: { ...VALID_VALUES, diagonal: Number.NaN, width: 100, height: 30000 },
    })
    expect(isValid).toBe(false)
    expect(errors).toEqual({ diagonal: 'required', width: 'range', height: 'range' })
  })

  it('checks the diagonal bounds, inclusive', () => {
    const at = (diagonal) => validateDraft({ values: { ...VALID_VALUES, diagonal } })
    expect(at(DIAGONAL_RANGE.min).isValid).toBe(true)
    expect(at(DIAGONAL_RANGE.max).isValid).toBe(true)
    expect(at(4.9).errors.diagonal).toBe('range')
    expect(at(120.1).errors.diagonal).toBe('range')
  })

  it('requires whole pixels inside the pixel range', () => {
    const at = (width) => validateDraft({ values: { ...VALID_VALUES, width } })
    expect(at(PIXEL_RANGE.min).isValid).toBe(true)
    expect(at(PIXEL_RANGE.max).isValid).toBe(true)
    expect(at(319).errors.width).toBe('range')
    expect(at(1920.5).errors.width).toBe('range')
  })

  it('checks the distance only when the display is familiar', () => {
    const familiar = { ...VALID_VALUES, isFamiliar: true, distance: 1 }
    expect(validateDraft({ values: familiar }).errors).toEqual({ distance: 'range' })
    expect(validateDraft({ values: { ...familiar, isFamiliar: false } }).isValid).toBe(
      true,
    )
    expect(
      validateDraft({ values: { ...familiar, distance: Number.NaN } }).errors,
    ).toEqual({ distance: 'required' })
  })
})

describe('getDefaultScale', () => {
  it('picks the best comfortable scale for a 27″ 4K display (175 %)', () => {
    expect(
      getDefaultScale({
        display: DISPLAY_4K_27,
        scaleOptions: windowsScaleOptionsFor(DISPLAY_4K_27),
      }),
    ).toBe(1.75)
  })

  it('falls back to the scale nearest the window when none fits', () => {
    expect(
      getDefaultScale({
        display: DISPLAY_MBP_14,
        scaleOptions: windowsScaleOptionsFor(DISPLAY_MBP_14),
      }),
    ).toBe(2)
  })

  it('returns 1 without options or without a measurable display', () => {
    expect(getDefaultScale({ display: DISPLAY_4K_27, scaleOptions: [] })).toBe(1)
    expect(
      getDefaultScale({
        display: { ...DISPLAY_4K_27, diagonal: Number.NaN },
        scaleOptions: windowsScaleOptionsFor(DISPLAY_4K_27),
      }),
    ).toBe(1)
  })

  it('uses the default comfort window', () => {
    expect(DEFAULT_COMFORT).toMatchObject({
      mode: 'ppi',
      minPpi: 90,
      maxPpi: 105,
      minWidth: 1024,
    })
  })
})

describe('getPreview', () => {
  it('shows PPI 163, 16:9, 60 × 34 cm and a 69 cm diagonal for a 27″ 4K display', () => {
    const preview = getPreview({ width: 3840, height: 2160, diagonal: 27 })
    expect(Math.round(preview.ppi)).toBe(163)
    expect(preview.aspect).toEqual({ label: '16:9', isApprox: false, isMapped: true })
    expect(Math.round(preview.widthIn * 2.54)).toBe(60)
    expect(Math.round(preview.heightIn * 2.54)).toBe(34)
    expect(preview.diagonalIn).toBe(27)
  })

  it('is null until the display can be measured', () => {
    expect(getPreview({ width: 3840, height: Number.NaN, diagonal: 27 })).toBeNull()
  })
})

describe('buildPayload', () => {
  it('trims the name and resolves the suggested tag and default distance', () => {
    const payload = buildPayload({
      draft: {
        name: '  MacBook  ',
        diagonal: 14.2,
        width: 3024,
        height: 1964,
        tag: null,
        isFamiliar: false,
        distance: null,
        scale: null,
      },
      scale: 2,
    })
    expect(payload.name).toBe('MacBook')
    expect(payload.tag).toBe('laptop')
    expect(payload.distance).toBeCloseTo(45 / 2.54, 6)
    expect(payload.scale).toBe(2)
  })

  it('keeps a picked tag and a typed distance', () => {
    const payload = buildPayload({
      draft: {
        name: 'Office',
        diagonal: 27,
        width: 3840,
        height: 2160,
        tag: 'ultrawide',
        isFamiliar: true,
        distance: 30,
        scale: 1.5,
      },
      scale: 1.5,
    })
    expect(payload).toEqual({
      name: 'Office',
      diagonal: 27,
      width: 3840,
      height: 2160,
      tag: 'ultrawide',
      isFamiliar: true,
      distance: 30,
      scale: 1.5,
    })
  })
})

describe('RESOLUTION_PRESETS', () => {
  it('lists the thirteen common resolutions in order, frozen', () => {
    expect(RESOLUTION_PRESETS).toHaveLength(13)
    expect(RESOLUTION_PRESETS[0]).toEqual({ width: 1920, height: 1080 })
    expect(RESOLUTION_PRESETS.at(-1)).toEqual({ width: 7680, height: 4320 })
    expect(Object.isFrozen(RESOLUTION_PRESETS[0])).toBe(true)
  })
})
