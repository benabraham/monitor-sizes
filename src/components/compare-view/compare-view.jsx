import { useEffect, useState } from 'preact/hooks'
import { CompareVisual } from '../compare-visual/index.js'
import { CompareManager } from './compare-manager.jsx'
import './compare-view.css'

/**
 * The metric grid and scaling matrix, loaded on first use. Only this view uses them, and
 * they are about 3 kB gzipped, so they stay out of the first download and the 50 kB budget
 * (docs/DEPLOYMENT.md). Renders nothing until the chunk arrives, which is immediate once the
 * app is cached for offline use.
 *
 * @param {object} props
 * @param {object[]} props.entries CompareEntry objects.
 * @param {'metric'|'imperial'} props.units Unit system.
 * @returns {import('preact').JSX.Element|null}
 */
const LazyCompareData = ({ entries, units }) => {
  const [Loaded, setLoaded] = useState(null)

  useEffect(() => {
    let isActive = true
    import('../compare-data/index.js').then(({ CompareData }) => {
      // The function form stores the component, not the result of calling it.
      if (isActive) setLoaded(() => CompareData)
    })
    return () => {
      isActive = false
    }
  }, [])

  return Loaded ? <Loaded entries={entries} units={units} /> : null
}

/**
 * The Compare view (PRD UX "2. Compare"): the visualization with its controls, the
 * membership manager, and the metric grid and scaling matrix.
 *
 * Layout. From 900 px (`md`), the visualization is the left column and stays on screen
 * while the data scrolls on the right. Below that, the two stack, and the visualization
 * is pinned to the top of its block (`CompareVisual`) under the app header, whose
 * height the shell passes in as `--compare-visual-sticky-top`.
 *
 * Every change goes out through a callback. The parent turns each one into a store
 * action. `entries` are CompareEntry objects, baseline first.
 *
 * @param {object} props
 * @param {object[]} [props.entries=[]] CompareEntry objects.
 * @param {'metric'|'imperial'} [props.units='metric'] Unit system.
 * @param {'physical'|'seen'} [props.mode='physical'] Visualization mode.
 * @param {'height'|'width'|'diagonal'} [props.sizeMatchBy='height'] Same-size matching.
 * @param {import('../../lib/storage.js').Display[]} [props.hiddenFamiliar=[]] Hidden familiar displays.
 * @param {import('../../lib/storage.js').Display[]} [props.addable=[]] Displays that can be added.
 * @param {(mode: 'physical'|'seen') => void} [props.onModeChange]
 * @param {(by: 'height'|'width'|'diagonal') => void} [props.onSizeMatchByChange]
 * @param {(payload: { id: string, distance: number }) => void} [props.onDistanceChange]
 * @param {(payload: { id: string, scale: number }) => void} [props.onScaleChange]
 * @param {(payload: { id: string, kind: string }) => void} [props.onApplyEquivalent]
 * @param {(id: string) => void} [props.onToggleCompare] Adds or removes a candidate.
 * @param {(id: string) => void} [props.onToggleFamiliarHidden] Hides or shows a familiar display.
 * @param {() => void} [props.onGoBrowse] Returns to Browse from the empty hint.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CompareView
 *   entries={compareEntries}
 *   units={units}
 *   mode={vizMode}
 *   sizeMatchBy={sizeMatchBy}
 *   onDistanceChange={({ id, distance }) => setCompareSettings({ id, distance })}
 * />
 */
export const CompareView = ({
  entries = [],
  units = 'metric',
  mode = 'physical',
  sizeMatchBy = 'height',
  hiddenFamiliar = [],
  addable = [],
  onModeChange,
  onSizeMatchByChange,
  onDistanceChange,
  onScaleChange,
  onApplyEquivalent,
  onToggleCompare,
  onToggleFamiliarHidden,
  onGoBrowse,
}) => (
  <div class="compare-view">
    <div class="compare-view__visual">
      <CompareVisual
        entries={entries}
        mode={mode}
        units={units}
        sizeMatchBy={sizeMatchBy}
        onModeChange={onModeChange}
        onSizeMatchByChange={onSizeMatchByChange}
        onDistanceChange={onDistanceChange}
        onScaleChange={onScaleChange}
        onApplyEquivalent={onApplyEquivalent}
      />
    </div>

    <div class="compare-view__data">
      <CompareManager
        entries={entries}
        hiddenFamiliar={hiddenFamiliar}
        addable={addable}
        onToggleCompare={onToggleCompare}
        onToggleFamiliarHidden={onToggleFamiliarHidden}
        onGoBrowse={onGoBrowse}
      />
      {entries.length > 0 && <LazyCompareData entries={entries} units={units} />}
    </div>
  </div>
)
