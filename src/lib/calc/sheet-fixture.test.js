/**
 * Acceptance test (PRD: Acceptance): every row and metric of the original sheet,
 * as displayed, must be reproduced by the calc layer within rounding, with the
 * PRD's documented fixes. Fixture: `data/sheet-snapshot/monitory.values.json`
 * (formatted values, `monitory!A1:AK54`).
 *
 * Deliberately not asserted: the sheet's "like Mpix" columns. They are the bug
 * the PRD fixes (s² instead of s, no 5 Mpix cut-off). The workspace formula is
 * covered in `scaling.test.js`.
 */
import { describe, expect, it } from 'vitest'
import fixture from '../../../data/sheet-snapshot/monitory.values.json'
import { round } from '../math.js'
import { getAspect } from './aspect.js'
import { getDisplayMetrics, getRelativeMetrics } from './geometry.js'
import { getScaleOptions, getScalingMatrix } from './scaling.js'

const MINUS = '−'
const SAME = 'same'
const TIMES = '×'

/**
 * Parse one formatted sheet cell into a number.
 *
 * `same` is 0. The sheet's U+2212 minus becomes `-`. Spaces and `%` are dropped,
 * so `'− 58'` → -58, `'+ 37'` → 37, `'−63 %'` → -63 and `'15.6'` → 15.6.
 *
 * @param {string | undefined} cell
 * @returns {number}
 */
const parseSheetNumber = (cell) => {
  const text = (cell ?? '').trim()
  if (text === SAME) return 0
  const normalised = text.replaceAll(MINUS, '-').replace('%', '').replace(/\s+/g, '')
  const value = Number(normalised)
  if (normalised === '' || Number.isNaN(value)) {
    throw new Error(`Not a sheet number: "${cell}"`)
  }
  return value
}

/**
 * Cell text, or `''` for a cell that is missing from a trimmed row.
 *
 * @param {string[]} row
 * @param {number} column
 * @returns {string}
 */
const cellOf = (row, column) => row[column] ?? ''

const SHEET = fixture.values
const HEADER_SCALES_ROW = SHEET[2]
const CONTROLS_ROW = SHEET[0]

/** Sheet column where each scale's triplet starts: [logical res, like PPI, like Mpix]. */
const SCALE_COLUMNS = [
  { scale: 1, column: 19 },
  { scale: 1.1, column: 22 },
  { scale: 1.25, column: 25 },
  { scale: 1.5, column: 28 },
  { scale: 1.75, column: 31 },
  { scale: 2, column: 34 },
]

/** Comfort window from the sheet's controls (row 1: 90 PPI, 105 PPI, 1024 px). */
const COMFORT = {
  mode: 'ppi',
  minPpi: 90,
  maxPpi: 105,
  minPpd: 37,
  maxPpd: 43,
  minWidth: 1024,
}

/** Display rows: sheet rows 4 to 54, which is 51 displays. */
const records = SHEET.slice(3).map((row, index) => ({
  row,
  sheetRow: index + 4,
  isBaseline: cellOf(row, 0) === 'TRUE',
  name: cellOf(row, 4).trim(),
  diagonal: parseSheetNumber(row[1]),
  width: parseSheetNumber(row[6]),
  height: parseSheetNumber(row[8]),
}))

const baselineRecord = records.find(({ isBaseline }) => isBaseline)
const baselineMetrics = getDisplayMetrics(baselineRecord)

const labelOf = (record) =>
  `row ${record.sheetRow}: ${record.name} ${record.diagonal}″ ${record.width}×${record.height}`

const rowCases = records.map((record) => ({ title: labelOf(record), record }))

const SCALE_OPTIONS = SCALE_COLUMNS.map(({ scale }) => ({ scale }))

/** Scaling matrix per display, computed once. */
const matrixByRow = new Map(
  records.map((record) => [
    record,
    getScalingMatrix({
      display: record,
      metrics: getDisplayMetrics(record),
      scaleOptions: SCALE_OPTIONS,
      comfort: COMFORT,
    }),
  ]),
)

const relativeOf = (record) =>
  getRelativeMetrics({
    metrics: getDisplayMetrics(record),
    baselineMetrics,
  })

describe('sheet fixture: structure', () => {
  it('has the 51 display rows of the sheet', () => {
    expect(records).toHaveLength(51)
  })

  it('has exactly one reference row, 42″ 4K (3840 × 2160)', () => {
    expect(records.filter(({ isBaseline }) => isBaseline)).toHaveLength(1)
    expect(baselineRecord).toMatchObject({
      name: '4K',
      diagonal: 42,
      width: 3840,
      height: 2160,
    })
  })

  it('has the comfort controls the test uses (90 PPI, 105 PPI, 1024 px)', () => {
    expect(CONTROLS_ROW).toEqual(expect.arrayContaining(['90 PPI', '105 PPI', '1024 px']))
  })

  it('has the scale headers the test uses (100 % … 200 %)', () => {
    for (const { scale, column } of SCALE_COLUMNS) {
      expect(cellOf(HEADER_SCALES_ROW, column)).toBe(`${Math.round(scale * 100)}%`)
    }
  })

  it('has a Linux factor preset equal to the six scales the test uses', () => {
    expect(getScaleOptions({ display: baselineRecord, presetId: 'linux' })).toEqual(
      SCALE_OPTIONS,
    )
  })
})

