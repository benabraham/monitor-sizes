import { locale, t } from '../../i18n/index.js'
import { formatLength, formatScale } from '../../lib/format.js'
import { formatDisplayLabel, lengthDigits } from './format-helpers.js'
import './equivalence-line.css'

/**
 * Plain-words sentence under a candidate, saying where the candidate looks like the
 * baseline (PRD UX "Key interactions"):
 *
 * "Looks like your 24″ FHD at 80 cm · as sharp at 40 cm · same text size at 60 cm (150 %)"
 *
 * The three distances are the equivalent viewing distances of the candidate, and
 * the scale in brackets is the candidate's own. Renders nothing for the baseline
 * itself, and when there is no equivalent distance.
 *
 * @param {object} props
 * @param {object} props.entry CompareEntry of the candidate.
 * @param {object} props.baseline CompareEntry of the active baseline (its `display`
 *   gives the name and diagonal).
 * @param {'metric'|'imperial'} [props.units='metric'] Unit system for the distances.
 * @returns {import('preact').JSX.Element | null}
 *
 * @example
 * <EquivalenceLine entry={candidate} baseline={baselineEntry} units="metric" />
 */
export const EquivalenceLine = ({ entry, baseline, units = 'metric' }) => {
  const equivalent = entry?.equivalent
  if (!entry || !baseline || entry.isBaseline || !equivalent) return null

  const currentLocale = locale.value
  const digits = lengthDigits(units)
  const text = t('compareVisual.equivalence', {
    baseline: formatDisplayLabel({ display: baseline.display, locale: currentLocale }),
    sameSize: formatLength({
      inches: equivalent.sameSize,
      units,
      locale: currentLocale,
      digits,
    }),
    sameSharpness: formatLength({
      inches: equivalent.sameSharpness,
      units,
      locale: currentLocale,
      digits,
    }),
    sameTextSize: formatLength({
      inches: equivalent.sameTextSize,
      units,
      locale: currentLocale,
      digits,
    }),
    scale: formatScale({ scale: entry.scale, locale: currentLocale }),
  })

  return <p class="equivalence-line">{text}</p>
}
