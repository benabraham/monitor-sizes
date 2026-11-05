import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/preact'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { loadLocale } from '../src/i18n/index.js'

/** Preact schedules effects with a 35 ms timeout race against rAF (hooks afterPaint). */
const PREACT_AFTER_PAINT_MS = 35

// Catalogues load lazily in the app. Tests load both up front, so `t()` is synchronous.
beforeAll(async () => {
  await loadLocale('en')
  await loadLocale('cs')
})

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

// Let Preact's pending afterPaint timers fire while jsdom still exists. Without this, a
// file that ends within 35 ms of its last render can crash after teardown with
// "cancelAnimationFrame is not defined" (seen intermittently in CI).
afterAll(() => new Promise((resolve) => setTimeout(resolve, PREACT_AFTER_PAINT_MS * 2)))
