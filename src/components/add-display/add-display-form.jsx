import { useEffect, useRef, useState } from 'preact/hooks'
import { locale, t } from '../../i18n/index.js'
import {
  formatAspect,
  formatLength,
  formatNumber,
  formatResolution,
  formatScale,
} from '../../lib/format.js'
import { guessScreen } from '../../lib/screen-guess.js'
import {
  cmToIn,
  defaultDistanceFor,
  fromDisplayLength,
  toDisplayLength,
} from '../../lib/units.js'
import { Button } from '../ui/button/button.jsx'
import { Chip } from '../ui/chip/chip.jsx'
import { NumberField } from '../ui/number-field/number-field.jsx'
import { Segmented } from '../ui/segmented/segmented.jsx'
import {
  buildPayload,
  DIAGONAL_RANGE,
  DISTANCE_RANGE_CM,
  getDefaultScale,
  getPreview,
  isMeasurable,
  PIXEL_RANGE,
  RESOLUTION_PRESETS,
  suggestTag,
  validateDraft,
} from './add-display-model.js'
import './add-display-form.css'

/** Counter for unique element ids, one per mounted form. */
let formSequence = 0

/** Order in which invalid fields receive focus after a failed submit. */
const FIELD_ORDER = ['name', 'diagonal', 'width', 'height', 'distance']

/**
 * Turn the initial value of a field into the draft value. Empty numbers become NaN.
 *
 * @param {number|undefined} value
 * @returns {number}
 */
const numberOrNaN = (value) => (Number.isFinite(value) ? value : Number.NaN)

/**
 * Build the form's starting draft from the optional `initial` record.
 *
 * @param {object} [initial] Existing display or a partial record (see AddDisplayForm).
 * @returns {import('./add-display-model.js').FormDraft}
 */
const createDraft = (initial) => ({
  name: initial?.name ?? '',
  diagonal: numberOrNaN(initial?.diagonal),
  width: numberOrNaN(initial?.width),
  height: numberOrNaN(initial?.height),
  tag: initial?.tag ?? null,
  isFamiliar: initial?.isFamiliar === true,
  distance: Number.isFinite(initial?.distance) ? initial.distance : null,
  scale: Number.isFinite(initial?.scale) ? initial.scale : null,
})

/**
 * Error text for a field, translated. Limits are formatted for display here.
 *
 * @param {object} params
 * @param {string} params.field Field name.
 * @param {'required'|'range'} params.code Error code from validateDraft.
 * @param {'metric'|'imperial'} params.units Unit system for the distance limits.
 * @param {'en'|'cs'} params.lang Locale for number formatting.
 * @returns {string}
 */
const errorMessage = ({ field, code, units, lang }) => {
  if (field === 'name') return t('addDisplay.error.nameRequired')
  if (field === 'diagonal') {
    if (code === 'required') return t('addDisplay.error.diagonalRequired')
    return t('addDisplay.error.diagonalRange', {
      min: `${DIAGONAL_RANGE.min}″`,
      max: `${DIAGONAL_RANGE.max}″`,
    })
  }
  if (field === 'distance') {
    if (code === 'required') return t('addDisplay.error.distanceRequired')
    return t('addDisplay.error.distanceRange', {
      min: formatLength({ inches: cmToIn(DISTANCE_RANGE_CM.min), units, locale: lang }),
      max: formatLength({ inches: cmToIn(DISTANCE_RANGE_CM.max), units, locale: lang }),
    })
  }
  if (code === 'required') return t('addDisplay.error.pixelsRequired')
  return t('addDisplay.error.pixelsRange', {
    min: formatNumber({ value: PIXEL_RANGE.min, locale: lang }),
    max: formatNumber({ value: PIXEL_RANGE.max, locale: lang }),
  })
}

