import { useEffect, useRef, useState } from 'preact/hooks'
import { batch, useSignalEffect } from '@preact/signals'
import { t } from './i18n/index.js'
import { getDisplayMetrics } from './lib/calc/index.js'
import { defaultDistanceFor } from './lib/units.js'
import { encodeState } from './lib/url-state.js'
import { prefetchModule, useLazyModule } from './lib/use-lazy-module.js'
import defaultStore from './state/store.js'
import { pickDefaultScale } from './state/selectors.js'
import { AppHeader } from './components/app-header/app-header.jsx'
import { Browse } from './components/browse/index.js'
import { formatDiagonal } from './components/browse/browse-format.js'
import { SharedBanner } from './components/shared-banner/shared-banner.jsx'
import { Button } from './components/ui/index.js'
import './app.css'

/** @typedef {import('./lib/storage.js').Display} Display */

/** Order of the type filter's options. An untagged display counts as a monitor (F9). */
const TAG_ORDER = ['laptop', 'monitor', 'ultrawide']

/**
 * Types present among the displays, in a fixed order.
 *
 * @param {{ displays: Display[] }} params
 * @returns {string[]}
 *
 * @example
 * tagsOf({ displays: [{ tag: 'laptop' }, {}] }) // ['laptop', 'monitor']
 */
const tagsOf = ({ displays }) => {
  const present = new Set(displays.map(({ tag }) => tag ?? 'monitor'))
  return TAG_ORDER.filter((tag) => present.has(tag))
}

/**
 * Aspect labels present among the displays, from the narrowest to the widest, so the
 * filter reads in a sensible order.
 *
 * @param {object} params
 * @param {Display[]} params.displays
 * @param {Map<string, { aspect: { label: string } }>} params.metricsById
 * @returns {string[]}
 */
const aspectsOf = ({ displays, metricsById }) => {
  const byRatio = [...displays].sort((a, b) => a.width / a.height - b.width / b.height)
  const labels = byRatio.map(({ id }) => metricsById.get(id)?.aspect.label)
  return [...new Set(labels.filter(Boolean))]
}

/*
 * Loaders for the parts a first paint does not need. Each is its own chunk, fetched when it is
 * first wanted (see `useLazyModule`), and precached by the service worker, so it works offline
 * after the first visit. They are module-level, so their identity is stable across renders.
 */

/** First-run onboarding (F2). Shown only until the person has finished it. */
const loadOnboarding = () => import('./components/onboarding/onboarding.jsx')

/** The Compare view: the visualization, the membership manager and the data. */
const loadCompareView = () => import('./components/compare-view/compare-view.jsx')

/** The actions dialog for one display, opened from its name in Browse. */
const loadDisplayActions = () =>
  import('./components/display-actions/display-actions.jsx')

/** The "Add display" and "Edit display" dialog. The most used dialog, so it is prefetched. */
const loadAddDisplayDialog = () =>
  import('./components/add-display/add-display-dialog.jsx')

/**
 * The settings dialog: its shell, the settings panel and the data transfer. They open together,
 * so they share one loader.
 */
const loadSettings = () =>
  Promise.all([
    import('./components/ui/dialog/dialog.jsx'),
    import('./components/settings/settings-panel.jsx'),
    import('./components/data-transfer/data-transfer.jsx'),
  ]).then(([dialog, panel, transfer]) => ({
    Dialog: dialog.Dialog,
    SettingsPanel: panel.SettingsPanel,
    DataTransfer: transfer.DataTransfer,
  }))

/**
 * Runs a function when the browser is idle. Browsers without `requestIdleCallback` skip it,
 * and the hover and focus prefetch still applies there.
 *
 * @param {() => void} callback
 * @returns {() => void} Cancels the callback if it has not run yet.
 */
const whenIdle = (callback) => {
  if (typeof globalThis.requestIdleCallback !== 'function') return () => {}
  const id = globalThis.requestIdleCallback(callback)
  return () => globalThis.cancelIdleCallback?.(id)
}

/**
 * The address of the current state: the page address with the link hash (F19). It is the
 * same hash the store writes, so "Copy link" copies what the address bar shows.
 *
 * @param {object} params
 * @param {string} params.hash `#s=…`
 * @returns {string}
 */
