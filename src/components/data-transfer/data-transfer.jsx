import { useId, useState } from 'preact/hooks'
import { t } from '../../i18n/index.js'
import { Button } from '../ui/button/button.jsx'
import { Icon } from '../ui/icon/icon.jsx'
import './data-transfer.css'

/** File name of an export. */
export const EXPORT_FILE_NAME = 'pixely-displays.json'

/**
 * Save text as a JSON file through a temporary link. Does nothing where the browser
 * has no object URLs (jsdom, very old engines), so callers can test without a
 * download. Returns whether a download was started.
 *
 * @param {object} params
 * @param {string} params.text File contents.
 * @param {string} [params.fileName=EXPORT_FILE_NAME] Suggested file name.
 * @param {Document} [params.doc=globalThis.document]
 * @param {typeof URL} [params.urlApi=globalThis.URL]
 * @returns {boolean} `true` when the download was started.
 *
 * @example
 * downloadJson({ text: '{"v":1}' }) // true in a browser, false in jsdom
 */
export const downloadJson = ({
  text,
  fileName = EXPORT_FILE_NAME,
  doc = globalThis.document,
  urlApi = globalThis.URL,
}) => {
  if (typeof urlApi?.createObjectURL !== 'function' || !doc?.body) return false

  const url = urlApi.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = doc.createElement('a')
  link.href = url
  link.download = fileName
  link.hidden = true
  doc.body.append(link)
  link.click()
  link.remove()
  globalThis.setTimeout(() => urlApi.revokeObjectURL?.(url), 0)
  return true
}

/**
 * Read a chosen file as text. Uses `File.text()` where it exists and `FileReader`
 * otherwise.
 *
 * @param {Blob} file
 * @returns {Promise<string>}
 *
 * @example
 * const text = await readFileText(input.files[0])
 */
export const readFileText = (file) => {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Translated message for a failed import. Unknown codes fall back to a generic
 * message.
 *
 * @param {string} [code] `'invalidJson'` or `'invalidFormat'`, from `importJson`.
 * @returns {string}
 */
const importErrorText = (code) => {
  if (code === 'invalidJson') return t('dataTransfer.error.invalidJson')
  if (code === 'invalidFormat') return t('dataTransfer.error.invalidFormat')
  return t('dataTransfer.error.unknown')
}

/**
 * Export and import of custom displays and the familiar set as JSON (PRD F18).
 *
 * Export asks `onExport()` for the JSON text and saves it as `pixely-displays.json`.
 * Import reads a chosen file and passes its text to `onImport`. The result is shown
 * as a status line (success) or an alert (failure). Both calls may be async.
 *
 * @param {object} props
 * @param {() => string} props.onExport Returns the JSON text to save.
 * @param {(text: string) => ({ isOk: boolean, error?: 'invalidJson'|'invalidFormat' } |
 *   Promise<{ isOk: boolean, error?: 'invalidJson'|'invalidFormat' }>)} props.onImport
 *   Imports the text. Returns `{ isOk, error }`.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <DataTransfer
 *   onExport={() => exportJson()}
 *   onImport={(text) => importJson(text)}
 * />
 */
export const DataTransfer = ({ onExport, onImport }) => {
  const headingId = useId()
  const [status, setStatus] = useState(null)

  /** Save the exported JSON. */
  const handleExport = () => {
    downloadJson({ text: onExport() })
  }

  /**
   * Read the chosen file and import it. The input is cleared afterwards, so the same
   * file can be chosen again.
   *
   * @param {Event} event
   */
  const handleFileChange = async (event) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    let text
    try {
      text = await readFileText(file)
    } catch {
      setStatus({ isOk: false, message: importErrorText() })
      return
    }

    const result = await onImport(text)
    setStatus(
      result?.isOk
        ? { isOk: true, message: t('dataTransfer.importSuccess') }
        : { isOk: false, message: importErrorText(result?.error) },
    )
  }

  return (
    <section class="data-transfer" aria-labelledby={headingId}>
      <h2 id={headingId} class="data-transfer__title">
        {t('dataTransfer.title')}
      </h2>
      <p class="data-transfer__description">{t('dataTransfer.description')}</p>

      <div class="data-transfer__actions">
        <Button variant="secondary" icon="download" onClick={handleExport}>
          {t('dataTransfer.export')}
        </Button>
        <label class="data-transfer__import">
          <Icon name="upload" size={16} />
          <span>{t('dataTransfer.import')}</span>
          <input
            class="data-transfer__file visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {status && status.isOk && (
        <p class="data-transfer__status" role="status">
          {status.message}
        </p>
      )}
      {status && !status.isOk && (
        <p class="data-transfer__status data-transfer__status--error" role="alert">
          {status.message}
        </p>
      )}
    </section>
  )
}