/**
 * Form for a display's four inputs (name, diagonal, width, height), with a live
 * preview, resolution presets, a type, and the optional "I know this one" section
 * (distance and scale). Used in the Add and Edit dialog and inline in onboarding.
 *
 * Validation runs on each field once it has been changed, and for every field after
 * a submit attempt. Submit stays disabled until the form is valid. Enter submits
 * from any field. Errors are announced: each invalid field gets `aria-invalid` and
 * an error text linked with `aria-describedby`.
 *
 * "Like my screen" (F22) appears only when `guess()` returns a size. It fills the
 * native resolution and the scale from the browser and moves focus to the diagonal.
 *
 * The form reports inches. The distance is converted from the active unit system
 * on the way out, so a metric and an imperial person submit the same payload.
 *
 * @param {object} props
 * @param {object} [props.initial] Starting values. `isEditing: true` hides the
 *   familiar option and the screen helper and keeps the given tag and scale.
 *   Fields: `name`, `diagonal` (in), `width`, `height` (px), `tag`, `isFamiliar`,
 *   `distance` (in), `scale`.
 * @param {'metric'|'imperial'} props.units Unit system for the distance field.
 * @param {(display: object) => Array<{ scale: number }>} props.scaleOptionsFor
 *   Scale options for a display (for example `getScaleOptions` for the active
 *   preset). Called with `{ name, diagonal, width, height, tag }`.
 * @param {(payload: import('./add-display-model.js').AddDisplayPayload) => void} props.onSubmit
 *   Called with a valid payload. `distance` is in inches. `tag` is resolved (the
 *   suggestion when the person did not pick one), and `scale` is the effective scale.
 * @param {() => void} [props.onCancel] Shows a Cancel button when given.
 * @param {string} [props.submitLabel] Submit button text. Defaults to "Add display",
 *   or "Save" when editing.
 * @param {boolean} [props.canMarkFamiliar=true] Whether the "I know this one"
 *   option is offered. Onboarding turns it off, since it asks for distance and scale
 *   itself.
 * @param {() => ({ width: number, height: number, scale: number } | null)} [props.guess=guessScreen]
 *   Reads the screen for "Like my screen" (see `lib/screen-guess.js`). Injected for tests.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <AddDisplayForm
 *   units="metric"
 *   scaleOptionsFor={(display) => getScaleOptions({ display, presetId, customScales })}
 *   onSubmit={(payload) => addCustomDisplay(payload)}
 *   onCancel={() => setOpen(false)}
 * />
 */