describe('sheet fixture: PPI', () => {
  it.each(rowCases)('$title', ({ record }) => {
    const { ppi } = getDisplayMetrics(record)
    expect(round({ value: ppi })).toBe(parseSheetNumber(record.row[2]))
  })
})

describe('sheet fixture: relative pixel size', () => {
  it.each(rowCases)('$title', ({ record }) => {
    const { relativePixelSize } = relativeOf(record)
    expect(round({ value: relativePixelSize * 100 })).toBe(
      parseSheetNumber(record.row[3]),
    )
  })
})

describe('sheet fixture: width and height in cm', () => {
  it.each(rowCases)('$title', ({ record }) => {
    const { widthIn, heightIn } = getDisplayMetrics(record)
    expect(round({ value: widthIn * 2.54 })).toBe(parseSheetNumber(record.row[9]))
    expect(round({ value: heightIn * 2.54 })).toBe(parseSheetNumber(record.row[11]))
  })
})

describe('sheet fixture: width and height difference in cm', () => {
  it.each(rowCases)('$title', ({ record }) => {
    const { widthDiffIn, heightDiffIn } = relativeOf(record)
    expect(round({ value: widthDiffIn * 2.54 })).toBe(parseSheetNumber(record.row[12]))
    expect(round({ value: heightDiffIn * 2.54 })).toBe(parseSheetNumber(record.row[14]))
  })
})

describe('sheet fixture: area in dm²', () => {
  it.each(rowCases)('$title', ({ record }) => {
    const { widthIn, heightIn } = getDisplayMetrics(record)
    const areaDm2 = (widthIn * 2.54 * (heightIn * 2.54)) / 100
    expect(round({ value: areaDm2 })).toBe(parseSheetNumber(record.row[15]))
  })
})

describe('sheet fixture: area ratio', () => {
  it.each(rowCases)('$title', ({ record }) => {
    const { areaRatio } = relativeOf(record)
    expect(round({ value: areaRatio * 100 })).toBe(parseSheetNumber(record.row[16]))
  })
})

describe('sheet fixture: raw megapixels', () => {
  it.each(rowCases)('$title', ({ record }) => {
    const { megapixels } = getDisplayMetrics(record)
    expect(round({ value: megapixels, digits: 1 })).toBe(parseSheetNumber(record.row[17]))
  })
})

describe('sheet fixture: megapixel ratio', () => {
  it.each(rowCases)('$title', ({ record }) => {
    const { megapixelRatio } = relativeOf(record)
    expect(round({ value: megapixelRatio * 100 })).toBe(parseSheetNumber(record.row[18]))
  })
})

describe('sheet fixture: aspect label', () => {
  // A MacBook panel near 1.55:1 that the sheet labels as “16:9” (PRD fix: GCD mapping).
  const isMislabelledMacBook = ({ row, width, height }) => {
    const label = cellOf(row, 5)
    const ratio = width / height
    return (
      /[“”]/.test(label) &&
      label.replace(/[\s“”]/g, '') === '16:9' &&
      ratio > 1.5 &&
      ratio < 1.6
    )
  }

  it('finds the four MacBook rows the sheet mislabels as “16:9”', () => {
    expect(records.filter(isMislabelledMacBook)).toHaveLength(4)
  })

  it.each(rowCases)('$title', ({ record }) => {
    const { width, height } = record
    const sheetLabel = cellOf(record.row, 5)
    const aspect = getAspect({ width, height })

    if (isMislabelledMacBook(record)) {
      expect(aspect.isMapped).toBe(false)
      expect(aspect.label).toBe(`${(width / height).toFixed(2)}:1`)
      return
    }

    const quoted = /[“”]/.test(sheetLabel)
    expect(aspect.label).toBe(sheetLabel.replace(/[\s“”]/g, ''))
    expect(aspect.isApprox).toBe(quoted)
    expect(aspect.isMapped).toBe(true)
  })
})

describe('sheet fixture: scaling matrix', () => {
  // Comfort = 90–105 PPI and at least 1024 px wide. A display is comfortable at a scale
  // exactly when the sheet shows a logical resolution for it. Within that, the sheet's
  // "like" PPI and resolution must match.
  const matrixCases = rowCases.flatMap(({ title, record }) =>
    SCALE_COLUMNS.map(({ scale, column }, index) => ({
      title: `${title} @ ${Math.round(scale * 100)} %`,
      record,
      index,
      column,
    })),
  )

  it.each(matrixCases)('$title', ({ record, index, column }) => {
    const matrixRow = matrixByRow.get(record)[index]
    const resolution = cellOf(record.row, column)
    const likePpi = cellOf(record.row, column + 1)

    if (resolution === '') {
      expect(matrixRow.isComfortable).toBe(false)
      return
    }

    expect(matrixRow.isComfortable).toBe(true)
    const logical = `${round({ value: matrixRow.logicalWidth, digits: -1 })} ${TIMES} ${round(
      {
        value: matrixRow.logicalHeight,
        digits: -1,
      },
    )}`
    expect(logical).toBe(resolution)
    expect(round({ value: matrixRow.effectivePpi })).toBe(parseSheetNumber(likePpi))
  })
})
