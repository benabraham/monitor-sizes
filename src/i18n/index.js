/**
 * Translations: the locale signal, language detection, lazy catalogues and the `t()`
 * lookup (PRD: F16, UX; ARCHITECTURE: i18n).
 *
 * Each language is its own chunk. `loadLocale(lang)` imports the language's barrel
 * (`locales/<lang>/index.js`), which holds that language's namespace files. The barrel is
 * flattened into dotted keys prefixed by the namespace:
 *
 * ```js
 * // locales/en/metrics.js
 * export default { ppi: { label: 'PPI' } }
 * // → messages.en['metrics.ppi.label'] === 'PPI'
 * ```
 *
 * `t()` stays synchronous. It reads {@link locale} and {@link catalogVersion}, so a
 * component that rendered before its catalogue arrived re-renders when it does.
 *
 * See docs/I18N.md for the workflow.
 *
 * @module i18n
 */

import { effect, signal } from '@preact/signals'

/**
 * @typedef {'en'|'cs'} Locale
 */

/**
 * Active UI language. Components that call {@link t} during render re-render
 * when it changes, because the signal is read there.
 *
 * It starts as `'en'`. The state layer sets it on hydrate, from the URL or saved
 * preference, or from {@link detectLocale}. Setting it starts loading that
 * language's catalogue (see the effect below).
 *
 * @type {import('@preact/signals').Signal<Locale>}
 *
 * @example
 * locale.value = 'cs'
 */
export const locale = signal('en')

/**
 * Counts the catalogues that have finished loading. {@link t} reads it, so text
 * rendered before a catalogue arrived (English fallback, or the key) is replaced.
 *
 * @type {import('@preact/signals').Signal<number>}
 */
export const catalogVersion = signal(0)

/**
 * One dynamic import per language. Keep the paths literal, so the bundler can see
 * each language as its own chunk.
 *
 * @type {Record<Locale, () => Promise<{ default: Record<string, object> }>>}
 */
const loaders = {
  en: () => import('./locales/en/index.js'),
  cs: () => import('./locales/cs/index.js'),
}

/** Matches a namespace file path inside a language barrel, for example `./common.js`. */
const NAMESPACE_PATH = /^\.\/([^/]+)\.js$/

/** Loads in progress, by language. Cleared on failure so a later call retries. */
const pending = new Map()

/**
 * Flat message catalogue, `{ en: { 'common.same': 'same', … }, cs: { … } }`, filled as
 * each language loads. Exported for tests and for the parity check. Treat it as
 * read-only in app code, and load a language with {@link loadLocale} before reading it.
 *
 * @type {Record<string, Record<string, string>>}
 */
export const messages = {}

/**
 * True for plain objects (not arrays, dates or null). Only these are flattened.
 *
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Flatten a nested message object into dotted keys. Leaves are strings.
 *
 * @param {object} params
 * @param {Record<string, unknown>} params.source Nested messages.
 * @param {string} params.prefix Key prefix, for example the namespace.
 * @returns {Record<string, string>} Flat map of dotted keys.
 *
 * @example
 * flattenMessages({ source: { a: { b: 'x' } }, prefix: 'ns' }) // { 'ns.a.b': 'x' }
 */
const flattenMessages = ({ source, prefix }) =>
  Object.entries(source).reduce((flat, [key, value]) => {
    const path = `${prefix}.${key}`
    if (isPlainObject(value)) {
      return Object.assign(flat, flattenMessages({ source: value, prefix: path }))
    }
    return Object.assign(flat, { [path]: value })
  }, {})

/**
 * Build one language's flat catalogue from its namespace modules. A file without a
 * default export is a developer error, so it throws early.
 *
 * @param {object} params
 * @param {string} params.lang Language code, used in error messages.
 * @param {Record<string, unknown>} params.files Module map from a language barrel,
 *   keyed by path, for example `{ './common.js': { default: {…} } }`.
 * @returns {Record<string, string>}
 *
 * @example
 * buildMessages({ lang: 'en', files: { './common.js': { default: { same: 'same' } } } })
 * // { 'common.same': 'same' }
 */
const buildMessages = ({ lang, files }) =>
  Object.entries(files).reduce((flat, [path, module]) => {
    const match = path.match(NAMESPACE_PATH)
    if (!match) throw new Error(`Unexpected locale file path: ${lang}/${path}`)
    const [, namespace] = match
    if (!isPlainObject(module?.default)) {
      throw new Error(`Locale file ${lang}/${path} must have a default export object`)
    }
    return Object.assign(
      flat,
      flattenMessages({ source: module.default, prefix: namespace }),
    )
  }, {})

/**
 * Load one language's catalogue. Idempotent: the first call starts the import, later
 * calls share its promise, and a loaded language resolves at once. The promise rejects
 * when the chunk cannot be fetched (offline and not cached); a later call then retries.
 *
 * @param {Locale} lang
 * @returns {Promise<void>} Resolves once `messages[lang]` is filled and `t()` sees it.
 *
 * @example
 * await loadLocale('cs')
 * t('common.same') // 'stejné'
 */
