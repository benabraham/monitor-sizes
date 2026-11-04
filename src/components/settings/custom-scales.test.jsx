import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { CustomScales } from './custom-scales.jsx'

afterEach(() => {
  locale.value = 'en'
})

/**
 * Type into the custom scale field and press Add.
 *
 * @param {string} text
 */
const addScaleText = async (text) => {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox'), text)
  await user.click(screen.getByRole('button', { name: /^(Add|Přidat)$/ }))
}

describe('CustomScales', () => {
  it.each([
    ['133', 1.33],
    ['133 %', 1.33],
    ['1.33', 1.33],
    ['1,33', 1.33],
    ['150%', 1.5],
    ['2x', 2],
  ])('parses "%s" into the factor %s', async (text, factor) => {
    const onAdd = vi.fn()
    render(<CustomScales scales={[]} onAdd={onAdd} onRemove={() => {}} />)
    await addScaleText(text)
    expect(onAdd).toHaveBeenCalledWith(factor)
  })

  it('clears the field after a valid scale is added', async () => {
    render(<CustomScales scales={[]} onAdd={() => {}} onRemove={() => {}} />)
    await addScaleText('133')
    expect(screen.getByRole('textbox').value).toBe('')
  })

  it('refuses an out-of-range scale with an alert and does not call onAdd', async () => {
    const onAdd = vi.fn()
    render(<CustomScales scales={[]} onAdd={onAdd} onRemove={() => {}} />)
    await addScaleText('49')

    expect(onAdd).not.toHaveBeenCalled()
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe(
      'Enter a scale from 50\u00a0% to 400\u00a0%, for example 133\u00a0% or 1.33.',
    )
    const field = screen.getByRole('textbox')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toBe(alert.id)
  })

  it('refuses text that is not a number', async () => {
    const onAdd = vi.fn()
    render(<CustomScales scales={[]} onAdd={onAdd} onRemove={() => {}} />)
    await addScaleText('abc')
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).not.toBeNull()
  })

  it('refuses a scale that is already in the list', async () => {
    const onAdd = vi.fn()
    render(<CustomScales scales={[1.33]} onAdd={onAdd} onRemove={() => {}} />)
    await addScaleText('133')
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(
      'That scale is already in the list.',
    )
  })

  it('clears the error as soon as the person edits the field', async () => {
    const user = userEvent.setup()
    render(<CustomScales scales={[]} onAdd={() => {}} onRemove={() => {}} />)
    await addScaleText('49')
    await user.type(screen.getByRole('textbox'), '3')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lists custom scales as chips, sorted, with a remove button each', () => {
    render(<CustomScales scales={[3, 1.33]} onAdd={() => {}} onRemove={() => {}} />)
    const items = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(items[0]).toMatch(/^133\s%/)
    expect(items[1]).toMatch(/^300\s%/)
    expect(screen.getByRole('button', { name: /Remove 133/ })).not.toBeNull()
    expect(screen.getByRole('button', { name: /Remove 300/ })).not.toBeNull()
  })

  it('calls onRemove with the factor of the chip whose remove button was pressed', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<CustomScales scales={[1.33]} onAdd={() => {}} onRemove={onRemove} />)
    await user.click(screen.getByRole('button', { name: /Remove 133/ }))
    expect(onRemove).toHaveBeenCalledWith(1.33)
  })

  it('shows an empty message when there are no custom scales', () => {
    render(<CustomScales scales={[]} onAdd={() => {}} onRemove={() => {}} />)
    expect(screen.getByText('No custom scales yet.')).not.toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('submits with Enter from the field', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<CustomScales scales={[]} onAdd={onAdd} onRemove={() => {}} />)
    await user.type(screen.getByRole('textbox'), '125{Enter}')
    expect(onAdd).toHaveBeenCalledWith(1.25)
  })

  it('uses Czech messages and decimal comma when the locale is cs', async () => {
    locale.value = 'cs'
    const onAdd = vi.fn()
    render(<CustomScales scales={[1.33]} onAdd={onAdd} onRemove={() => {}} />)
    expect(screen.getByRole('button', { name: 'Odebrat 133 %' })).not.toBeNull()
    await addScaleText('1,5')
    expect(onAdd).toHaveBeenCalledWith(1.5)
    await addScaleText('10')
    expect(screen.getByRole('alert').textContent).toBe(
      'Zadejte měřítko od 50 % do 400 %, například 133 % nebo 1,33.',
    )
  })
})
