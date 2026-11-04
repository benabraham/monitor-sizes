import { locale, t } from '../../i18n/index.js'
import { formatResolution, formatScale } from '../../lib/format.js'
import { lengthUnitLabel, fromDisplayLength, toDisplayLength } from '../../lib/units.js'
import { Chip } from '../ui/chip/chip.jsx'
import { NumberField } from '../ui/number-field/number-field.jsx'
import { formatDiagonal, withCurrentScale } from './onboarding-model.js'
import './onboarding-setup.css'

/**
 * Step 2 of onboarding: for each picked display, how far away it is used and at
 * which OS scale. Rows are in pick order. The first row is the baseline and says so.
 * Values arrive prefilled from `getDefaults`, and every row can be changed.
 *
 * Distances are held in inches. The field shows them in the active unit system.
 *
 * @param {object} props
 * @param {Array<{ id: string, distance: number, scale: number }>} props.rows Picked
 *   displays in pick order: distance in inches, scale as a factor.
 * @param {Map<string, object>} props.displayById Display record by id.
 * @param {'metric'|'imperial'} props.units Unit system for the distance field.
 * @param {(display: object) => Array<{ scale: number }>} props.scaleOptionsFor
 * @param {(id: string, patch: { distance?: number, scale?: number }) => void} props.onChangeRow
 *   Called with the row id and the changed field (distance in inches).
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <OnboardingSetup rows={rows} displayById={displayById} units="metric"
 *   scaleOptionsFor={scaleOptionsFor} onChangeRow={changeRow} />
 */
export const OnboardingSetup = ({
  rows,
  displayById,
  units,
  scaleOptionsFor,
  onChangeRow,
}) => {
  const lang = locale.value
  const decimals = units === 'imperial' ? 1 : 0

  return (
    <section class="onboarding-setup">
      <ol class="onboarding-setup__list">
        {rows.map((row, index) => {
          const display = displayById.get(row.id)
          if (!display) return null
          const options = withCurrentScale({
            options: scaleOptionsFor(display),
            scale: row.scale,
          })
          const isBaseline = index === 0
          const scaleId = `onboarding-scale-${row.id}`

          return (
            <li class="onboarding-setup__item" key={row.id}>
              <fieldset class="onboarding-setup__row">
                <legend class="onboarding-setup__legend">
                  <span class="onboarding-setup__name">{display.name}</span>
                  {isBaseline && <Chip isAccent>{t('common.baseline')}</Chip>}
                </legend>
                <p class="onboarding-setup__meta">
                  {formatDiagonal({ diagonal: display.diagonal, locale: lang })}″ ·{' '}
                  {formatResolution({ width: display.width, height: display.height })}
                </p>
                {isBaseline && (
                  <p class="onboarding-setup__hint">{t('onboarding.baselineHint')}</p>
                )}
                <div class="onboarding-setup__fields">
                  <NumberField
                    label={t('common.distance')}
                    value={toDisplayLength({ inches: row.distance, units })}
                    unit={lengthUnitLabel(units)}
                    decimals={decimals}
                    locale={lang}
                    onChange={(value) =>
                      onChangeRow(row.id, {
                        distance: fromDisplayLength({ value, units }),
                      })
                    }
                  />
                  <div class="onboarding-setup__field">
                    <label class="onboarding-setup__label" for={scaleId}>
                      {t('common.scale')}
                    </label>
                    <select
                      id={scaleId}
                      class="onboarding-setup__select"
                      value={String(row.scale)}
                      onChange={(event) =>
                        onChangeRow(row.id, { scale: Number(event.currentTarget.value) })
                      }
                    >
                      {options.map(({ scale }) => (
                        <option
                          key={scale}
                          value={String(scale)}
                          selected={scale === row.scale}
                        >
                          {formatScale({ scale, locale: lang })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
