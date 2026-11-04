import { useEffect, useRef, useState } from 'preact/hooks'
import { t } from '../../i18n/index.js'
import { Button } from '../ui/index.js'
import './copy-link.css'

/** How long the "Link copied" state stays visible, in milliseconds. */
export const COPIED_DURATION_MS = 2000

/** Counter for unique field ids, one per mounted component. */
let fieldSequence = 0

/**
 * Write text to the clipboard with the async Clipboard API. Resolves `false` when the
 * API is missing (insecure context, old browser) or the write is refused.
 *
 * @param {object} params
 * @param {string} params.text Text to copy.
 * @returns {Promise<boolean>} Whether the text was written.
 */
const writeToClipboard = async ({ text }) => {
  const clipboard = globalThis.navigator?.clipboard
  if (typeof clipboard?.writeText !== 'function') return false
  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * "Copy link" button for the current view state (F19, UX "Copy link shares the current
 * state").
 *
 * - Copies `url`, or the current page address when `url` is not given, read at click
 *   time so it reflects the latest state.
 * - Success: the label becomes "Link copied" with a check mark for 2 s. A polite live
 *   region announces it once.
 * - Fallback: when the clipboard is unavailable or refused, a read-only field with the
 *   link opens below the button, selected and focused, so it can be copied by hand.
 *   Its close button, or Esc, dismisses it.
 *
 * @param {object} props
 * @param {string} [props.url] Link to copy. Defaults to `window.location.href`.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CopyLink url={shareUrl} />
 */
export const CopyLink = ({ url }) => {
  const [status, setStatus] = useState('idle')
  const [linkText, setLinkText] = useState('')
  const [fieldId] = useState(() => `copy-link-field-${++fieldSequence}`)
  const fieldRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    if (status !== 'fallback') return
    fieldRef.current?.focus()
    fieldRef.current?.select()
  }, [status])

  /**
   * Copy the link. Success starts the timed "copied" state; failure opens the field.
   */
  const handleCopy = async () => {
    const text = url ?? globalThis.location?.href ?? ''
    setLinkText(text)
    const isCopied = await writeToClipboard({ text })
    clearTimeout(timerRef.current)
    if (!isCopied) {
      setStatus('fallback')
      return
    }
    setStatus('copied')
    timerRef.current = setTimeout(() => setStatus('idle'), COPIED_DURATION_MS)
  }

  /**
   * Close the fallback field and return to the idle button.
   */
  const handleDismiss = () => setStatus('idle')

  /**
   * Esc inside the fallback field closes it.
   *
   * @param {KeyboardEvent} event
   */
  const handleFieldKeyDown = (event) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    handleDismiss()
  }

  const isCopied = status === 'copied'
  const label = isCopied ? t('common.linkCopied') : t('common.copyLink')

  return (
    <div class="copy-link">
      <Button
        class={
          isCopied ? 'copy-link__button copy-link__button--copied' : 'copy-link__button'
        }
        variant="secondary"
        size="md"
        icon={isCopied ? 'check' : 'link'}
        aria-expanded={status === 'fallback' ? 'true' : undefined}
        aria-controls={status === 'fallback' ? fieldId : undefined}
        onClick={handleCopy}
      >
        <span class="copy-link__label">{label}</span>
      </Button>
      <span class="visually-hidden" role="status" aria-live="polite">
        {isCopied ? t('common.linkCopied') : ''}
      </span>
      {status === 'fallback' && (
        <div class="copy-link__fallback" id={fieldId}>
          <label class="copy-link__field-label" for={`${fieldId}-input`}>
            {t('header.copyLink.fieldLabel')}
          </label>
          <div class="copy-link__field-row">
            <input
              ref={fieldRef}
              id={`${fieldId}-input`}
              class="copy-link__input"
              type="text"
              readOnly
              value={linkText}
              aria-describedby={`${fieldId}-hint`}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={handleFieldKeyDown}
            />
            <Button
              variant="ghost"
              size="sm"
              icon="close"
              aria-label={t('common.close')}
              onClick={handleDismiss}
            />
          </div>
          <p class="copy-link__hint" id={`${fieldId}-hint`}>
            {t('header.copyLink.fallbackHint')}
          </p>
        </div>
      )}
    </div>
  )
}
