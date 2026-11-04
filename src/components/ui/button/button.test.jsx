import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { createRef } from 'preact'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button.jsx'

describe('Button', () => {
  it('renders a native button of type "button" by default', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
  })

  it('lets the caller override the button type', () => {
    render(<Button type="submit">Send</Button>)
    expect(screen.getByRole('button', { name: 'Send' }).getAttribute('type')).toBe(
      'submit',
    )
  })

  it('applies the variant and size classes, defaulting to secondary and md', () => {
    const { rerender } = render(<Button>Plain</Button>)
    const button = screen.getByRole('button', { name: 'Plain' })
    expect(button.classList.contains('button')).toBe(true)
    expect(button.classList.contains('button--secondary')).toBe(true)
    expect(button.classList.contains('button--md')).toBe(true)

    rerender(
      <Button variant="danger" size="sm">
        Delete
      </Button>,
    )
    const danger = screen.getByRole('button', { name: 'Delete' })
    expect(danger.classList.contains('button--danger')).toBe(true)
    expect(danger.classList.contains('button--sm')).toBe(true)
  })

  it('merges a caller class name with its own classes', () => {
    render(<Button class="toolbar__action">Go</Button>)
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button.classList.contains('toolbar__action')).toBe(true)
    expect(button.classList.contains('button')).toBe(true)
  })

  it('calls onClick when clicked and when activated with the keyboard', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Compare</Button>)

    await user.click(screen.getByRole('button', { name: 'Compare' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    screen.getByRole('button', { name: 'Compare' }).focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Locked
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Locked' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders a named icon as a decorative svg inside the button', () => {
    const { container } = render(
      <Button icon="plus" variant="primary">
        Add display
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Add display' })
    const svg = button.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('accepts a custom node as the icon', () => {
    render(<Button icon={<span data-testid="custom-icon">x</span>}>Custom</Button>)
    expect(screen.getByTestId('custom-icon')).not.toBeNull()
  })

  it('marks icon-only buttons and names them with aria-label', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<Button icon="close" size="sm" aria-label="Close panel" />)
    const button = screen.getByRole('button', { name: 'Close panel' })
    expect(button.classList.contains('button--icon-only')).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns in development when an icon-only button has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<Button icon="trash" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('aria-label'))
  })

  it('forwards a ref to the native button element', () => {
    const ref = createRef()
    render(<Button ref={ref}>Ref me</Button>)
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Ref me' }))
  })
})
