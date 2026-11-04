import { useEffect, useState } from 'preact/hooks'

/**
 * Loads a module the first time it is wanted, and keeps it after that. The app uses it for
 * the views and dialogs that a first paint does not need, so their code is a separate chunk
 * and stays out of the first download (docs/DEPLOYMENT.md, "Bundle size").
 *
 * Until the module arrives, the hook returns `null`, and the caller shows nothing, or a
 * fallback. A failed load also gives `null`. The browser caches a failed import, so a
 * later attempt in the same page fails too; a reload fetches it again.
 *
 * `load` should be a module-level function (for example `() => import('./x.jsx')`), so that
 * its identity does not change between renders and each call site starts one import.
 *
 * @param {() => Promise<object>} load Starts the import and resolves with the module.
 * @param {boolean} [isWanted=true] Load once this is true. The module then stays loaded.
 * @returns {object|null} The module, or null until it arrives.
 *
 * @example
 * const dialog = useLazyModule(loadAddDisplay, isAddOpen)
 * return dialog && <dialog.AddDisplayDialog isOpen={isAddOpen} />
 */
export const useLazyModule = (load, isWanted = true) => {
  const [loaded, setLoaded] = useState(null)

  useEffect(() => {
    if (!isWanted) return undefined
    let isActive = true
    load().then(
      (mod) => {
        if (isActive) setLoaded(() => mod)
      },
      () => {},
    )
    return () => {
      isActive = false
    }
  }, [isWanted, load])

  return loaded
}

/**
 * Starts a module's import ahead of time, so that opening it later does not wait for the
 * download. A failed prefetch is ignored: the real open tries again and shows the failure.
 *
 * @param {() => Promise<object>} load The same loader that `useLazyModule` gets.
 * @returns {void}
 *
 * @example
 * prefetchModule(loadAddDisplay)
 */
export const prefetchModule = (load) => {
  load().catch(() => {})
}
