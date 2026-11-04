import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { act } from 'preact/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HelpPopover } from './help-popover.jsx'

/**
 * Give the viewport a fixed size for positioning tests.
 *
 * @param {{ width: number, height: number }} size
 */
const setViewport = ({ width, height }) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

/**
 * Pretend the element sits at the given client rectangle.
 *
 * @param {HTMLElement} element
 * @param {{ left: number, top: number, width: number, height: number }} rect
 */
const mockRect = (element, { left, top, width, height }) => {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  })
}

/**
 * Dispatch the ToggleEvent the browser fires when the popover opens or closes.
 *
 * @param {HTMLElement} panel
 * @param {'open' | 'closed'} newState
 */
const dispatchToggle = (panel, newState) => {
  const event = new Event('toggle')
  Object.defineProperty(event, 'newState', { value: newState })
  panel.dispatchEvent(event)
}

describe('HelpPopover', () => {
  it('renders a ? button named by label that points at the panel', () => {
    render(
      <HelpPopover id="help-ppi" label="Help: PPI" title="PPI">
        <p>Pixels per inch.</p>
      </HelpPopover>,
    )
    const trigger = screen.getByRole('button', { name: 'Help: PPI' })
    expect(trigger.getAttribute('popovertarget')).toBe('help-ppi')
    expect(trigger.getAttribute('aria-controls')).toBe('help-ppi')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('type')).toBe('button')
    expect(trigger.querySelector('svg')).not.toBeNull()
  })

  it('renders the title and text in a popover panel labelled by its title', () => {
    const { container } = render(
      <HelpPopover id="help-ppi" label="Help: PPI" title="PPI">
        <p>Pixels per inch: diagonal pixels divided by the diagonal in inches.</p>
      </HelpPopover>,
    )
    const panel = container.querySelector('#help-ppi')
    expect(panel.getAttribute('popover')).toBe('auto')
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.getAttribute('aria-labelledby')).toBe('help-ppi-title')
    // The panel is closed here, so it is hidden from the accessibility tree; opt in to inspect it.
    expect(screen.getByRole('heading', { name: 'PPI', hidden: true })).not.toBeNull()
    expect(
      screen.getByText(
        'Pixels per inch: diagonal pixels divided by the diagonal in inches.',
      ),
    ).not.toBeNull()
  })

  it('opens and closes on click where the Popover API is missing, and does not crash', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <HelpPopover id="help-size" label="Help: size" title="Size">
        <p>Physical width and height.</p>
      </HelpPopover>,
    )
    const trigger = screen.getByRole('button', { name: 'Help: size' })
    const panel = container.querySelector('#help-size')
    expect(panel.hasAttribute('hidden')).toBe(true)

    await user.click(trigger)
    expect(panel.hasAttribute('hidden')).toBe(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    await user.click(trigger)
    expect(panel.hasAttribute('hidden')).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  describe('with the Popover API', () => {
    beforeEach(() => {
      // jsdom has no Popover API; declaring the property makes the component take the native path.
      Object.defineProperty(HTMLElement.prototype, 'popover', {
        configurable: true,
        writable: true,
        value: null,
      })
      setViewport({ width: 1024, height: 768 })
    })

    afterEach(() => {
      delete HTMLElement.prototype.popover
      setViewport({ width: 1024, height: 768 })
    })

    it('leaves opening to the browser: no hidden attribute, and a click does not change state itself', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <HelpPopover id="help-ppi" label="Help: PPI" title="PPI">
          <p>Text</p>
        </HelpPopover>,
      )
      const trigger = screen.getByRole('button', { name: 'Help: PPI' })
      const panel = container.querySelector('#help-ppi')
      expect(panel.hasAttribute('hidden')).toBe(false)

      await user.click(trigger)
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })

    it('places the panel below and to the right of its trigger when it opens', () => {
      const { container } = render(
        <HelpPopover id="help-ppi" label="Help: PPI" title="PPI">
          <p>Text</p>
        </HelpPopover>,
      )
      const trigger = screen.getByRole('button', { name: 'Help: PPI' })
      const panel = container.querySelector('#help-ppi')
      mockRect(trigger, { left: 100, top: 50, width: 20, height: 20 })
      mockRect(panel, { left: 0, top: 0, width: 200, height: 100 })

      act(() => dispatchToggle(panel, 'open'))
      expect(panel.style.left).toBe('100px')
      expect(panel.style.top).toBe('76px')
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      act(() => dispatchToggle(panel, 'closed'))
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })

    it('flips above the trigger when there is no room below and clamps into the viewport', () => {
      const { container } = render(
        <HelpPopover id="help-ppi" label="Help: PPI" title="PPI">
          <p>Text</p>
        </HelpPopover>,
      )
      const trigger = screen.getByRole('button', { name: 'Help: PPI' })
      const panel = container.querySelector('#help-ppi')
      mockRect(trigger, { left: 900, top: 700, width: 20, height: 20 })
      mockRect(panel, { left: 0, top: 0, width: 200, height: 200 })

      act(() => dispatchToggle(panel, 'open'))
      expect(panel.style.top).toBe('494px')
      expect(panel.style.left).toBe('816px')
    })

    it('clears the inline offsets on phones so the bottom sheet applies', () => {
      setViewport({ width: 390, height: 844 })
      const { container } = render(
        <HelpPopover id="help-ppi" label="Help: PPI" title="PPI">
          <p>Text</p>
        </HelpPopover>,
      )
      const trigger = screen.getByRole('button', { name: 'Help: PPI' })
      const panel = container.querySelector('#help-ppi')
      mockRect(trigger, { left: 100, top: 50, width: 20, height: 20 })
      mockRect(panel, { left: 0, top: 0, width: 200, height: 100 })

      act(() => dispatchToggle(panel, 'open'))
      expect(panel.style.top).toBe('')
      expect(panel.style.left).toBe('')
    })
  })
})
