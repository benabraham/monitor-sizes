import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app.jsx'
import { locale } from './i18n/index.js'
import { decodeState, encodeState } from './lib/url-state.js'
import { createStore } from './state/store.js'
import { addLabelOf } from './components/compare-view/compare-manager.jsx'

/** Built-in displays for the app tests. Small, so the names are unique. */
const FHD = {
  id: '24-fhd-1920x1080',
  name: 'FHD',
  diagonal: 24,
  width: 1920,
  height: 1080,
  tag: 'monitor',
}
const UHD = {
  id: '27-4k-3840x2160',
  name: '4K',
  diagonal: 27,
  width: 3840,
  height: 2160,
  tag: 'monitor',
}
const MBP = {
  id: '14-2-3024x1964',
  name: 'MacBook Pro 14″',
  diagonal: 14.2,
  width: 3024,
  height: 1964,
  tag: 'laptop',
}
const UW = {
  id: '34-uw-3440x1440',
  name: 'UW 34',
  diagonal: 34,
  width: 3440,
  height: 1440,
  tag: 'ultrawide',
}
const SEED = [FHD, UHD, MBP, UW]

const STUDIO = {
  id: 'c-studio1',
  name: 'Studio',
  diagonal: 27,
  width: 2560,
  height: 1440,
  tag: 'monitor',
  isCustom: true,
}

const EMPTY_STORED = {
  customDisplays: [],
  hiddenBuiltInIds: [],
  familiar: [],
  baselineId: null,
  preferences: {},
  isOnboarded: false,
}

/** A returning person with the FHD display as the only familiar one (the baseline). */
const ONBOARDED = {
  ...EMPTY_STORED,
  isOnboarded: true,
  familiar: [{ id: FHD.id, distance: 23.622047244094489, scale: 1 }],
  baselineId: FHD.id,
}

/** The same person with a second familiar display, 4K at scale 1.5. */
const TWO_FAMILIAR = {
  ...ONBOARDED,
  familiar: [
    ...ONBOARDED.familiar,
    { id: UHD.id, distance: 23.622047244094489, scale: 1.5 },
  ],
}

/** Stores made in a test are disposed afterwards, so their effects do not linger. */
const stores = []

/**
 * Render the app with a fresh store. Storage, location and history are fakes.
 *
 * @param {object} [options]
 * @param {object} [options.stored] Stored state, merged over the empty one.
 * @param {string} [options.hash] The link hash the page opens with.
 * @returns {object} The store, its fakes, and the render result.
 */
const renderApp = ({ stored = {}, hash = '' } = {}) => {
  const location = { hash }
  const history = {
    replaceState: vi.fn((_state, _title, url) => {
      location.hash = url
    }),
  }
  const storage = {
    loadPersisted: vi.fn(async () => structuredClone({ ...EMPTY_STORED, ...stored })),
    savePersisted: vi.fn(async () => {}),
  }
  const store = createStore({
    seed: SEED,
    storage,
    location,
    history,
    detectPreset: () => 'windows',
    detectLang: () => 'en',
  })
  stores.push(store)
  const view = render(<App store={store} />)
  return { store, storage, location, history, ...view }
}

/** The header's view switch. */
const navigation = () => screen.getByRole('navigation', { name: 'Views' })

/** The page's visually hidden view heading, which takes focus on a view change. */
const viewHeading = (name) => screen.getByRole('heading', { level: 1, name })

/** Waits for a view to be shown, after the store has loaded. */
const waitForView = (name) => screen.findByRole('heading', { level: 1, name })

beforeEach(() => {
  locale.value = 'en'
  document.documentElement.lang = 'en'
})

afterEach(() => {
  stores.splice(0).forEach((store) => store.dispose())
  locale.value = 'en'
})

