/**
 * The English catalogue as one module. Its default export maps every namespace file in
 * this folder (for example `./common.js`) to that file's module. `src/i18n/index.js`
 * flattens them, when `loadLocale('en')` runs.
 *
 * It is a single dynamic import, so the bundler emits this language as one chunk, and the
 * page downloads only the language that is in use. The barrel itself is excluded from
 * its own glob.
 *
 * @module i18n/locales/en
 */

export default import.meta.glob(['./*.js', '!./index.js'], { eager: true })
