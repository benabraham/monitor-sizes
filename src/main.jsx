import { render } from 'preact'
import './styles/tokens.css'
import './styles/global.css'
import { App } from './app.jsx'
import { loadLocale, locale } from './i18n/index.js'
import { store } from './state/store.js'

/**
 * Load the stored state and the catalogue of the language it selects, then render, so the
 * first paint is in the right language. Only that one language is downloaded. If its chunk
 * cannot be fetched, English is used for this session and the saved choice stays as it is.
 * The service worker is registered by vite-plugin-pwa (see vite.config.js).
 */
const start = async () => {
  await store.hydrate()
  await loadLocale(locale.value)
    .catch(() => loadLocale('en'))
    .catch(() => {})
  render(<App store={store} />, document.getElementById('app'))
}

start()