describe('App gate', () => {
  it('shows a loading state until the stored state is loaded', async () => {
    let finish = () => {}
    const storage = {
      loadPersisted: vi.fn(
        () =>
          new Promise((resolve) => {
            finish = () => resolve(structuredClone(EMPTY_STORED))
          }),
      ),
      savePersisted: vi.fn(async () => {}),
    }
    const store = createStore({
      seed: SEED,
      storage,
      location: { hash: '' },
      history: null,
    })
    stores.push(store)
    render(<App store={store} />)
    expect(screen.getByRole('status').textContent).toBe('Loading…')
    await act(async () => finish())
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Which displays do you know?',
      }),
    ).not.toBeNull()
    expect(document.documentElement.lang).toBe('en')
  })

  it('shows onboarding, and no app chrome, until a familiar display is picked', async () => {
    renderApp()
    await screen.findByRole('heading', { level: 1, name: 'Which displays do you know?' })
    expect(screen.queryByRole('navigation', { name: 'Views' })).toBeNull()
  })

  it('completes onboarding with the first pick as the baseline, then opens Browse', async () => {
    const user = userEvent.setup()
    const { store } = renderApp()
    await screen.findByRole('heading', { level: 1, name: 'Which displays do you know?' })

    await user.click(screen.getByRole('checkbox', { name: /^4K,/ }))
    await user.click(screen.getByRole('checkbox', { name: /^FHD,/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(store.isOnboarded.value).toBe(true)
    expect(store.familiar.value.map(({ id }) => id)).toEqual([UHD.id, FHD.id])
    expect(store.baselineId.value).toBe(UHD.id)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Browse' }),
    ).not.toBeNull()
    expect(document.activeElement).toBe(viewHeading('Browse'))
  })
})

describe('Browse', () => {
  it('stars a display and compares it, and the rows follow', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: ONBOARDED })
    await waitForView('Browse')

    await user.click(screen.getByRole('button', { name: 'Mark UW 34 as familiar' }))
    expect(store.familiar.value.map(({ id }) => id)).toEqual([FHD.id, UW.id])
    expect(
      screen
        .getByRole('button', { name: 'Mark UW 34 as familiar' })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    await user.click(screen.getByRole('checkbox', { name: 'Compare 4K' }))
    expect(store.compareIds.value).toEqual([UHD.id])
    expect(screen.getByRole('checkbox', { name: 'Compare 4K' }).checked).toBe(true)
    expect(store.compareEntries.value).toHaveLength(3)
  })

  it('switches to Compare, showing the visualization and the metric grid', async () => {
    const user = userEvent.setup()
    renderApp({ stored: TWO_FAMILIAR })
    await waitForView('Browse')

    await user.click(within(navigation()).getByRole('button', { name: /^Compare/ }))

    expect(
      await screen.findByRole('img', { name: /^Physical size of the compared displays/ }),
    ).not.toBeNull()
    expect(
      await screen.findByRole('table', { name: 'Metrics for each compared display' }),
    ).not.toBeNull()
    expect(document.activeElement).toBe(viewHeading('Compare'))
  })

  it('moves the baseline distance, and the equivalence line follows', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: TWO_FAMILIAR })
    await waitForView('Browse')
    await user.click(within(navigation()).getByRole('button', { name: /^Compare/ }))

    const readLine = () => document.querySelector('.equivalence-line')?.textContent ?? ''
    await waitFor(() => expect(document.querySelector('.compare-data')).not.toBeNull())
    const [baselineDistance] = await screen.findAllByRole('textbox', {
      name: 'Exact distance',
    })
    const before = readLine()
    expect(before).not.toBe('')

    await user.clear(baselineDistance)
    await user.type(baselineDistance, '40')
    await user.tab()

    expect(store.familiar.value[0].distance).toBeCloseTo(40 / 2.54, 6)
    expect(readLine()).not.toBe(before)
  })

  it('opens the display actions from a name, and hides a built-in display until it is shown again', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: ONBOARDED })
    await waitForView('Browse')

    await user.click(screen.getByRole('button', { name: 'UW 34' }))
    const dialog = await screen.findByRole('dialog', { name: 'UW 34' })
    await user.click(within(dialog).getByRole('button', { name: 'Hide from list' }))

    expect(store.hiddenBuiltInIds.value).toEqual([UW.id])
    expect(screen.queryByRole('button', { name: 'UW 34' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(await screen.findByRole('button', { name: 'Show UW 34' }))
    expect(store.hiddenBuiltInIds.value).toEqual([])
    expect(screen.getByRole('button', { name: 'UW 34' })).not.toBeNull()
  })

  it('deletes a custom display only after a second confirmation', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({
      stored: { ...ONBOARDED, customDisplays: [STUDIO] },
    })
    await waitForView('Browse')

    await user.click(screen.getByRole('button', { name: 'Studio' }))
    const dialog = await screen.findByRole('dialog', { name: 'Studio' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(within(dialog).getByText('Delete “Studio”?')).not.toBeNull()
    expect(store.customDisplays.value).toHaveLength(1)

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(store.customDisplays.value).toEqual([])
    expect(screen.queryByRole('button', { name: 'Studio' })).toBeNull()
  })
})