const buildShareUrl = ({ hash }) => {
  const { origin = '', pathname = '' } = globalThis.location ?? {}
  return `${origin}${pathname}${hash}`
}

/**
 * Shown until the stored state is loaded, so nothing flashes with the wrong view.
 *
 * @returns {import('preact').JSX.Element}
 */
const LoadingState = () => (
  <main class="app-loading">
    <p role="status">{t('common.loading')}</p>
  </main>
)

/**
 * Shown in place of a view while its chunk loads. A `div`, because it sits inside `<main>`.
 *
 * @returns {import('preact').JSX.Element}
 */
const ViewLoading = () => (
  <div class="app-loading">
    <p role="status">{t('common.loading')}</p>
  </div>
)

/**
 * The first-run gate (F2). Onboarding is a full page, and the app waits until the person
 * has picked at least one familiar display. The first pick is the baseline (F3).
 *
 * @param {object} props
 * @param {import('./state/store.js').Store} props.store
 * @param {() => void} props.onDone Called after onboarding is finished.
 * @returns {import('preact').JSX.Element}
 */
const OnboardingGate = ({ store, onDone }) => {
  const onboarding = useLazyModule(loadOnboarding)

  /**
   * The starting values for a display picked in onboarding: its default distance, and the
   * best comfortable scale at that distance under the current preset (the same rule the
   * store uses when a display is marked familiar).
   *
   * @param {Display} display
   * @returns {{ distance: number, scale: number }}
   */
  const getDefaults = (display) => {
    const distance = defaultDistanceFor(display)
    const scale = pickDefaultScale({
      display,
      metrics: store.metricsById.value.get(display.id) ?? getDisplayMetrics(display),
      scaling: {
        presetId: store.presetId.value,
        customScales: store.customScales.value,
        comfort: store.comfort.value,
      },
      distance,
    })
    return { distance, scale }
  }

  /**
   * Add a display from the inline form. It becomes a custom display, and onboarding marks
   * the picked ones familiar when the person finishes.
   *
   * @param {object} payload
   * @returns {Display|null}
   */
  const handleAddCustom = (payload) => {
    const id = store.addCustomDisplay({ ...payload, isFamiliar: false })
    return id ? (store.displaysById.value.get(id) ?? null) : null
  }

  /**
   * Finish: mark the picked displays familiar in pick order, with the values from the
   * second step, then complete onboarding.
   *
   * @param {{ familiar: Array<{ id: string, distance: number, scale: number }> }} result
   */
  const handleComplete = ({ familiar }) => {
    if (familiar.length === 0) return
    let isDone = false
    batch(() => {
      familiar.forEach(({ id, distance, scale }) => {
        if (!store.familiar.value.some((entry) => entry.id === id))
          store.toggleFamiliar(id)
        store.setFamiliarSettings({ id, distance, scale })
      })
      store.setBaseline(familiar[0].id)
      isDone = store.completeOnboarding()
    })
    if (isDone) onDone()
  }

  if (!onboarding) return <LoadingState />
  const { Onboarding } = onboarding
  return (
    <Onboarding
      displays={store.allDisplays.value}
      units={store.units.value}
      onUnitsChange={(units) => store.setUnits(units)}
      scaleOptionsFor={store.scaleOptionsFor}
      getDefaults={getDefaults}
      onAddCustom={handleAddCustom}
      onComplete={handleComplete}
    />
  )
}

/**
 * The app itself, after onboarding: the header, the shared-view banner, the current view
 * (Browse or Compare), and the dialogs for actions, adding or editing a display, and
 * settings.
 *
 * Focus. When the view changes, or right after onboarding, the view heading takes focus,
 * so a screen reader announces the new view. Dialogs return focus to the control that
 * opened them.
 *
 * @param {object} props
 * @param {import('./state/store.js').Store} props.store
 * @param {boolean} [props.shouldFocusHeading=false] Focus the view heading on mount.
 * @returns {import('preact').JSX.Element}
 */
