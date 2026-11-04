/**
 * The rows of the metric grid, as data (PRD: F4, F14, F15, Compare metric grid).
 *
 * Each row names its label and help keys (literal keys, so grep finds them), an
 * optional unit that the caller appends to the label, and a `value` function that
 * formats one CompareEntry for the grid. Labels are translated at render time by
 * the component, never here.
 *
 * @module components/compare-data/metric-rows
 */

import {
  formatArea,
  formatAspect,
  formatDegrees,
  formatLength,
  formatNumber,
  formatResolution,
  formatScale,
  formatSignedPercent,
} from '../../lib/format.js'
import { areaUnitLabel, lengthUnitLabel } from '../../lib/units.js'
import {
  NO_VALUE,
  formatDiagonal,
  formatSignedLength,
  lengthDigits,
} from './cell-format.js'
import { workspaceAtScale } from './entries.js'

/**
 * @typedef {object} MetricContext
 * @property {'metric'|'imperial'} units
 * @property {'en'|'cs'} locale
 * @property {string} sameLabel Translated "same".
 */

/**
 * @typedef {object} MetricRow
 * @property {string} id Stable id, used in element ids.
 * @property {string} group Rows of one group sit together; a rule separates groups.
 * @property {string} labelKey Translation key of the row header.
 * @property {string} helpKey Translation key of the help popover text.
 * @property {(ctx: MetricContext) => string | null} unit Unit appended to the label.
 * @property {(params: { entry: object, ctx: MetricContext }) => string} value Formatted cell.
 */

/**
 * The unit of lengths in the active system.
 *
 * @param {MetricContext} ctx
 * @returns {string}
 */
const lengthUnit = ({ units }) => lengthUnitLabel(units)

/**
 * Relative value of a row, or `—` when the entry has no baseline comparison.
 *
 * @param {object} params
 * @param {object} params.entry CompareEntry.
 * @param {(relative: object) => string} params.format Formats the relative metrics.
 * @returns {string}
 */
const relativeValue = ({ entry, format }) =>
  entry.relative ? format(entry.relative) : NO_VALUE

/**
 * Equivalent distance of a row, or `—` for the baseline, which has none.
 *
 * @param {object} params
 * @param {object} params.entry CompareEntry.
 * @param {'sameSize'|'sameSharpness'|'sameTextSize'} params.key
 * @param {MetricContext} params.ctx
 * @returns {string}
 */
const equivalentValue = ({ entry, key, ctx }) => {
  if (!entry.equivalent) return NO_VALUE
  return formatLength({
    inches: entry.equivalent[key],
    units: ctx.units,
    locale: ctx.locale,
    digits: lengthDigits(ctx.units),
  })
}

/**
 * Logical resolution at the entry's scale, rounded to tens (F14 workspace).
 *
 * @param {object} entry CompareEntry.
 * @returns {string}
 */
const logicalResolutionValue = (entry) =>
  formatResolution({
    width: entry.display.width / entry.scale,
    height: entry.display.height / entry.scale,
    roundTo: 10,
  })

/**
 * The metric rows in display order. Groups: size, scale, angle, equivalent distance.
 *
 * @type {ReadonlyArray<MetricRow>}
 */
