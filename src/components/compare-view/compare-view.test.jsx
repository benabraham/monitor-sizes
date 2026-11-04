import { render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStore } from '../../state/store.js'
import { CompareView } from './compare-view.jsx'
import { addLabelOf } from './compare-manager.jsx'

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
const UW = {
  id: '34-uw-3440x1440',
  name: 'UW 34',
  diagonal: 34,
  width: 3440,
  height: 1440,
  tag: 'ultrawide',
}
const MBP = {
  id: '14-2-3024x1964',
  name: 'MacBook Pro 14″',
  diagonal: 14.2,
  width: 3024,
  height: 1964,
  tag: 'laptop',
}

/** Stores made in a test are disposed afterwards. */
const stores = []
afterEach(() => {
  stores.splice(0).forEach((store) => store.dispose())
})

/**
 * A hydrated store whose stored state has the given familiar set, with `compare` added to
 * Compare as candidates.
 *
 * @param {object} options
 * @param {Array<{ id: string, distance: number, scale: number }>} options.familiar
 * @param {string[]} [options.compare=[]]
 * @returns {Promise<import('../../state/store.js').Store>}
 */
const hydratedStore = async ({ familiar, compare = [] }) => {
  const store = createStore({
    seed: [FHD, UHD, UW, MBP],
    storage: {
      loadPersisted: async () => ({
        customDisplays: [],
        hiddenBuiltInIds: [],
        familiar,
        baselineId: familiar[0]?.id ?? null,
        preferences: {},
        isOnboarded: true,
      }),
      savePersisted: async () => {},
    },
    location: { hash: '' },
    history: null,
    detectPreset: () => 'windows',
    detectLang: () => 'en',
  })
  stores.push(store)
  await store.hydrate()
  compare.forEach((id) => store.toggleCompare(id))
  return store
}

/** Baseline FHD and familiar 4K. */
const familiarPair = [
  { id: FHD.id, distance: 23.622047244094489, scale: 1 },
  { id: UHD.id, distance: 23.622047244094489, scale: 1.5 },
]

/** Props every test needs, with spies for the callbacks. */
const viewProps = (overrides = {}) => ({
  entries: [],
  units: 'metric',
  mode: 'physical',
  sizeMatchBy: 'height',
  hiddenFamiliar: [],
  addable: [],
  onModeChange: vi.fn(),
  onSizeMatchByChange: vi.fn(),
  onDistanceChange: vi.fn(),
  onScaleChange: vi.fn(),
  onApplyEquivalent: vi.fn(),
  onToggleCompare: vi.fn(),
  onToggleFamiliarHidden: vi.fn(),
  onGoBrowse: vi.fn(),
  ...overrides,
})

describe('CompareView', () => {
  it('shows a hint and a way back to Browse when only the baseline is compared', async () => {
    const user = userEvent.setup()
    const store = await hydratedStore({ familiar: [familiarPair[0]] })
    const props = viewProps({ entries: store.compareEntries.value })
    render(<CompareView {...props} />)

    expect(
      screen.getByText('Pick displays to compare in Browse or add one here.'),
    ).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Go to Browse' }))
    expect(props.onGoBrowse).toHaveBeenCalledTimes(1)
  })

  it('shows the metric and scaling sections for the compared displays', async () => {
    const store = await hydratedStore({ familiar: familiarPair })
    render(<CompareView {...viewProps({ entries: store.compareEntries.value })} />)

    // The metric and scaling sections load on first use, so wait for them.
    expect(await screen.findByRole('heading', { name: 'Metrics' })).not.toBeNull()
    expect(await screen.findByRole('heading', { name: 'Scaling' })).not.toBeNull()
  })

  it('shows no data sections when nothing is compared', () => {
    render(<CompareView {...viewProps()} />)
    expect(screen.queryByRole('heading', { name: 'Metrics' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Scaling' })).toBeNull()
  })

  it('hides a familiar display, and offers to show a hidden one again', async () => {
    const user = userEvent.setup()
    const store = await hydratedStore({ familiar: familiarPair })
    const props = viewProps({
      entries: store.compareEntries.value,
      hiddenFamiliar: [MBP],
    })
    render(<CompareView {...props} />)

    await user.click(screen.getByRole('button', { name: 'Hide 27″ 4K from Compare' }))
    expect(props.onToggleFamiliarHidden).toHaveBeenCalledWith(UHD.id)

    await user.click(
      screen.getByRole('button', { name: /^Show 14\.2″ MacBook Pro 14″ in Compare$/ }),
    )
    expect(props.onToggleFamiliarHidden).toHaveBeenLastCalledWith(MBP.id)
  })

  it('removes a candidate from Compare', async () => {
    const user = userEvent.setup()
    const store = await hydratedStore({ familiar: [familiarPair[0]], compare: [UW.id] })
    const props = viewProps({ entries: store.compareEntries.value })
    render(<CompareView {...props} />)

    await user.click(
      screen.getByRole('button', { name: 'Remove 34″ UW 34 from Compare' }),
    )
    expect(props.onToggleCompare).toHaveBeenCalledWith(UW.id)
  })

  it('adds the display picked in the field, and refuses a label that is not listed', async () => {
    const user = userEvent.setup()
    const props = viewProps({ addable: [UW] })
    render(<CompareView {...props} />)

    const field = screen.getByRole('combobox', {
      name: 'Add a display to the comparison',
    })
    await user.type(field, 'nope')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert').textContent).toBe('Pick a display from the list.')
    expect(props.onToggleCompare).not.toHaveBeenCalled()

    await user.clear(field)
    await user.type(field, addLabelOf({ display: UW, lang: 'en' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(props.onToggleCompare).toHaveBeenCalledWith(UW.id)
  })

  it('passes a distance typed for the baseline up in inches', async () => {
    const user = userEvent.setup()
    const store = await hydratedStore({ familiar: familiarPair })
    const props = viewProps({ entries: store.compareEntries.value })
    render(<CompareView {...props} />)

    const [baselineField] = screen.getAllByRole('textbox', { name: 'Exact distance' })
    await user.clear(baselineField)
    await user.type(baselineField, '40')
    await user.tab()

    expect(props.onDistanceChange).toHaveBeenCalledTimes(1)
    const [payload] = props.onDistanceChange.mock.calls[0]
    expect(payload.id).toBe(FHD.id)
    expect(payload.distance).toBeCloseTo(40 / 2.54, 6)
  })

  it('marks the baseline and lists the compared displays in the manager', async () => {
    const store = await hydratedStore({ familiar: familiarPair })
    render(<CompareView {...viewProps({ entries: store.compareEntries.value })} />)

    const manager = screen.getByRole('region', { name: 'Displays in this comparison' })
    const items = within(manager).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Baseline'),
      expect.stringContaining('Familiar'),
    ])
  })
})
