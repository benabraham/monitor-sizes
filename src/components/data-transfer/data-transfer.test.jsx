import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import {
  DataTransfer,
  downloadJson,
  EXPORT_FILE_NAME,
  readFileText,
} from './data-transfer.jsx'

const EXPORT_TEXT = '{"version":1,"displays":[]}'

/**
 * A JSON file for the import input.
 *
 * @param {string} text
 * @returns {File}
 */
const jsonFile = (text) => new File([text], 'displays.json', { type: 'application/json' })

/**
 * Render the panel with spies.
 *
 * @param {object} [props] Overrides for onExport and onImport.
 * @returns {{ onExport: import('vitest').Mock, onImport: import('vitest').Mock }}
 */
const renderPanel = (props = {}) => {
  const onExport = props.onExport ?? vi.fn(() => EXPORT_TEXT)
  const onImport = props.onImport ?? vi.fn(() => ({ isOk: true }))
  render(<DataTransfer onExport={onExport} onImport={onImport} />)
  return { onExport, onImport }
}

/**
 * Stub the object URL API and record the anchors that get clicked. Restores both
 * when the test ends.
 *
 * @returns {{ clicked: HTMLAnchorElement[], createObjectURL: import('vitest').Mock }}
 */
const stubDownloads = () => {
  const clicked = []
  const createObjectURL = vi.fn(() => 'blob:pixely-test')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
    clicked.push(this)
  })
  return { clicked, createObjectURL }
}

afterEach(() => {
  locale.value = 'en'
  vi.unstubAllGlobals()
})

describe('DataTransfer export', () => {
  it('calls onExport and starts a download named pixely-displays.json', async () => {
    const user = userEvent.setup()
    const { clicked, createObjectURL } = stubDownloads()
    const { onExport } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Export JSON' }))

    expect(onExport).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe(EXPORT_FILE_NAME)
    expect(clicked[0].download).toBe('pixely-displays.json')
    expect(clicked[0].href).toBe('blob:pixely-test')
    expect(clicked[0].isConnected).toBe(false)
  })

  it('still calls onExport where the browser cannot start a download (jsdom)', async () => {
    const user = userEvent.setup()
    const { onExport } = renderPanel()
    await user.click(screen.getByRole('button', { name: 'Export JSON' }))
    expect(onExport).toHaveBeenCalledTimes(1)
  })
})

describe('downloadJson', () => {
  it('returns false and does nothing without object URLs', () => {
    expect(downloadJson({ text: '{}', urlApi: {} })).toBe(false)
    expect(downloadJson({ text: '{}', doc: null, urlApi: URL })).toBe(false)
  })

  it('creates, clicks and removes a temporary link, then revokes the URL', () => {
    vi.useFakeTimers()
    try {
      const clicked = []
      const createObjectURL = vi.fn(() => 'blob:x')
      const revokeObjectURL = vi.fn()
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
        clicked.push({
          download: this.download,
          href: this.href,
          connected: this.isConnected,
        })
      })

      const started = downloadJson({
        text: '{"a":1}',
        fileName: 'custom.json',
        urlApi: { createObjectURL, revokeObjectURL },
      })

      expect(started).toBe(true)
      expect(clicked).toHaveLength(1)
      expect(clicked[0].download).toBe('custom.json')
      expect(clicked[0].href).toContain('blob:x')
      expect(clicked[0].connected).toBe(true)
      expect(document.querySelector('a[download]')).toBeNull()
      vi.runAllTimers()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:x')
    } finally {
      vi.useRealTimers()
      vi.restoreAllMocks()
    }
  })
})

describe('DataTransfer import', () => {
  it('reads the chosen file and reports success', async () => {
    const user = userEvent.setup()
    const { onImport } = renderPanel()
    const input = screen.getByLabelText('Import JSON')
    expect(input.getAttribute('type')).toBe('file')
    expect(input.getAttribute('accept')).toContain('application/json')

    await user.upload(input, jsonFile(EXPORT_TEXT))

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Displays imported.'),
    )
    expect(onImport).toHaveBeenCalledWith(EXPORT_TEXT)
  })

  it('shows a translated message for invalid JSON', async () => {
    const user = userEvent.setup()
    renderPanel({ onImport: vi.fn(() => ({ isOk: false, error: 'invalidJson' })) })
    await user.upload(screen.getByLabelText('Import JSON'), jsonFile('{nope'))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The file is not valid JSON.',
    )
  })

  it('shows a translated message for a wrong format', async () => {
    const user = userEvent.setup()
    renderPanel({ onImport: vi.fn(() => ({ isOk: false, error: 'invalidFormat' })) })
    await user.upload(screen.getByLabelText('Import JSON'), jsonFile('{"x":1}'))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The file does not contain displays in the expected format.',
    )
  })

  it('falls back to a generic message for an unknown error code', async () => {
    const user = userEvent.setup()
    renderPanel({ onImport: vi.fn(() => ({ isOk: false })) })
    await user.upload(screen.getByLabelText('Import JSON'), jsonFile('{}'))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The file could not be imported.',
    )
  })

  it('waits for an asynchronous import before reporting', async () => {
    const user = userEvent.setup()
    renderPanel({ onImport: vi.fn(() => Promise.resolve({ isOk: true })) })
    await user.upload(screen.getByLabelText('Import JSON'), jsonFile('{}'))
    expect(await screen.findByRole('status')).toBeTruthy()
  })

  it('reports a file that cannot be read as a generic error', async () => {
    const onImport = vi.fn()
    renderPanel({ onImport })
    const input = screen.getByLabelText('Import JSON')
    const unreadable = { text: () => Promise.reject(new Error('disk')) }
    Object.defineProperty(input, 'files', { configurable: true, value: [unreadable] })
    fireEvent.change(input)
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The file could not be imported.',
    )
    expect(onImport).not.toHaveBeenCalled()
  })

  it('does nothing when the file dialog is cancelled', () => {
    const onImport = vi.fn()
    renderPanel({ onImport })
    const input = screen.getByLabelText('Import JSON')
    Object.defineProperty(input, 'files', { configurable: true, value: [] })
    fireEvent.change(input)
    expect(onImport).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('clears the file input so the same file can be chosen again', async () => {
    const user = userEvent.setup()
    renderPanel()
    const input = screen.getByLabelText('Import JSON')
    await user.upload(input, jsonFile('{}'))
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(input.value).toBe('')
  })
})

describe('readFileText', () => {
  it('reads a Blob through File.text when it is available', async () => {
    await expect(readFileText(new Blob(['hello']))).resolves.toBe('hello')
  })

  it('falls back to FileReader when Blob.text is missing', async () => {
    const file = new Blob(['fallback'])
    Object.defineProperty(file, 'text', { value: undefined })
    await expect(readFileText(file)).resolves.toBe('fallback')
  })

  it('rejects when FileReader fails', async () => {
    const file = { text: undefined }
    const reader = {
      readAsText() {
        this.onerror()
      },
      error: new Error('boom'),
    }
    vi.stubGlobal('FileReader', function FileReader() {
      return reader
    })
    await expect(readFileText(file)).rejects.toThrow('boom')
  })
})

describe('DataTransfer in Czech', () => {
  it('translates the labels and messages', async () => {
    locale.value = 'cs'
    const user = userEvent.setup()
    renderPanel({ onImport: vi.fn(() => ({ isOk: false, error: 'invalidJson' })) })
    expect(screen.getByRole('heading', { name: 'Data' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Exportovat JSON' })).toBeTruthy()
    await user.upload(screen.getByLabelText('Importovat JSON'), jsonFile('{'))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Soubor není platný JSON.',
    )
  })
})
