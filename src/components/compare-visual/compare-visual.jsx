import { locale, t } from '../../i18n/index.js'
import { Segmented } from '../ui/index.js'
import { DistanceControl } from './distance-control.jsx'
import { EquivalenceLine } from './equivalence-line.jsx'
import { Visualization, VisualizationSizes } from './visualization.jsx'
import './compare-visual.css'

/**
 * The preview of Compare (PRD F10–F12): the {@link Visualization}, with its drawing mode
 * switch and its drawing. The Compare view makes it the full width of the view, sticky under
 * the app header, and caps its height at 60 % of the viewport.
 *
 * @param {object} props
 * @param {object[]} [props.entries=[]] CompareEntry objects, baseline included, in display order.
 * @param {'physical'|'seen'} [props.mode='physical'] Drawing mode.
 * @param {'metric'|'imperial'} [props.units='metric'] Unit system.
 * @param {'height'|'width'|'diagonal'} [props.sizeMatchBy='height'] Size used for same-size distances.
 * @param {(mode: 'physical'|'seen') => void} [props.onModeChange]
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CompareVisualPreview entries={compareEntries} mode={vizMode} onModeChange={setVizMode} />
 */
export const CompareVisualPreview = ({
  entries = [],
  mode = 'physical',
  units = 'metric',
  sizeMatchBy = 'height',
  onModeChange,
}) => (
  <div class="compare-visual__preview">
    <Visualization
      entries={entries}
      mode={mode}
      units={units}
      sizeMatchBy={sizeMatchBy}
      onModeChange={onModeChange}
    />
  </div>
)

/**
 * The controls of Compare (PRD F13–F15): the text sizes ({@link VisualizationSizes}), the
 * size-matching choice, and one {@link DistanceControl} with its {@link EquivalenceLine} per
 * compared display. Every callback receives an object with the display `id`, so the caller
 * can update the right entry (RORO).
 *
 * @param {object} props
 * @param {object[]} [props.entries=[]] CompareEntry objects, baseline included, in display order.
 * @param {'physical'|'seen'} [props.mode='physical'] Mode, which picks the size text.
 * @param {'metric'|'imperial'} [props.units='metric'] Unit system.
 * @param {'height'|'width'|'diagonal'} [props.sizeMatchBy='height'] Size used for same-size distances.
 * @param {Record<string, object[]>} [props.scaleOptionsById={}] Scale rows by display id.
 *   Falls back to each entry's `matrix`.
 * @param {(payload: { id: string, distance: number }) => void} [props.onDistanceChange]
 *   `distance` is in inches.
 * @param {(payload: { id: string, scale: number }) => void} [props.onScaleChange]
 * @param {(payload: { id: string, kind: 'sameSize'|'sameSharpness'|'sameTextSize' }) => void} [props.onApplyEquivalent]
 * @param {(sizeMatchBy: 'height'|'width'|'diagonal') => void} [props.onSizeMatchByChange]
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CompareVisualControls
 *   entries={compareEntries}
 *   onDistanceChange={({ id, distance }) => setDistance(id, distance)}
 * />
 */
export const CompareVisualControls = ({
  entries = [],
  mode = 'physical',
  units = 'metric',
  sizeMatchBy = 'height',
  scaleOptionsById = {},
  onDistanceChange,
  onScaleChange,
  onApplyEquivalent,
  onSizeMatchByChange,
}) => {
  const baseline = entries.find((entry) => entry.isBaseline) ?? null

  return (
    <div class="compare-visual__controls">
      <VisualizationSizes entries={entries} mode={mode} units={units} />

      <Segmented
        name="compare-visual-size-match"
        label={t('compareVisual.sizeBy.label')}
        options={[
          { value: 'height', label: t('compareVisual.sizeBy.option.height') },
          { value: 'width', label: t('compareVisual.sizeBy.option.width') },
          { value: 'diagonal', label: t('compareVisual.sizeBy.option.diagonal') },
        ]}
        value={sizeMatchBy}
        onChange={onSizeMatchByChange}
      />

      <ul class="compare-visual__list" aria-label={t('compareVisual.list.label')}>
        {entries.map((entry) => {
          const id = entry.display.id
          return (
            <li class="compare-visual__item" key={id}>
              <DistanceControl
                entry={entry}
                units={units}
                scaleOptions={scaleOptionsById?.[id] ?? entry.matrix ?? []}
                onDistanceChange={(distance) => onDistanceChange?.({ id, distance })}
                onScaleChange={(scale) => onScaleChange?.({ id, scale })}
                onApplyEquivalent={(kind) => onApplyEquivalent?.({ id, kind })}
              />
              <EquivalenceLine entry={entry} baseline={baseline} units={units} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * The visual part of Compare: {@link CompareVisualPreview} followed by
 * {@link CompareVisualControls}, as two sibling blocks. The Compare view places them itself,
 * so this wrapper is for callers that want both in one place.
 *
 * @param {object} props All the props of both blocks.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CompareVisual entries={compareEntries} mode={vizMode} units={units} />
 */
export const CompareVisual = ({
  entries = [],
  mode = 'physical',
  units = 'metric',
  sizeMatchBy = 'height',
  scaleOptionsById = {},
  onModeChange,
  onDistanceChange,
  onScaleChange,
  onApplyEquivalent,
  onSizeMatchByChange,
}) => (
  <>
    <CompareVisualPreview
      entries={entries}
      mode={mode}
      units={units}
      sizeMatchBy={sizeMatchBy}
      onModeChange={onModeChange}
    />
    <CompareVisualControls
      entries={entries}
      mode={mode}
      units={units}
      sizeMatchBy={sizeMatchBy}
      scaleOptionsById={scaleOptionsById}
      onDistanceChange={onDistanceChange}
      onScaleChange={onScaleChange}
      onApplyEquivalent={onApplyEquivalent}
      onSizeMatchByChange={onSizeMatchByChange}
    />
  </>
)
