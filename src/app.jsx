import { useEffect, useRef, useState } from 'preact/hooks'
import { batch, useSignalEffect } from '@preact/signals'
import { t } from './i18n/index.js'
import { getDisplayMetrics } from './lib/calc/index.js'
import { defaultDistanceFor } from './lib/units.js'
import { encodeState } from './lib/url-state.js'
import defaultStore from './state/store.js'
import { pickDefaultScale } from './state/selectors.js'
import { AddDisplayDialog } from './components/add-display/add-display-dialog.jsx'
import { AppHeader } from './components/app-header/app-header.jsx'
import { Browse } from './components/browse/index.js'
import { formatDiagonal } from './components/browse/browse-format.js'
import { CompareView } from './components/compare-view/compare-view.jsx'
import { DataTransfer } from './components/data-transfer/data-transfer.jsx'
import { DisplayActions } from './components/display-actions/display-actions.jsx'
import { Onboarding } from './components/onboarding/onboarding.jsx'
import { SettingsPanel } from './components/settings/settings-panel.jsx'
import { SharedBanner } from './components/shared-banner/shared-banner.jsx'
import { Button, Dialog } from './components/ui/index.js'
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
 * The first-run gate (F2). Onboarding is a full page, and the app waits until the person
 * has picked at least one familiar display. The first pick is the baseline (F3).
 *
 * @param {object} props
 * @param {import('./state/store.js').Store} props.store
 * @param {() => void} props.onDone Called after onboarding is finished.
 * @returns {import('preact').JSX.Element}
 */
const OnboardingGate = ({ store, onDone }) => {
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
          <CompareView
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
            onToggleCompare={(id) => store.toggleCompare(id)}
            onSetBaseline={(id) => store.setBaseline(id)}
            onAdd={openAdd}
            onOpenDisplay={(id) => setActionsId(id)}
            compareCount={entries.length}
            onGoCompare={() => changeView('compare')}
          />
        )}
      </main>

      <DisplayActions
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

      <AddDisplayDialog
        isOpen={isAddOpen}
        onClose={closeDialog}
        initial={editInitial}
        units={units}
        scaleOptionsFor={store.scaleOptionsFor}
        onSubmit={submitDialog}
      />

      <Dialog
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        title={t('common.settings')}
        closeLabel={t('common.close')}
      >
        <SettingsPanel
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

        <DataTransfer
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
      </Dialog>
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
