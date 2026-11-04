import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/preact'
import { afterEach, beforeAll } from 'vitest'
import { loadLocale } from '../src/i18n/index.js'

// Catalogues load lazily in the app. Tests load both up front, so `t()` is synchronous.
beforeAll(async () => {
  await loadLocale('en')
  await loadLocale('cs')
})

afterEach(() => {
  cleanup()
  window.location.hash = ''
})