export const AddDisplayForm = ({
  initial,
  units,
  scaleOptionsFor,
  onSubmit,
  onCancel,
  submitLabel,
  canMarkFamiliar = true,
  guess = guessScreen,
}) => {
  const isEditing = initial?.isEditing === true
  const lang = locale.value

  const [formId] = useState(() => `add-display-${++formSequence}`)
  const [draft, setDraft] = useState(() => createDraft(initial))
  const [touched, setTouched] = useState({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isLikeScreenApplied, setIsLikeScreenApplied] = useState(false)
  const [screenGuess] = useState(() => (isEditing ? null : guess()))

  const formRef = useRef(null)
  const nameRef = useRef(null)
  const fieldRefs = useRef({})
  const tagOptions = [
    { value: 'laptop', label: t('addDisplay.tagLaptop') },
    { value: 'monitor', label: t('addDisplay.tagMonitor') },
    { value: 'ultrawide', label: t('addDisplay.tagUltrawide') },
  ]

  /**
   * Merge a partial update into the draft.
   *
   * @param {Partial<import('./add-display-model.js').FormDraft>} patch
   */
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }))

  /**
   * Mark a field as changed, so its error can show.
   *
   * @param {string} field
   */
  const markTouched = (field) =>
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }))

  const tag = draft.tag ?? suggestTag(draft)
  const display = {
    name: draft.name.trim(),
    diagonal: draft.diagonal,
    width: draft.width,
    height: draft.height,
    tag,
  }
  const isReady = isMeasurable(draft)
  const scaleOptions = isReady ? scaleOptionsFor(display) : []
  const choices = scaleOptions.length > 0 ? scaleOptions : [{ scale: 1 }]
  const defaultScale = getDefaultScale({ display: draft, scaleOptions })
  const effectiveScale = draft.scale ?? defaultScale
  const scaleChoices = choices.some(({ scale }) => scale === effectiveScale)
    ? choices
    : [...choices, { scale: effectiveScale }].sort((a, b) => a.scale - b.scale)
  const effectiveDistance = draft.distance ?? defaultDistanceFor({ tag })

  const { errors, isValid } = validateDraft({
    values: {
      name: draft.name,
      diagonal: draft.diagonal,
      width: draft.width,
      height: draft.height,
      distance: effectiveDistance,
      isFamiliar: canMarkFamiliar && draft.isFamiliar,
    },
  })

  /**
   * Error code to show for a field: only after the field was changed or the
   * form was submitted once.
   *
   * @param {string} field
   * @returns {string|undefined}
   */
  const visibleError = (field) =>
    (touched[field] || hasAttemptedSubmit) && errors[field] ? errors[field] : undefined

  const errorId = (field) => `${formId}-${field}-error`
  const fieldId = (field) => `${formId}-${field}`
  const preview = getPreview(draft)

  /**
   * Move focus to a field, in the order the form presents them.
   *
   * @param {string} field
   */
  const focusField = (field) => {
    if (field === 'name') {
      nameRef.current?.focus()
      return
    }
    fieldRefs.current[field]?.querySelector('input')?.focus()
  }

  /**
   * Error props for a NumberField: invalid state, and the error text it points to.
   *
   * @param {string} field
   * @returns {{ isInvalid: boolean, describedBy: string|undefined }}
   */
  const errorProps = (field) => {
    const hasError = Boolean(visibleError(field))
    return {
      isInvalid: hasError,
      describedBy: hasError ? errorId(field) : undefined,
    }
  }

  // Focus the name on mount. Deferred, so a dialog that opens in the same pass is
  // already open when the focus lands.
  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [])

  /**
   * Submit. An invalid form shows every error and focuses the first bad field.
   *
   * @param {Event} event
   */
  const handleSubmit = (event) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)
    if (!isValid) {
      const firstInvalid = FIELD_ORDER.find((field) => errors[field])
      if (firstInvalid) focusField(firstInvalid)
      return
    }
    onSubmit?.(buildPayload({ draft, scale: effectiveScale }))
  }

  /**
   * Enter in a text or number field submits the form. The default action is
   * cancelled, so the browser does not submit a stale form on its own. Number
   * fields commit their value on Enter first, and that state update renders in
   * a microtask. The submit is queued after it, so it sees the committed value.
   *
   * @param {KeyboardEvent} event
   */
  const handleKeyDown = (event) => {
    const isTextInput =
      event.target instanceof HTMLInputElement && event.target.type !== 'checkbox'
    if (event.key !== 'Enter' || !isTextInput) return
    event.preventDefault()
    queueMicrotask(() => formRef.current?.requestSubmit())
  }

  /**
   * "Like my screen": fill the native resolution and the scale from the browser,
   * then move focus to the diagonal (F22).
   */
  const handleLikeScreen = () => {
    if (!screenGuess) return
    update({
      width: screenGuess.width,
      height: screenGuess.height,
      scale: screenGuess.scale,
    })
    setIsLikeScreenApplied(true)
    fieldRefs.current.diagonal?.querySelector('input')?.focus()
  }

  /**
   * Apply a resolution preset to width and height.
   *
   * @param {{ width: number, height: number }} preset
   */
  const applyPreset = (preset) => {
    update({ width: preset.width, height: preset.height })
    markTouched('width')
    markTouched('height')
  }

  const hasDiagonal = Number.isFinite(draft.diagonal)
  const showLikeScreenNote = isLikeScreenApplied && !hasDiagonal
  const showPreview = preview !== null
  const submitText = submitLabel ?? t(isEditing ? 'common.save' : 'common.addDisplay')
  const showFamiliarOptions = canMarkFamiliar && !isEditing
  const digits = units === 'imperial' ? 1 : 0

  return (
    <form
      ref={formRef}
      class="add-display-form"
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <div class="add-display-form__field">
        <label class="add-display-form__label" for={fieldId('name')}>
          {t('addDisplay.name')}
        </label>
        <input
          id={fieldId('name')}
          ref={nameRef}
          class="add-display-form__input"
          type="text"
          autoComplete="off"
          spellcheck={false}
          value={draft.name}
          aria-invalid={visibleError('name') ? 'true' : undefined}
          aria-describedby={visibleError('name') ? errorId('name') : undefined}
          onInput={(event) => update({ name: event.currentTarget.value })}
          onBlur={() => markTouched('name')}
        />
        {visibleError('name') && (
          <p id={errorId('name')} class="add-display-form__error">
            {errorMessage({ field: 'name', code: errors.name, units, lang })}
          </p>
        )}
      </div>

      <div class="add-display-form__sizes">
        <div
          class="add-display-form__field"
          ref={(element) => {
            fieldRefs.current.diagonal = element
          }}
        >
          <NumberField
            label={t('addDisplay.diagonal')}
            value={draft.diagonal}
            unit="″"
            decimals={1}
            locale={lang}
            {...errorProps('diagonal')}
            onChange={(value) => {
              update({ diagonal: value })
              markTouched('diagonal')
            }}
          />
          {visibleError('diagonal') && (
            <p id={errorId('diagonal')} class="add-display-form__error">
              {errorMessage({ field: 'diagonal', code: errors.diagonal, units, lang })}
            </p>
          )}
        </div>

        <div
          class="add-display-form__field"
          ref={(element) => {
            fieldRefs.current.width = element
          }}
        >
          <NumberField
            label={t('addDisplay.width')}
            value={draft.width}
            unit="px"
            decimals={0}
            locale={lang}
            inputMode="numeric"
            {...errorProps('width')}
            onChange={(value) => {
              update({ width: value })
              markTouched('width')
            }}
          />
          {visibleError('width') && (
            <p id={errorId('width')} class="add-display-form__error">
              {errorMessage({ field: 'width', code: errors.width, units, lang })}
            </p>
          )}
        </div>

        <div
          class="add-display-form__field"
          ref={(element) => {
            fieldRefs.current.height = element
          }}
        >
          <NumberField
            label={t('addDisplay.height')}
            value={draft.height}
            unit="px"
            decimals={0}
            locale={lang}
            inputMode="numeric"
            {...errorProps('height')}
            onChange={(value) => {
              update({ height: value })
              markTouched('height')
            }}
          />
          {visibleError('height') && (
            <p id={errorId('height')} class="add-display-form__error">
              {errorMessage({ field: 'height', code: errors.height, units, lang })}
            </p>
          )}
        </div>
      </div>

      {screenGuess && (
        <div class="add-display-form__like-screen">
          <Button variant="secondary" size="sm" icon="monitor" onClick={handleLikeScreen}>
            {t('addDisplay.likeScreen')}
          </Button>
          <p class="add-display-form__hint">{t('addDisplay.likeScreenHint')}</p>
          {showLikeScreenNote && (
            <p class="add-display-form__note" role="status">
              {t('addDisplay.likeScreenNote')}
            </p>
          )}
        </div>
      )}

      <div
        class="add-display-form__presets"
        role="group"
        aria-label={t('addDisplay.presets')}
      >
        {RESOLUTION_PRESETS.map((preset) => (
          <Chip
            key={`${preset.width}x${preset.height}`}
            isSelected={draft.width === preset.width && draft.height === preset.height}
            onClick={() => applyPreset(preset)}
          >
            {formatResolution({ width: preset.width, height: preset.height })}
          </Chip>
        ))}
      </div>

      <section class="add-display-form__preview" aria-labelledby={`${formId}-preview`}>
        <h3 id={`${formId}-preview`} class="add-display-form__subtitle">
          {t('addDisplay.preview.title')}
        </h3>
        <div class="add-display-form__preview-body" aria-live="polite">
          {showPreview ? (
            <dl class="add-display-form__stats">
              <div>
                <dt>{t('metrics.ppi.label')}</dt>
                <dd class="numeric">
                  {formatNumber({ value: preview.ppi, locale: lang })}
                </dd>
              </div>
              <div>
                <dt>{t('metrics.aspect.label')}</dt>
                <dd class="numeric">{formatAspect(preview.aspect)}</dd>
              </div>
              <div>
                <dt>{t('addDisplay.preview.size')}</dt>
                <dd class="numeric">
                  {formatLength({ inches: preview.widthIn, units, locale: lang, digits })}{' '}
                  ×{' '}
                  {formatLength({
                    inches: preview.heightIn,
                    units,
                    locale: lang,
                    digits,
                  })}
                </dd>
              </div>
              <div>
                <dt>{t('metrics.diagonal.label')}</dt>
                <dd class="numeric">
                  {formatLength({
                    inches: preview.diagonalIn,
                    units: 'metric',
                    locale: lang,
                  })}
                </dd>
              </div>
            </dl>
          ) : (
            <p class="add-display-form__hint">{t('addDisplay.preview.empty')}</p>
          )}
        </div>
      </section>

      <div class="add-display-form__tag">
        <Segmented
          name={`${formId}-tag`}
          label={t('addDisplay.tag')}
          options={tagOptions}
          value={tag}
          onChange={(value) => update({ tag: value })}
        />
        {draft.tag === null && isReady && (
          <p class="add-display-form__hint">{t('addDisplay.tagSuggested')}</p>
        )}
      </div>

      {showFamiliarOptions && (
        <div class="add-display-form__familiar">
          <label class="add-display-form__check">
            <input
              type="checkbox"
              checked={draft.isFamiliar}
              onChange={(event) => update({ isFamiliar: event.currentTarget.checked })}
            />
            <span>{t('addDisplay.isFamiliar')}</span>
          </label>
          <p class="add-display-form__hint">{t('addDisplay.isFamiliarHint')}</p>

          {draft.isFamiliar && (
            <div class="add-display-form__familiar-fields">
              <div
                class="add-display-form__field"
                ref={(element) => {
                  fieldRefs.current.distance = element
                }}
              >
                <NumberField
                  label={t('common.distance')}
                  value={toDisplayLength({ inches: effectiveDistance, units })}
                  unit={units === 'imperial' ? 'in' : 'cm'}
                  decimals={digits}
                  locale={lang}
                  {...errorProps('distance')}
                  onChange={(value) => {
                    update({ distance: fromDisplayLength({ value, units }) })
                    markTouched('distance')
                  }}
                />
                {visibleError('distance') && (
                  <p id={errorId('distance')} class="add-display-form__error">
                    {errorMessage({
                      field: 'distance',
                      code: errors.distance,
                      units,
                      lang,
                    })}
                  </p>
                )}
              </div>

              <div class="add-display-form__field">
                <label class="add-display-form__label" for={fieldId('scale')}>
                  {t('common.scale')}
                </label>
                <select
                  id={fieldId('scale')}
                  class="add-display-form__select"
                  value={String(effectiveScale)}
                  onChange={(event) =>
                    update({ scale: Number(event.currentTarget.value) })
                  }
                >
                  {scaleChoices.map(({ scale }) => (
                    <option
                      key={scale}
                      value={String(scale)}
                      selected={scale === effectiveScale}
                    >
                      {formatScale({ scale, locale: lang })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {!isValid && (
        <p id={`${formId}-incomplete`} class="add-display-form__hint" role="status">
          {t('addDisplay.hint.incomplete')}
        </p>
      )}

      <div class="add-display-form__actions">
        {onCancel && (
          <Button variant="secondary" onClick={() => onCancel()}>
            {t('common.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid}
          aria-describedby={isValid ? undefined : `${formId}-incomplete`}
        >
          {submitText}
        </Button>
      </div>
    </form>
  )
}
