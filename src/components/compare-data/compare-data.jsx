import { t } from '../../i18n/index.js'
import { MetricGrid } from './metric-grid.jsx'
import { ScalingMatrix } from './scaling-matrix.jsx'
import './compare-data.css'

/**
 * The data part of the Compare view: the metric grid and the full scaling matrix,
 * each under its own heading (PRD UX "2. Compare", bullets 4 and 5).
 *
 * The visualization and the distance and scale controls are other components. This
 * one only shows numbers. It passes `entries` in as they are; `MetricGrid` and
 * `ScalingMatrix` put the baseline first.
 *
 * @param {object} props
 * @param {Array<object>} props.entries CompareEntry objects.
 * @param {'metric'|'imperial'} props.units Unit system.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CompareData entries={compareEntries.value} units={units.value} />
 */
export const CompareData = ({ entries, units }) => (
  <div class="compare-data">
    <section class="compare-data__section" aria-labelledby="compare-data-metrics-heading">
      <h2 id="compare-data-metrics-heading" class="compare-data__heading">
        {t('compareData.sections.metrics')}
      </h2>
      <MetricGrid entries={entries} units={units} />
    </section>
    <section class="compare-data__section" aria-labelledby="compare-data-scaling-heading">
      <h2 id="compare-data-scaling-heading" class="compare-data__heading">
        {t('compareData.sections.scaling')}
      </h2>
      <ScalingMatrix entries={entries} units={units} />
    </section>
  </div>
)
