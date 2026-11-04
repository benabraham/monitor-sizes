import { render, screen } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { ICON_NAMES, Icon } from './icon.jsx'

describe('Icon', () => {
  it('is decorative (aria-hidden) when no title is given', () => {
    const { container } = render(<Icon name="star" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('role')).toBeNull()
    expect(svg.querySelector('title')).toBeNull()
  })

  it('is exposed as a labelled image when a title is given', () => {
    render(<Icon name="star-filled" title="Familiar display" />)
    const image = screen.getByRole('img', { name: 'Familiar display' })
    expect(image.tagName.toLowerCase()).toBe('svg')
    expect(image.getAttribute('aria-hidden')).toBeNull()
  })

  it('defaults to 16 px and honours a custom size', () => {
    const { container, rerender } = render(<Icon name="plus" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('16')
    expect(svg.getAttribute('height')).toBe('16')

    rerender(<Icon name="plus" size={24} />)
    expect(container.querySelector('svg').getAttribute('width')).toBe('24')
  })

  it('draws on a 24 × 24 grid with currentColor strokes', () => {
    const { container } = render(<Icon name="check" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
  })

  it('renders every name in the set', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />)
      expect(container.querySelector('svg')).not.toBeNull()
      unmount()
    }
    expect(ICON_NAMES).toEqual(
      expect.arrayContaining([
        'star',
        'star-filled',
        'plus',
        'close',
        'help',
        'link',
        'compare',
        'check',
        'trash',
        'edit',
        'chevron-down',
        'sort-asc',
        'sort-desc',
        'monitor',
        'laptop',
        'settings',
        'upload',
        'download',
        'eye',
        'eye-off',
      ]),
    )
  })

  it('renders nothing and warns for an unknown name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<Icon name="does-not-exist" />)
    expect(container.querySelector('svg')).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('does-not-exist'))
  })
})