describe('Add and edit', () => {
  it('adds a custom display from the header dialog, and it appears in Browse', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: ONBOARDED })
    await waitForView('Browse')

    await user.click(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Add display' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Add display' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Office 30')
    await user.type(within(dialog).getByRole('textbox', { name: 'Diagonal' }), '30')
    await user.type(within(dialog).getByRole('textbox', { name: 'Width' }), '2560')
    await user.type(within(dialog).getByRole('textbox', { name: 'Height' }), '1600')
    await user.click(within(dialog).getByRole('button', { name: 'Add display' }))

    expect(store.customDisplays.value.map(({ name }) => name)).toEqual(['Office 30'])
    expect(store.compareIds.value).toEqual([])
    expect(await screen.findByRole('button', { name: 'Office 30' })).not.toBeNull()
  })

  it('compares a display added from Compare', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: ONBOARDED })
    await waitForView('Browse')
    await user.click(within(navigation()).getByRole('button', { name: /^Compare/ }))
    await waitForView('Compare')

    await user.click(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Add display' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Add display' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Office 30')
    await user.type(within(dialog).getByRole('textbox', { name: 'Diagonal' }), '30')
    await user.type(within(dialog).getByRole('textbox', { name: 'Width' }), '2560')
    await user.type(within(dialog).getByRole('textbox', { name: 'Height' }), '1600')
    await user.click(within(dialog).getByRole('button', { name: 'Add display' }))

    expect(store.compareEntries.value.map(({ display }) => display.name)).toEqual([
      'FHD',
      'Office 30',
    ])
  })

  it('edits a custom display from its actions dialog', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: { ...ONBOARDED, customDisplays: [STUDIO] } })
    await waitForView('Browse')

    await user.click(screen.getByRole('button', { name: 'Studio' }))
    const actions = await screen.findByRole('dialog', { name: 'Studio' })
    await user.click(within(actions).getByRole('button', { name: 'Edit' }))

    const dialog = await screen.findByRole('dialog', { name: 'Edit display' })
    const name = within(dialog).getByRole('textbox', { name: 'Name' })
    await user.clear(name)
    await user.type(name, 'Desk 27')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(store.customDisplays.value[0].name).toBe('Desk 27')
  })
})