export const loadLocale = (lang) => {
  if (!Object.hasOwn(loaders, lang)) {
    return Promise.reject(new Error(`No catalogue for locale "${lang}"`))
  }
  if (Object.hasOwn(messages, lang)) return Promise.resolve()
  if (!pending.has(lang)) {
    pending.set(
      lang,
      loaders[lang]().then(
        (barrel) => {
          messages[lang] = buildMessages({ lang, files: barrel.default })
          pending.delete(lang)
          catalogVersion.value += 1
        },
        (error) => {
          pending.delete(lang)
          throw error
        },
      ),
    )
  }
  return pending.get(lang)
}

/*
 * Starts the catalogue load whenever the language changes. `setLocale` in the store only sets
 * the signal, so this effect is what loads the text. A failed load is ignored here, because the
 * next change tries again, and startup falls back to English (see src/main.jsx).
 *
 * The first run is skipped. It would load the default 'en' before the stored choice is known,
 * so a Czech user would download English as well. src/main.jsx loads the startup language
 * itself, after hydrate.
 */
let isInitialRun = true
effect(() => {
  const lang = locale.value
  if (isInitialRun) {
    isInitialRun = false
    return
  }
  loadLocale(lang).catch(() => {})
})

/**
 * Pick the UI language from browser language tags. Czech is used when any tag's
 * primary subtag is `cs` (for example `cs`, `cs-CZ`). Everything else is English.
 *
 * @param {readonly string[]} [languages=navigator.languages] Browser language tags.
 * @returns {Locale}
 *
 * @example
 * detectLocale(['cs-CZ', 'en-US']) // 'cs'
 * detectLocale(['de-DE']) // 'en'
 */
export const detectLocale = (languages = globalThis.navigator?.languages ?? []) => {
  if (!Array.isArray(languages)) return 'en'
  const isCzech = languages.some(
    (tag) => typeof tag === 'string' && tag.toLowerCase().split('-')[0] === 'cs',
  )
  return isCzech ? 'cs' : 'en'
}

/**
 * Replace `{name}` placeholders with parameter values. A placeholder without a
 * matching parameter stays as written, so the gap is visible.
 *
 * @param {object} params
 * @param {string} params.template Message text.
 * @param {Record<string, unknown>} [params.params] Values by placeholder name.
 * @returns {string}
 *
 * @example
 * interpolate({ template: 'Hi {name}', params: { name: 'Ann' } }) // 'Hi Ann'
 */
const interpolate = ({ template, params }) => {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  )
}

/**
 * Look up a message for one language. Only the catalogue's own keys count, so
 * names such as `constructor` never match inherited properties.
 *
 * @param {object} params
 * @param {string} params.lang Language code.
 * @param {string} params.key Dotted message key.
 * @returns {string|undefined}
 */
const lookup = ({ lang, key }) => {
  const table = messages[lang]
  return table && Object.hasOwn(table, key) ? table[key] : undefined
}

/**
 * Translate a key into the active locale. Lookup order: active locale, then
 * English, then the key itself (so gaps are visible, not blank). A language that is
 * still loading counts as missing, so the English text shows until it arrives.
 *
 * Reads {@link locale} and {@link catalogVersion}, so calling it during render
 * subscribes the component to language changes and to catalogue loads.
 *
 * @param {string} key Dotted key, for example `'common.same'`. Use static,
 *   literal keys so they can be found by grep.
 * @param {Record<string, string|number>} [params] Values for `{name}` placeholders.
 * @returns {string}
 *
 * @example
 * t('common.same') // 'same' (or 'stejné' when locale is 'cs')
 * t('common.deleteConfirm', { name: 'ASUS' }) // 'Delete “ASUS”?'
 */
export const t = (key, params) => {
  const lang = locale.value
  void catalogVersion.value
  const template = lookup({ lang, key }) ?? lookup({ lang: 'en', key }) ?? key
  return interpolate({ template, params })
}

/**
 * Keys present in the reference language but missing from another one. Used by
 * the parity test, and handy when reviewing a translation. Both languages must be
 * loaded first (the test setup does this).
 *
 * @param {object} params
 * @param {string} params.locale Language to check.
 * @param {string} [params.reference='en'] Language that defines the expected keys.
 * @returns {string[]} Missing keys, in catalogue order. Empty when complete.
 *
 * @example
 * getMissingKeys({ locale: 'cs' }) // []
 */
export const getMissingKeys = ({ locale: lang, reference = 'en' }) => {
  const target = messages[lang] ?? {}
  return Object.keys(messages[reference] ?? {}).filter(
    (key) => !Object.hasOwn(target, key),
  )
}
