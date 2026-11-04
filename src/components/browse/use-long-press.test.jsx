import { fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLongPress } from './use-long-press.js'

/**
 * A box that spreads the long-press handlers, with a button inside it, the way a card or a
 * table row uses the hook.
 */
const Target = ({ onLongPress, onClick, delay, tolerance }) => {
  const handlers = useLongPress({ onLongPress, delay, tolerance })
  return (
    <div data-testid="target" {...handlers}>
      <button type="button" onClick={onClick}>
        Name
      </button>
    </div>
  )
}

/** The box under test. */
const getTarget = () => screen.getByTestId('target')

/** A touch press at the given point, the way a finger reports it. */
const touchDown = (element, { x = 10, y = 10 } = {}) =>
  fireEvent.pointerDown(element, {
    clientX: x,
    clientY: y,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
  })

/** A touch release. */
const touchUp = (element) =>
  fireEvent.pointerUp(element, { pointerType: 'touch', isPrimary: true, button: 0 })

/** A touch move to the given point. */
const touchMove = (element, { x, y }) =>
  fireEvent.pointerMove(element, { clientX: x, clientY: y, pointerType: 'touch' })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useLongPress: firing', () => {
  it('calls onLongPress once the press has been held for 500 ms', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    vi.advanceTimersByTime(499)
    expect(onLongPress).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('does not fire on a normal tap, released before 500 ms', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    vi.advanceTimersByTime(120)
    touchUp(getTarget())
    vi.advanceTimersByTime(2000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('fires once per press, however long the finger stays down', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    vi.advanceTimersByTime(3000)
    touchUp(getTarget())

    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('starts a new press after an earlier one ended', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    vi.advanceTimersByTime(500)
    touchUp(getTarget())
    touchDown(getTarget())
    vi.advanceTimersByTime(500)

    expect(onLongPress).toHaveBeenCalledTimes(2)
  })

  it('uses the delay and the tolerance it is given', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} delay={300} tolerance={3} />)

    touchDown(getTarget())
    vi.advanceTimersByTime(300)
    expect(onLongPress).toHaveBeenCalledTimes(1)

    touchDown(getTarget(), { x: 10, y: 10 })
    touchMove(getTarget(), { x: 14, y: 10 })
    vi.advanceTimersByTime(1000)
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })
})

describe('useLongPress: cancelling', () => {
  it('keeps the press when the finger moves 10 px or less', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget(), { x: 10, y: 10 })
    touchMove(getTarget(), { x: 20, y: 10 })
    vi.advanceTimersByTime(500)

    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('cancels when the finger moves more than 10 px', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget(), { x: 10, y: 10 })
    touchMove(getTarget(), { x: 21, y: 10 })
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('measures the movement in a straight line, both axes together', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget(), { x: 0, y: 0 })
    touchMove(getTarget(), { x: 8, y: 8 }) // about 11.3 px
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels on pointer cancel, which the browser sends when it takes over the gesture', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    fireEvent.pointerCancel(getTarget(), { pointerType: 'touch' })
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels when the page scrolls during the press', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    window.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels when a scroll happens in a nested scroller', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    getTarget().dispatchEvent(new Event('scroll', { bubbles: false }))
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels when the pointer leaves the box', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    fireEvent.pointerLeave(getTarget(), { pointerType: 'touch' })
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels when text selection starts, so a selection never toggles Compare', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    fireEvent(getTarget(), new Event('selectstart', { bubbles: true }))
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not fire after the box unmounts', () => {
    const onLongPress = vi.fn()
    const { unmount } = render(<Target onLongPress={onLongPress} />)

    touchDown(getTarget())
    unmount()
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('stops listening to scroll once the press has ended', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    render(<Target onLongPress={vi.fn()} />)

    touchDown(getTarget())
    touchUp(getTarget())

    expect(removeSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.objectContaining({ capture: true }),
    )
    removeSpy.mockRestore()
  })
})

describe('useLongPress: pointer types', () => {
  it('ignores mouse presses, so a held mouse button does not toggle Compare', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    fireEvent.pointerDown(getTarget(), { pointerType: 'mouse', isPrimary: true, button: 0 })
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('ignores a secondary pointer, such as a second finger', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    fireEvent.pointerDown(getTarget(), {
      pointerType: 'touch',
      isPrimary: false,
      button: 0,
    })
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('ignores buttons other than the main one', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    fireEvent.pointerDown(getTarget(), { pointerType: 'pen', isPrimary: true, button: 2 })
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('works for a pen', () => {
    const onLongPress = vi.fn()
    render(<Target onLongPress={onLongPress} />)

    fireEvent.pointerDown(getTarget(), { pointerType: 'pen', isPrimary: true, button: 0 })
    vi.advanceTimersByTime(500)

    expect(onLongPress).toHaveBeenCalledTimes(1)
  })
})

describe('useLongPress: the click that follows', () => {
  it('swallows the click that ends a long press, so the button inside does not fire', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    render(<Target onLongPress={onLongPress} onClick={onClick} />)

    touchDown(getTarget())
    vi.advanceTimersByTime(500)
    touchUp(getTarget())
    fireEvent.click(screen.getByRole('button', { name: 'Name' }))

    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('lets the click of a normal tap through', () => {
    const onClick = vi.fn()
    render(<Target onLongPress={vi.fn()} onClick={onClick} />)

    touchDown(getTarget())
    touchUp(getTarget())
    fireEvent.click(screen.getByRole('button', { name: 'Name' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('lets the next tap through after a long press whose click never came', () => {
    const onClick = vi.fn()
    render(<Target onLongPress={vi.fn()} onClick={onClick} />)

    touchDown(getTarget())
    vi.advanceTimersByTime(500)
    touchUp(getTarget())
    touchDown(getTarget())
    touchUp(getTarget())
    fireEvent.click(screen.getByRole('button', { name: 'Name' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('useLongPress: the context menu', () => {
  it('prevents the context menu while a long press fires', () => {
    render(<Target onLongPress={vi.fn()} />)

    touchDown(getTarget())
    vi.advanceTimersByTime(500)
    const isNotPrevented = fireEvent.contextMenu(getTarget())

    expect(isNotPrevented).toBe(false)
  })

  it('prevents the context menu while a press is still held, before it fires', () => {
    render(<Target onLongPress={vi.fn()} />)

    touchDown(getTarget())
    const isNotPrevented = fireEvent.contextMenu(getTarget())

    expect(isNotPrevented).toBe(false)
  })

  it('leaves the context menu alone when no press is active', () => {
    render(<Target onLongPress={vi.fn()} />)

    const isNotPrevented = fireEvent.contextMenu(getTarget())

    expect(isNotPrevented).toBe(true)
  })

  it('leaves the context menu alone after a press that did not fire', () => {
    render(<Target onLongPress={vi.fn()} />)

    touchDown(getTarget())
    touchUp(getTarget())
    const isNotPrevented = fireEvent.contextMenu(getTarget())

    expect(isNotPrevented).toBe(true)
  })
})