export const METRIC_ROWS = Object.freeze([
  {
    id: 'diagonal',
    group: 'size',
    labelKey: 'metrics.diagonal.label',
    helpKey: 'metrics.diagonal.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      formatDiagonal({ diagonal: entry.display.diagonal, locale: ctx.locale }),
  },
  {
    id: 'resolution',
    group: 'size',
    labelKey: 'metrics.resolution.label',
    helpKey: 'metrics.resolution.help',
    unit: () => null,
    value: ({ entry }) =>
      formatResolution({ width: entry.display.width, height: entry.display.height }),
  },
  {
    id: 'aspect',
    group: 'size',
    labelKey: 'metrics.aspect.label',
    helpKey: 'metrics.aspect.help',
    unit: () => null,
    value: ({ entry }) => formatAspect(entry.metrics.aspect),
  },
  {
    id: 'ppi',
    group: 'size',
    labelKey: 'metrics.ppi.label',
    helpKey: 'metrics.ppi.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      formatNumber({ value: entry.metrics.ppi, locale: ctx.locale }),
  },
  {
    id: 'relativePixelSize',
    group: 'size',
    labelKey: 'metrics.relativePixelSize.label',
    helpKey: 'metrics.relativePixelSize.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      relativeValue({
        entry,
        format: ({ relativePixelSize }) =>
          formatSignedPercent({
            ratio: relativePixelSize,
            locale: ctx.locale,
            sameLabel: ctx.sameLabel,
          }),
      }),
  },
  {
    id: 'width',
    group: 'size',
    labelKey: 'metrics.width.label',
    helpKey: 'metrics.width.help',
    unit: lengthUnit,
    value: ({ entry, ctx }) =>
      formatLength({
        inches: entry.metrics.widthIn,
        units: ctx.units,
        locale: ctx.locale,
        digits: lengthDigits(ctx.units),
      }),
  },
  {
    id: 'height',
    group: 'size',
    labelKey: 'metrics.height.label',
    helpKey: 'metrics.height.help',
    unit: lengthUnit,
    value: ({ entry, ctx }) =>
      formatLength({
        inches: entry.metrics.heightIn,
        units: ctx.units,
        locale: ctx.locale,
        digits: lengthDigits(ctx.units),
      }),
  },
  {
    id: 'widthDiff',
    group: 'size',
    labelKey: 'metrics.widthDiff.label',
    helpKey: 'metrics.widthDiff.help',
    unit: lengthUnit,
    value: ({ entry, ctx }) =>
      relativeValue({
        entry,
        format: ({ widthDiffIn }) =>
          formatSignedLength({
            inches: widthDiffIn,
            units: ctx.units,
            locale: ctx.locale,
            sameLabel: ctx.sameLabel,
          }),
      }),
  },
  {
    id: 'heightDiff',
    group: 'size',
    labelKey: 'metrics.heightDiff.label',
    helpKey: 'metrics.heightDiff.help',
    unit: lengthUnit,
    value: ({ entry, ctx }) =>
      relativeValue({
        entry,
        format: ({ heightDiffIn }) =>
          formatSignedLength({
            inches: heightDiffIn,
            units: ctx.units,
            locale: ctx.locale,
            sameLabel: ctx.sameLabel,
          }),
      }),
  },
  {
    id: 'area',
    group: 'size',
    labelKey: 'metrics.area.label',
    helpKey: 'metrics.area.help',
    unit: ({ units }) => areaUnitLabel(units),
    value: ({ entry, ctx }) =>
      formatArea({
        squareInches: entry.metrics.areaIn2,
        units: ctx.units,
        locale: ctx.locale,
      }),
  },
  {
    id: 'areaRatio',
    group: 'size',
    labelKey: 'metrics.areaRatio.label',
    helpKey: 'metrics.areaRatio.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      relativeValue({
        entry,
        format: ({ areaRatio }) =>
          formatSignedPercent({
            ratio: areaRatio,
            locale: ctx.locale,
            sameLabel: ctx.sameLabel,
          }),
      }),
  },
  {
    id: 'megapixels',
    group: 'size',
    labelKey: 'metrics.megapixels.label',
    helpKey: 'metrics.megapixels.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      formatNumber({ value: entry.metrics.megapixels, locale: ctx.locale, digits: 1 }),
  },
  {
    id: 'megapixelRatio',
    group: 'size',
    labelKey: 'metrics.megapixelRatio.label',
    helpKey: 'metrics.megapixelRatio.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      relativeValue({
        entry,
        format: ({ megapixelRatio }) =>
          formatSignedPercent({
            ratio: megapixelRatio,
            locale: ctx.locale,
            sameLabel: ctx.sameLabel,
          }),
      }),
  },
  {
    id: 'distance',
    group: 'scale',
    labelKey: 'compareData.rows.distance.label',
    helpKey: 'compareData.rows.distance.help',
    unit: lengthUnit,
    value: ({ entry, ctx }) =>
      formatLength({
        inches: entry.distance,
        units: ctx.units,
        locale: ctx.locale,
        digits: lengthDigits(ctx.units),
      }),
  },
  {
    id: 'scale',
    group: 'scale',
    labelKey: 'compareData.rows.scale.label',
    helpKey: 'compareData.rows.scale.help',
    unit: () => null,
    value: ({ entry, ctx }) => formatScale({ scale: entry.scale, locale: ctx.locale }),
  },
  {
    id: 'logicalResolution',
    group: 'scale',
    labelKey: 'metrics.logicalResolution.label',
    helpKey: 'metrics.logicalResolution.help',
    unit: () => null,
    value: ({ entry }) => logicalResolutionValue(entry),
  },
  {
    id: 'effectivePpi',
    group: 'scale',
    labelKey: 'metrics.effectivePpi.label',
    helpKey: 'metrics.effectivePpi.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      formatNumber({ value: entry.metrics.ppi / entry.scale, locale: ctx.locale }),
  },
  {
    id: 'workspace',
    group: 'scale',
    labelKey: 'metrics.workspace.label',
    helpKey: 'metrics.workspace.help',
    unit: () => 'Mpix',
    value: ({ entry, ctx }) =>
      formatNumber({
        value: workspaceAtScale(entry),
        locale: ctx.locale,
        digits: 1,
      }),
  },
  {
    id: 'horizontalFov',
    group: 'angle',
    labelKey: 'metrics.horizontalFov.label',
    helpKey: 'metrics.horizontalFov.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      formatDegrees({ value: entry.angular?.horizontalFov, locale: ctx.locale }),
  },
  {
    id: 'verticalFov',
    group: 'angle',
    labelKey: 'metrics.verticalFov.label',
    helpKey: 'metrics.verticalFov.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      formatDegrees({ value: entry.angular?.verticalFov, locale: ctx.locale }),
  },
  {
    id: 'ppd',
    group: 'angle',
    labelKey: 'metrics.ppd.label',
    helpKey: 'metrics.ppd.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      formatNumber({ value: entry.angular?.ppd, locale: ctx.locale }),
  },
  {
    id: 'logicalPpd',
    group: 'angle',
    labelKey: 'metrics.logicalPpd.label',
    helpKey: 'metrics.logicalPpd.help',
    unit: () => null,
    value: ({ entry, ctx }) =>
      formatNumber({ value: entry.angular?.logicalPpd, locale: ctx.locale }),
  },
  {
    id: 'sameSize',
    group: 'equivalent',
    labelKey: 'metrics.sameSize.label',
    helpKey: 'metrics.sameSize.help',
    unit: lengthUnit,
    value: ({ entry, ctx }) => equivalentValue({ entry, key: 'sameSize', ctx }),
  },
  {
    id: 'sameSharpness',
    group: 'equivalent',
    labelKey: 'metrics.sameSharpness.label',
    helpKey: 'metrics.sameSharpness.help',
    unit: lengthUnit,
    value: ({ entry, ctx }) => equivalentValue({ entry, key: 'sameSharpness', ctx }),
  },
  {
    id: 'sameTextSize',
    group: 'equivalent',
    labelKey: 'metrics.sameTextSize.label',
    helpKey: 'metrics.sameTextSize.help',
    unit: lengthUnit,
    value: ({ entry, ctx }) => equivalentValue({ entry, key: 'sameTextSize', ctx }),
  },
])
