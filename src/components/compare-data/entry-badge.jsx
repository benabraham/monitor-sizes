import { t } from '../../i18n/index.js'
import { entryKind } from './entries.js'
import './entry-badge.css'

/**
 * Text badge that names the role of a compared display: Baseline, Familiar or
 * Candidate. The words carry the meaning, so colour is never the only signal.
 *
 * @param {object} props
 * @param {{ isBaseline?: boolean, isFamiliar?: boolean }} props.entry CompareEntry-like object.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <EntryBadge entry={{ isFamiliar: true }} /> // "Familiar"
 */
export const EntryBadge = ({ entry }) => {
  const kind = entryKind(entry)
  const label = {
    baseline: t('compareData.badge.baseline'),
    familiar: t('compareData.badge.familiar'),
    candidate: t('compareData.badge.candidate'),
  }[kind]
  return <span class={`entry-badge entry-badge--${kind}`}>{label}</span>
}
