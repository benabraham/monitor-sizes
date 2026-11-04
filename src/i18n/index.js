/**
 * Translations: the locale signal, language detection and the `t()` lookup
 * (PRD: F16, UX; ARCHITECTURE: i18n).
 *
 * Message files are discovered with `import.meta.glob`, so adding a namespace
 * is a matter of adding `locales/<lang>/<namespace>.js`. A file's default export
 * is flattened into dotted keys prefixed by the namespace:
 *
 * ```js
 * // locales/en/metrics.js
 * export default { ppi: { label: 'PPI' } }
 * // → messages.en['metrics.ppi.label'] === 'PPI'
 * ```
 *
 * See docs/I18N.md for the workflow.
 *
 * @module i18n
 */

import { signal } from '@preact/signals'

/**
 * @typedef {'en'|'cs'} Locale
 */

/**
 * Active UI language. Components that call {@link t} during render re-render
 * when it changes, because the signal is read there.
 *
 * It starts as `'en'`. The state layer sets it on hydrate, from the URL or saved
 * preference, or from {@link detectLocale}.
 *
 * @type {import('@preact/signals').Signal<Locale>}
 *
 * @example
 * locale.value = 'cs'
 */
export const locale = signal('en')

/** @type {Record<string, unknown>} Eagerly loaded message modules, keyed by path. */
const modules = import.meta.glob('./locales/*/*.js', { eager: true })

const MODULE_PATH = /^\.\/locales\/([^/]+)\/([^/]+)\.js$/

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
 * Build the catalogue `{ en: {…}, cs: {…} }` from the discovered module files.
 * A file without a default export is a developer error, so it throws early.
 *
 * @param {object} params
 * @param {Record<string, unknown>} params.files Module map from `import.meta.glob`.
 * @returns {Record<string, Record<string, string>>}
 *
 * @example
 * buildMessages({ files: { './locales/en/common.js': { default: { same: 'same' } } } })
 * // { en: { 'common.same': 'same' } }
 */
const buildMessages = ({ files }) =>
  Object.entries(files).reduce((catalogue, [path, module]) => {
    const match = path.match(MODULE_PATH)
    if (!match) throw new Error(`Unexpected locale file path: ${path}`)
    const [, lang, namespace] = match
    if (!isPlainObject(module?.default)) {
      throw new Error(`Locale file ${path} must have a default export object`)
    }
    const flat = flattenMessages({ source: module.default, prefix: namespace })
    catalogue[lang] = Object.assign(catalogue[lang] ?? {}, flat)
    return catalogue
  }, {})

/**
 * Flat message catalogue, `{ en: { 'common.same': 'same', … }, cs: { … } }`.
 * Exported for tests. Treat it as read-only in app code.
 *
 * @type {Record<string, Record<string, string>>}
 */
export const messages = buildMessages({ files: modules })

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
 * English, then the key itself (so gaps are visible, not blank).
 *
 * Reads {@link locale}, so calling it during render subscribes the component
 * to language changes.
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
  const template =
    lookup({ lang: locale.value, key }) ?? lookup({ lang: 'en', key }) ?? key
  return interpolate({ template, params })
}

/**
 * Keys present in the reference language but missing from another one. Used by
 * the parity test, and handy when reviewing a translation.
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
