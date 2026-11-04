import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { locale, t } from '../../i18n/index.js'
import { Button } from '../ui/button/button.jsx'
import { OnboardingPicker } from './onboarding-picker.jsx'
import { OnboardingSetup } from './onboarding-setup.jsx'
import './onboarding.css'

/** Number of steps shown in the progress line. */
const TOTAL_STEPS = 2

/**
 * First-run onboarding, full page, no way to skip (PRD F2, UX "Onboarding").
 *
 * - Step 1 asks which displays the person knows. Nothing is preselected. At least
 *   one must be picked before "Continue" is enabled. A display that is missing can be
 *   added inline, and it is selected at once.
 * - Step 2 asks how far away each picked display is used and at which scale. Values
 *   are prefilled from `getDefaults`. The first display picked is the baseline (F3).
 * - Finish calls `onComplete` with the familiar set in pick order.
 *
 * Headings take focus on each step change. Each step has its own heading, progress
 * line and actions. The component holds no persistent state of its own: the parent
 * stores the result from `onComplete`.
 *
 * @param {object} props
 * @param {Array<{ id: string, name: string, diagonal: number, width: number, height: number, tag?: string }>} props.displays
 *   Built-in and custom displays to choose from.
 * @param {'metric'|'imperial'} props.units Active unit system.
 * @param {(units: 'metric'|'imperial') => void} props.onUnitsChange Called when the unit switch changes.
 * @param {(display: object) => Array<{ scale: number }>} props.scaleOptionsFor Scale options for a display.
 * @param {(display: object) => { distance: number, scale: number }} props.getDefaults
 *   Prefill for a picked display: `distance` in inches, `scale` as a factor.
 * @param {(payload: object) => object} props.onAddCustom
 *   Adds a display from the inline form and returns it synchronously. It should add
 *   the display as a custom one, not mark it familiar: onboarding marks familiar
 *   displays on Finish.
 * @param {(result: { familiar: Array<{ id: string, distance: number, scale: number }> }) => void} props.onComplete
 *   Called on Finish with the familiar set in pick order.
 * @param {() => ({ width: number, height: number, scale: number } | null)} [props.guess]
 *   Screen reader for the inline form's "Like my screen" (tests inject one).
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <Onboarding
 *   displays={allDisplays}
 *   units={units}
 *   onUnitsChange={setUnits}
 *   scaleOptionsFor={scaleOptionsFor}
 *   getDefaults={(display) => ({ distance: defaultDistanceFor(display), scale: bestScale(display) })}
 *   onAddCustom={addCustomDisplay}
 *   onComplete={({ familiar }) => completeOnboarding(familiar)}
 * />
 */
export const Onboarding = ({
  displays,
  units,
  onUnitsChange,
  scaleOptionsFor,
  getDefaults,
  onAddCustom,
  onComplete,
  guess,
}) => {
  const [step, setStep] = useState(1)
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [addedDisplays, setAddedDisplays] = useState([])
  const [isAddingOwn, setAddingOwn] = useState(false)
  const headingRef = useRef(null)
  const isFirstStep = useRef(true)

  const displayById = useMemo(
    () =>
      new Map([...displays, ...addedDisplays].map((display) => [display.id, display])),
    [displays, addedDisplays],
  )
  const allDisplays = Array.from(displayById.values())
  const hasSelection = rows.length > 0

  useEffect(() => {
    if (isFirstStep.current) {
      isFirstStep.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  /**
   * Pick or unpick a display. A pick adds a row with its prefilled values at the
   * end, so the first pick stays the baseline.
   *
   * @param {object} display
   */
  const togglePick = (display) => {
    setRows((current) => {
      if (current.some(({ id }) => id === display.id)) {
        return current.filter(({ id }) => id !== display.id)
      }
      const defaults = getDefaults(display)
      return [
        ...current,
        { id: display.id, distance: defaults.distance, scale: defaults.scale },
      ]
    })
  }

  /**
   * Change one field of a row.
   *
   * @param {string} id
   * @param {{ distance?: number, scale?: number }} patch
   */
  const changeRow = (id, patch) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  /**
   * Add a display from the inline form. The new display is listed and selected at
   * once, with its prefilled values.
   *
   * @param {object} payload Form payload.
   */
  const handleAddOwnSubmit = (payload) => {
    const display = onAddCustom(payload)
    if (!display) return
    setAddedDisplays((current) =>
      current.some(({ id }) => id === display.id) ? current : [...current, display],
    )
    const defaults = getDefaults(display)
    setRows((current) =>
      current.some(({ id }) => id === display.id)
        ? current
        : [
            ...current,
            { id: display.id, distance: defaults.distance, scale: defaults.scale },
          ],
    )
    setAddingOwn(false)
  }

  /** Finish: report the familiar set in pick order. */
  const handleFinish = () => {
    if (!hasSelection) return
    onComplete({
      familiar: rows.map(({ id, distance, scale }) => ({ id, distance, scale })),
    })
  }

  const title = t(step === 1 ? 'onboarding.step1Title' : 'onboarding.step2Title')

  return (
    <main class="onboarding">
      <header class="onboarding__header">
        <p class="onboarding__progress">
          {t('onboarding.stepOf', { step, total: TOTAL_STEPS })}
        </p>
        <h1 class="onboarding__title" ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
      </header>

      {step === 1 && (
        <OnboardingPicker
          displays={allDisplays}
          units={units}
          onUnitsChange={onUnitsChange}
          query={query}
          onQueryChange={setQuery}
          selectedIds={rows.map(({ id }) => id)}
          onTogglePick={togglePick}
          isAddingOwn={isAddingOwn}
          onOpenAddOwn={() => setAddingOwn(true)}
          onCloseAddOwn={() => setAddingOwn(false)}
          onAddOwnSubmit={handleAddOwnSubmit}
          scaleOptionsFor={scaleOptionsFor}
          guess={guess}
        />
      )}

      {step === 2 && (
        <OnboardingSetup
          rows={rows}
          displayById={displayById}
          units={units}
          scaleOptionsFor={scaleOptionsFor}
          onChangeRow={changeRow}
        />
      )}

      <footer class="onboarding__actions">
        {step === 1 && (
          <>
            {!hasSelection && (
              <p id="onboarding-pick-hint" class="onboarding__hint" role="status">
                {t('onboarding.pickAtLeastOne')}
              </p>
            )}
            <Button
              variant="primary"
              disabled={!hasSelection}
              aria-describedby={hasSelection ? undefined : 'onboarding-pick-hint'}
              onClick={() => setStep(2)}
            >
              {t('onboarding.continue')}
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button variant="secondary" onClick={() => setStep(1)}>
              {t('onboarding.back')}
            </Button>
            <Button variant="primary" disabled={!hasSelection} onClick={handleFinish}>
              {t('onboarding.finish')}
            </Button>
          </>
        )}
      </footer>
    </main>
  )
}