const AppShell = ({ store, shouldFocusHeading = false }) => {
  const view = store.view.value
  const units = store.units.value
  const lang = store.locale.value
  const familiar = store.familiar.value
  const familiarIds = new Set(familiar.map(({ id }) => id))
  const compareIds = store.compareIds.value
  const hiddenFamiliarIds = store.hiddenFamiliarIds.value
  const allDisplays = store.allDisplays.value
  const entries = store.compareEntries.value
  const hiddenBuiltIns = store.builtInDisplays.value.filter(({ id }) =>
    store.hiddenBuiltInIds.value.includes(id),
  )
  const hiddenFamiliar = familiar
    .filter(({ id }) => hiddenFamiliarIds.includes(id))
    .map(({ id }) => store.displaysById.value.get(id))
    .filter(Boolean)
  const addable = allDisplays.filter(
    ({ id }) => !familiarIds.has(id) && !compareIds.includes(id),
  )

  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [actionsId, setActionsId] = useState(null)
  const [dialog, setDialog] = useState(null)
  const headingRef = useRef(null)
  const shellRef = useRef(null)
  const pendingFocus = useRef(shouldFocusHeading)

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    headingRef.current?.focus()
  }, [view])

  // The visualization sticks under the header on phones. Its height changes with the
  // wrapping of the header, so it is measured and handed to the Compare view.
  useEffect(() => {
    const shell = shellRef.current
    const header = shell?.querySelector('.app-header')
    if (!shell || !header) return undefined
    const apply = () =>
      shell.style.setProperty('--compare-visual-sticky-top', `${header.offsetHeight}px`)
    apply()
    if (typeof globalThis.ResizeObserver !== 'function') return undefined
    const observer = new globalThis.ResizeObserver(apply)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  // The Add display dialog is the dialog people open most, so its chunk is fetched before the
  // first click: on a hover or focus of an Add button, and when the browser is idle.
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return undefined
    /** @param {Event} event */
    const handleIntent = (event) => {
      const target = event.target?.closest?.(
        '.app-header__add, .familiar-strip__item:last-child',
      )
      if (target) prefetchModule(loadAddDisplayDialog)
    }
    shell.addEventListener('pointerover', handleIntent)
    shell.addEventListener('focusin', handleIntent)
    const cancelIdle = whenIdle(() => prefetchModule(loadAddDisplayDialog))
    return () => {
      shell.removeEventListener('pointerover', handleIntent)
      shell.removeEventListener('focusin', handleIntent)
      cancelIdle()
    }
  }, [])

  /**
   * Switch views, and move focus to the new view's heading.
   *
   * @param {'browse'|'compare'} next
   */
  const changeView = (next) => {
    if (next === view) return
    pendingFocus.current = true
    store.setView(next)
  }

  const openAdd = () => setDialog({ mode: 'add' })
  const closeDialog = () => setDialog(null)
  const openSettings = () => setSettingsOpen(true)
  const closeSettings = () => setSettingsOpen(false)

  const editDisplay =
    dialog?.mode === 'edit' ? (store.displaysById.value.get(dialog.id) ?? null) : null
  const isAddOpen = dialog?.mode === 'add' || editDisplay !== null

  const compareModule = useLazyModule(loadCompareView, view === 'compare')
  const actionsModule = useLazyModule(loadDisplayActions, actionsId !== null)
  const addModule = useLazyModule(loadAddDisplayDialog, isAddOpen)
  const settingsModule = useLazyModule(loadSettings, isSettingsOpen)
  const editInitial = editDisplay
    ? {
        name: editDisplay.name,
        diagonal: editDisplay.diagonal,
        width: editDisplay.width,
        height: editDisplay.height,
        tag: editDisplay.tag,
        isEditing: true,
      }
    : undefined

  /**
   * Save the add or edit form. A display added while Compare is shown joins the comparison,
   * unless it is familiar (familiar displays are always compared).
   *
   * @param {object} payload
   */
  const submitDialog = (payload) => {
    if (dialog?.mode === 'edit') {
      store.updateCustomDisplay({
        id: dialog.id,
        name: payload.name,
        diagonal: payload.diagonal,
        width: payload.width,
        height: payload.height,
        tag: payload.tag,
      })
    } else {
      const id = store.addCustomDisplay(payload)
      if (id && view === 'compare' && !payload.isFamiliar) store.toggleCompare(id)
    }
    setDialog(null)
  }

  const actionsDisplay =
    actionsId === null ? null : (store.displaysById.value.get(actionsId) ?? null)
  const actionsState = {
    isFamiliar: actionsId !== null && familiarIds.has(actionsId),
    isBaseline: actionsId !== null && store.baselineId.value === actionsId,
    isCompared:
      actionsId !== null &&
      (familiarIds.has(actionsId)
        ? !hiddenFamiliarIds.includes(actionsId)
        : compareIds.includes(actionsId)),
  }

  /** Close the actions dialog, then open the form for the display. */
  const startEdit = () => {
    const id = actionsId
    setActionsId(null)
    if (id !== null) setDialog({ mode: 'edit', id })
  }

  /** Delete the custom display, and close the dialog. */
  const deleteAction = () => {
    if (actionsId !== null) store.deleteCustomDisplay(actionsId)
    setActionsId(null)
  }

  /** Hide the built-in display from the list, and close the dialog. */
  const hideAction = () => {
    if (actionsId !== null) store.hideBuiltIn(actionsId)
    setActionsId(null)
  }

  /**
   * The Compare checkbox and the long press on a row. A familiar display is hidden or shown
   * in Compare (the store refuses to add it), and a candidate is added or removed.
   *
   * @param {string} id
   */
  const toggleCompareFor = (id) => {
    if (familiarIds.has(id)) store.toggleFamiliarHidden(id)
    else store.toggleCompare(id)
  }

  /**
   * Compare action of the dialog. A familiar display is hidden or shown, and a candidate
   * is added or removed.
   */
  const toggleCompareAction = () => {
    if (actionsId === null) return
    if (actionsState.isFamiliar) store.toggleFamiliarHidden(actionsId)
    else store.toggleCompare(actionsId)
  }

  const linkUrl = buildShareUrl({ hash: encodeState(store.getViewState()) })
  const viewTitle = view === 'compare' ? t('common.compare') : t('common.browse')

  return (
    <div class="app-shell" ref={shellRef}>
      <a class="skip-link" href="#main">
        {t('app.skipToContent')}
      </a>

      <AppHeader
        view={view}
        compareCount={entries.length}
        onViewChange={changeView}
        onAdd={openAdd}
        onOpenSettings={openSettings}
        linkUrl={linkUrl}
      />

      <main id="main" class="app-main" tabIndex={-1}>
        <h1 class="visually-hidden" ref={headingRef} tabIndex={-1}>
          {viewTitle}
        </h1>

        {store.isSharedView.value && (
          <SharedBanner
            onKeep={() => store.keepSharedView()}
            onDiscard={() => store.discardSharedView()}
          />
        )}

        {view === 'compare' ? (
          compareModule ? (
            <compareModule.CompareView
              entries={entries}
              units={units}
              mode={store.vizMode.value}
              sizeMatchBy={store.sizeMatchBy.value}
              hiddenFamiliar={hiddenFamiliar}
              addable={addable}
              onModeChange={(mode) => store.setVizMode(mode)}
              onSizeMatchByChange={(by) => store.setSizeMatchBy(by)}
              onDistanceChange={({ id, distance }) =>
                store.setCompareSettings({ id, distance })
              }
              onScaleChange={({ id, scale }) => store.setCompareSettings({ id, scale })}
              onApplyEquivalent={({ id, kind }) => store.applyEquivalent({ id, kind })}
              onToggleCompare={(id) => store.toggleCompare(id)}
              onToggleFamiliarHidden={(id) => store.toggleFamiliarHidden(id)}
              onGoBrowse={() => changeView('browse')}
            />
          ) : (
            <ViewLoading />
          )
        ) : (
          <Browse
            rows={store.browseRows.value}
            familiarRows={store.familiarRows.value}
            filters={store.filters.value}
            sort={store.sort.value}
            units={units}
            availableTags={tagsOf({ displays: allDisplays })}
            availableAspects={aspectsOf({
              displays: allDisplays,
              metricsById: store.metricsById.value,
            })}
            onFiltersChange={(patch) => store.setFilters(patch)}
            onSort={({ key }) => store.setSort({ key })}
            onToggleFamiliar={(id) => store.toggleFamiliar(id)}
            onToggleCompare={toggleCompareFor}
            onSetBaseline={(id) => store.setBaseline(id)}
            onAdd={openAdd}
            onOpenDisplay={(id) => setActionsId(id)}
            compareCount={entries.length}
            onGoCompare={() => changeView('compare')}
          />
        )}
      </main>

      {actionsModule && (
        <actionsModule.DisplayActions
          isOpen={actionsDisplay !== null}
          onClose={() => setActionsId(null)}
          display={actionsDisplay}
          isFamiliar={actionsState.isFamiliar}
          isBaseline={actionsState.isBaseline}
          isCompared={actionsState.isCompared}
          onToggleFamiliar={() => actionsId !== null && store.toggleFamiliar(actionsId)}
          onSetBaseline={() => actionsId !== null && store.setBaseline(actionsId)}
          onToggleCompare={toggleCompareAction}
          onEdit={startEdit}
          onDelete={deleteAction}
          onHide={hideAction}
        />
      )}

      {addModule && (
        <addModule.AddDisplayDialog
          isOpen={isAddOpen}
          onClose={closeDialog}
          initial={editInitial}
          units={units}
          scaleOptionsFor={store.scaleOptionsFor}
          onSubmit={submitDialog}
        />
      )}

      {settingsModule && (
        <settingsModule.Dialog
          isOpen={isSettingsOpen}
          onClose={closeSettings}
          title={t('common.settings')}
          closeLabel={t('common.close')}
        >
          <settingsModule.SettingsPanel
            units={units}
            locale={lang}
            presetId={store.presetId.value}
            customScales={store.customScales.value}
            comfort={store.comfort.value}
            onUnitsChange={(value) => store.setUnits(value)}
            onLocaleChange={(value) => store.setLocale(value)}
            onPresetChange={(value) => store.setPresetId(value)}
            onAddCustomScale={(scale) => store.addCustomScale(scale)}
            onRemoveCustomScale={(scale) => store.removeCustomScale(scale)}
            onComfortChange={(patch) => store.setComfort(patch)}
          />

          <settingsModule.DataTransfer
            onExport={() => store.exportJson()}
            onImport={(text) => store.importJson(text)}
          />

          <section class="app-settings__section" aria-labelledby="app-hidden-heading">
            <h3 id="app-hidden-heading" class="app-settings__heading">
              {t('app.hidden.title')}
            </h3>
            {hiddenBuiltIns.length === 0 ? (
              <p class="app-settings__hint">{t('app.hidden.empty')}</p>
            ) : (
              <>
                <p class="app-settings__hint">{t('app.hidden.description')}</p>
                <ul class="app-settings__list">
                  {hiddenBuiltIns.map((display) => (
                    <li class="app-settings__item" key={display.id}>
                      <span>
                        {display.name}{' '}
                        <span class="numeric">
                          {formatDiagonal({ diagonal: display.diagonal, locale: lang })}
                        </span>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={t('app.hidden.showName', { name: display.name })}
                        onClick={() => store.unhideBuiltIn(display.id)}
                      >
                        {t('app.hidden.show')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </settingsModule.Dialog>
      )}
    </div>
  )
}

/**
 * The app shell. It loads the stored state, shows onboarding until the person has a
 * familiar set, and then the app. The `<html lang>` follows the language.
 *
 * `store` defaults to the app's singleton. Tests pass their own store.
 *
 * @param {object} props
 * @param {import('./state/store.js').Store} [props.store] The store to render.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * render(<App />, document.getElementById('app'))
 */
export const App = ({ store = defaultStore }) => {
  const [isJustOnboarded, setJustOnboarded] = useState(false)

  useSignalEffect(() => {
    document.documentElement.lang = store.locale.value
  })

  useEffect(() => {
    store.hydrate()
  }, [store])

  if (!store.isHydrated.value) return <LoadingState />
  if (!store.isOnboarded.value) {
    return <OnboardingGate store={store} onDone={() => setJustOnboarded(true)} />
  }
  return <AppShell store={store} shouldFocusHeading={isJustOnboarded} />
}