describe('Compare', () => {
  it('adds a display from the field, and refuses a label that is not in the list', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: ONBOARDED })
    await waitForView('Browse')
    await user.click(within(navigation()).getByRole('button', { name: /^Compare/ }))
    await waitForView('Compare')

    const field = screen.getByRole('combobox', {
      name: 'Add a display to the comparison',
    })
    await user.type(field, 'nothing like this')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert').textContent).toBe('Pick a display from the list.')

    await user.clear(field)
    await user.type(field, addLabelOf({ display: UHD, lang: 'en' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(store.compareIds.value).toEqual([UHD.id])
  })

  it('hides a familiar display from Compare, and shows it again', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: TWO_FAMILIAR })
    await waitForView('Browse')
    await user.click(within(navigation()).getByRole('button', { name: /^Compare/ }))
    await waitForView('Compare')

    await user.click(screen.getByRole('button', { name: 'Hide 27″ 4K from Compare' }))
    expect(store.hiddenFamiliarIds.value).toEqual([UHD.id])
    expect(store.compareEntries.value.map(({ display }) => display.id)).toEqual([FHD.id])

    await user.click(screen.getByRole('button', { name: 'Show 27″ 4K in Compare' }))
    expect(store.hiddenFamiliarIds.value).toEqual([])
  })
})

describe('Scale preset in the header', () => {
  it('switches the preset from Browse and from Compare, through the setting Settings uses', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: ONBOARDED })
    await waitForView('Browse')

    const browseGroup = screen.getByRole('group', { name: 'Scale preset' })
    await user.click(within(browseGroup).getByRole('radio', { name: 'macOS' }))
    expect(store.presetId.value).toBe('macos')
    expect(within(browseGroup).getByRole('radio', { name: 'macOS' }).checked).toBe(true)

    await user.click(within(navigation()).getByRole('button', { name: /^Compare/ }))
    await waitForView('Compare')
    const compareGroup = screen.getByRole('group', { name: 'Scale preset' })
    expect(within(compareGroup).getByRole('radio', { name: 'macOS' }).checked).toBe(true)
  })
})

describe('Settings', () => {
  it('switching to Čeština changes the texts, uses decimal commas and sets the page language', async () => {
    const user = userEvent.setup()
    renderApp({ stored: ONBOARDED })
    await waitForView('Browse')

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(await screen.findByRole('radio', { name: 'Čeština' }))

    expect(document.documentElement.lang).toBe('cs')
    expect(screen.getByRole('button', { name: 'Procházet' })).not.toBeNull()
    expect(screen.getByText('14,2″')).not.toBeNull()
  })

  it('switching to imperial units changes the length units in Compare', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: TWO_FAMILIAR })
    await waitForView('Browse')

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(await screen.findByRole('radio', { name: 'Imperial' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Settings' })).getByRole('button', {
        name: 'Close',
      }),
    )
    await user.click(within(navigation()).getByRole('button', { name: /^Compare/ }))

    expect(store.units.value).toBe('imperial')
    expect((await screen.findAllByText('in')).length).toBeGreaterThan(0)
    expect(screen.queryAllByText('cm')).toHaveLength(0)
  })

  it('restores a hidden built-in display from the list in Settings', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: { ...ONBOARDED, hiddenBuiltInIds: [MBP.id] } })
    await waitForView('Browse')
    expect(screen.queryByRole('button', { name: 'MacBook Pro 14″' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(await screen.findByRole('button', { name: 'Show MacBook Pro 14″' }))

    expect(store.hiddenBuiltInIds.value).toEqual([])
  })
})

describe('Shared view', () => {
  /** A link that shows 4K as the only familiar display, while the person's own set is FHD. */
  const sharedHash = encodeState({
    view: 'browse',
    familiar: [{ id: UHD.id, distance: 23.622047244094489, scale: 1.5 }],
    baselineId: UHD.id,
  })

  it('"Keep it" adopts the shared comparison and hides the banner', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: ONBOARDED, hash: sharedHash })
    const banner = await screen.findByRole('region', { name: 'Shared comparison' })
    expect(store.isSharedView.value).toBe(true)

    await user.click(within(banner).getByRole('button', { name: 'Keep it' }))

    expect(screen.queryByRole('region', { name: 'Shared comparison' })).toBeNull()
    expect(store.familiar.value.map(({ id }) => id)).toEqual([UHD.id])
  })

  it('"Back to mine" returns to the stored set and drops the shared comparison', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: ONBOARDED, hash: sharedHash })
    const banner = await screen.findByRole('region', { name: 'Shared comparison' })

    await user.click(within(banner).getByRole('button', { name: 'Back to mine' }))

    expect(screen.queryByRole('region', { name: 'Shared comparison' })).toBeNull()
    expect(store.familiar.value.map(({ id }) => id)).toEqual([FHD.id])
    expect(store.isSharedView.value).toBe(false)
  })
})

