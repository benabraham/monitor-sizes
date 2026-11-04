import { act, render, screen } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { prefetchModule, useLazyModule } from './use-lazy-module.js'

/** A promise the test settles by hand. */
const deferred = () => {
  let resolve = () => {}
  let reject = () => {}
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Shows the module's label, or "none" while it is not there. */
const Probe = ({ load, isWanted }) => {
  const mod = useLazyModule(load, isWanted)
  return <p>{mod ? mod.label : 'none'}</p>
}

describe('useLazyModule', () => {
  it('returns null until the module arrives, then the module', async () => {
    const pending = deferred()
    const load = vi.fn(() => pending.promise)
    render(<Probe load={load} />)

    expect(screen.getByText('none')).not.toBeNull()
    await act(async () => pending.resolve({ label: 'loaded' }))

    expect(screen.getByText('loaded')).not.toBeNull()
  })

  it('does not load anything while the module is not wanted', () => {
    const load = vi.fn(() => new Promise(() => {}))
    render(<Probe load={load} isWanted={false} />)

    expect(load).not.toHaveBeenCalled()
  })

  it('loads once it is wanted, and keeps the module after it is no longer wanted', async () => {
    const pending = deferred()
    const load = vi.fn(() => pending.promise)
    const { rerender } = render(<Probe load={load} isWanted={false} />)

    rerender(<Probe load={load} isWanted />)
    await act(async () => pending.resolve({ label: 'loaded' }))
    rerender(<Probe load={load} isWanted={false} />)

    expect(load).toHaveBeenCalledTimes(1)
    expect(screen.getByText('loaded')).not.toBeNull()
  })

  it('calls the loader once for a component that re-renders while wanted', async () => {
    const load = vi.fn(async () => ({ label: 'loaded' }))
    const { rerender } = render(<Probe load={load} isWanted />)
    await act(async () => {})

    rerender(<Probe load={load} isWanted />)
    rerender(<Probe load={load} isWanted />)

    expect(load).toHaveBeenCalledTimes(1)
    expect(screen.getByText('loaded')).not.toBeNull()
  })

  it('returns null, and does not throw, when the load fails', async () => {
    const pending = deferred()
    render(<Probe load={() => pending.promise} />)

    await act(async () => pending.reject(new Error('offline')))

    expect(screen.getByText('none')).not.toBeNull()
  })

  it('ignores a module that arrives after the component has unmounted', async () => {
    const pending = deferred()
    const { unmount } = render(<Probe load={() => pending.promise} />)

    unmount()
    await act(async () => pending.resolve({ label: 'late' }))

    expect(document.body.textContent).not.toContain('late')
  })
})

describe('prefetchModule', () => {
  it('starts the load without waiting for it', () => {
    const load = vi.fn(() => new Promise(() => {}))

    prefetchModule(load)

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('swallows a failed prefetch, so nothing is reported as unhandled', async () => {
    prefetchModule(() => Promise.reject(new Error('offline')))

    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})
