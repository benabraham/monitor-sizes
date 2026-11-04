import { render } from 'preact'
import './styles/tokens.css'
import './styles/global.css'
import { App } from './app.jsx'
import { store } from './state/store.js'

// Start loading the stored state before the first render. The App shows a loading state
// until it is ready. The service worker is registered by vite-plugin-pwa (see vite.config.js).
store.hydrate()

render(<App store={store} />, document.getElementById('app'))