describe('Shell', () => {
  it('has one main landmark and a skip link to it', async () => {
    renderApp({ stored: ONBOARDED })
    await waitForView('Browse')

    expect(
      screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href'),
    ).toBe('#main')
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(document.getElementById('main').tagName).toBe('MAIN')
  })

  it('copies a link that carries the current state', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderApp({ stored: ONBOARDED })
    await waitForView('Browse')
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(await screen.findByRole('radio', { name: 'Imperial' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    const link = new URL(writeText.mock.calls[0][0])
    expect(decodeState(link.hash).units).toBe('imperial')
    expect(decodeState(link.hash).familiar.map(({ id }) => id)).toEqual([FHD.id])
  })
})

describe('Compare from Browse', () => {
  it('hides a familiar display from Compare with its row checkbox, and shows it again', async () => {
    const user = userEvent.setup()
    const { store } = renderApp({ stored: TWO_FAMILIAR })
    await waitForView('Browse')

    const checkbox = screen.getByRole('checkbox', { name: 'Compare 4K' })
    expect(checkbox.checked).toBe(true)
    await user.click(checkbox)
    expect(store.hiddenFamiliarIds.value).toEqual([UHD.id])

    await user.click(screen.getByRole('checkbox', { name: 'Compare 4K' }))
    expect(store.hiddenFamiliarIds.value).toEqual([])
  })

  it('adds a display to Compare with a long press on its row', async () => {
    const { store } = renderApp({ stored: ONBOARDED })
    await waitForView('Browse')
    const row = screen.getByRole('button', { name: 'UW 34' }).closest('tr')

    vi.useFakeTimers()
    try {
      fireEvent.pointerDown(row, {
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: 4,
        clientY: 4,
      })
      act(() => {
        vi.advanceTimersByTime(500)
      })
      fireEvent.pointerUp(row, { pointerType: 'touch', isPrimary: true, button: 0 })
    } finally {
      vi.useRealTimers()
    }

    expect(store.compareIds.value).toEqual([UW.id])
  })
})

describe('Add display prefetch', () => {
  afterEach(() => {
    delete globalThis.requestIdleCallback
    delete globalThis.cancelIdleCallback
  })

  it('prefetches the Add display dialog when the browser is idle, and still opens it on the click', async () => {
    const user = userEvent.setup()
    const requestIdleCallback = vi.fn((callback) => {
      callback()
      return 1
    })
    globalThis.requestIdleCallback = requestIdleCallback
    globalThis.cancelIdleCallback = vi.fn()
    renderApp({ stored: ONBOARDED })
    await waitForView('Browse')

    await waitFor(() => expect(requestIdleCallback).toHaveBeenCalledTimes(1))
    await user.click(document.querySelector('.app-header__add'))
    expect(await screen.findByRole('dialog', { name: 'Add display' })).not.toBeNull()
  })

  it('prefetches on a hover of the header Add button, and the dialog still opens', async () => {
    const user = userEvent.setup()
    renderApp({ stored: ONBOARDED })
    await waitForView('Browse')

    fireEvent.pointerOver(document.querySelector('.app-header__add'))
    await user.click(document.querySelector('.app-header__add'))

    expect(await screen.findByRole('dialog', { name: 'Add display' })).not.toBeNull()
  })
})
