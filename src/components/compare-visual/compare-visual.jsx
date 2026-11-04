import { locale, t } from '../../i18n/index.js'
import { Segmented } from '../ui/index.js'
import { DistanceControl } from './distance-control.jsx'
import { EquivalenceLine } from './equivalence-line.jsx'
import { Visualization, VisualizationSizes } from './visualization.jsx'
import './compare-visual.css'

/**
 * The visual part of Compare (PRD UX "Compare", F10–F15): the always-visible
 * {@link Visualization} pinned at the top, then its text sizes ({@link VisualizationSizes}),
 * the size-matching choice, and one {@link DistanceControl} with its
 * {@link EquivalenceLine} per compared display. Only the drawing is pinned, so the text
 * and the controls scroll under it.
 *
 * The pinned block is sticky. The integrator can set `--compare-visual-sticky-top`
 * on an ancestor to the height of the app header, so the drawing does not go under
 * it. Every callback receives an object with the display `id`, so the caller can
 * update the right entry (RORO).
 *
 * @param {object} props
 * @param {object[]} [props.entries=[]] CompareEntry objects, baseline included, in display order.
 * @param {'physical'|'seen'} [props.mode='physical'] Drawing mode.
 * @param {'metric'|'imperial'} [props.units='metric'] Unit system.
 * @param {'height'|'width'|'diagonal'} [props.sizeMatchBy='height'] Size used for same-size distances.
 * @param {Record<string, object[]>} [props.scaleOptionsById={}] Scale rows by display id.
 *   Falls back to each entry's `matrix`.
 * @param {(mode: 'physical'|'seen') => void} [props.onModeChange]
 * @param {(payload: { id: string, distance: number }) => void} [props.onDistanceChange]
 *   `distance` is in inches.
 * @param {(payload: { id: string, scale: number }) => void} [props.onScaleChange]
 * @param {(payload: { id: string, kind: 'sameSize'|'sameSharpness'|'sameTextSize' }) => void} [props.onApplyEquivalent]
 * @param {(sizeMatchBy: 'height'|'width'|'diagonal') => void} [props.onSizeMatchByChange]
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CompareVisual
 *   entries={compareEntries}
 *   mode={vizMode}
 *   units={units}
 *   sizeMatchBy={sizeMatchBy}
 *   scaleOptionsById={scaleOptionsById}
 *   onModeChange={setVizMode}
 *   onDistanceChange={({ id, distance }) => setDistance(id, distance)}
 *   onScaleChange={({ id, scale }) => setScale(id, scale)}
 *   onApplyEquivalent={({ id, kind }) => applyEquivalent(id, kind)}
 *   onSizeMatchByChange={setSizeMatchBy}
 * />
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
}) => {
  const baseline = entries.find((entry) => entry.isBaseline) ?? null

  return (
    <div class="compare-visual">
      <div class="compare-visual__pinned">
        <Visualization
          entries={entries}
          mode={mode}
          units={units}
          sizeMatchBy={sizeMatchBy}
          onModeChange={onModeChange}
        />
      </div>

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
    </div>
  )
}
