import { effect } from '@preact/signals'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectLocale, getMissingKeys, loadLocale, locale, messages, t } from './index.js'

// Namespace files only: the per-language barrels (`index.js`) are not namespaces.
const localeFiles = import.meta.glob(['./locales/*/*.js', '!./locales/*/index.js'], {
  eager: true,
})
const FILE_PATTERN = /^\.\/locales\/([^/]+)\/([^/]+)\.js$/

const languages = [
  ...new Set(Object.keys(localeFiles).map((path) => path.match(FILE_PATTERN)[1])),
].sort()
const namespaces = [
  ...new Set(Object.keys(localeFiles).map((path) => path.match(FILE_PATTERN)[2])),
].sort()

/** Catalogue keys that belong to one namespace file, sorted. */
const keysOf = ({ lang, namespace }) =>
  Object.keys(messages[lang] ?? {})
    .filter((key) => key.startsWith(`${namespace}.`))
    .sort()

const placeholdersOf = (text) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

afterEach(() => {
  delete messages.en['test.onlyEnglish']
  delete messages.cs['test.onlyCzech']
  locale.value = 'en'
  vi.unstubAllGlobals()
})

describe('detectLocale', () => {
  it.each([
    [['cs-CZ', 'en-US'], 'cs'],
    [['en-GB', 'cs'], 'cs'],
    [['CS-cz'], 'cs'],
    [['de-DE', 'fr'], 'en'],
    [['csb'], 'en'],
    [[], 'en'],
  ])('detectLocale(%j) is %s', (languages, expected) => {
    expect(detectLocale(languages)).toBe(expected)
  })

  it('reads navigator.languages when no list is given', () => {
    vi.stubGlobal('navigator', { languages: ['cs-CZ'] })
    expect(detectLocale()).toBe('cs')
  })

  it('defaults to English when the browser reports no languages', () => {
    vi.stubGlobal('navigator', {})
    expect(detectLocale()).toBe('en')
  })

  it('ignores a non-list input and non-string tags', () => {
    expect(detectLocale('cs')).toBe('en')
    expect(detectLocale([null, 42, 'cs'])).toBe('cs')
    expect(detectLocale([null, 42])).toBe('en')
  })
})

describe('t', () => {
  it('returns the English string for the default locale', () => {
    expect(locale.value).toBe('en')
    expect(t('common.same')).toBe('same')
  })

  it('returns the Czech string after switching to cs', () => {
    locale.value = 'cs'
    expect(t('common.same')).toBe('stejné')
  })

  it('changes output when the locale switches back and forth', () => {
    locale.value = 'cs'
    expect(t('common.close')).toBe('Zavřít')
    locale.value = 'en'
    expect(t('common.close')).toBe('Close')
  })

  it('interpolates {name} placeholders', () => {
    expect(t('common.deleteConfirm', { name: 'ASUS' })).toBe('Delete “ASUS”?')
    locale.value = 'cs'
    expect(t('common.deleteConfirm', { name: 'ASUS' })).toBe('Smazat „ASUS“?')
  })

  it('converts non-string parameter values to text', () => {
    expect(t('common.deleteConfirm', { name: 42 })).toBe('Delete “42”?')
  })

  it('leaves a placeholder untouched when its parameter is missing', () => {
    expect(t('common.deleteConfirm')).toBe('Delete “{name}”?')
    expect(t('common.deleteConfirm', { other: 1 })).toBe('Delete “{name}”?')
  })

  it('falls back to English when the current locale lacks the key', () => {
    messages.en['test.onlyEnglish'] = 'Only in English'
    locale.value = 'cs'
    expect(t('test.onlyEnglish')).toBe('Only in English')
  })

  it('falls back to the key itself when no locale has it', () => {
    expect(t('test.nowhere')).toBe('test.nowhere')
  })

  it('ignores inherited object properties when looking up keys', () => {
    expect(t('constructor')).toBe('constructor')
    expect(t('toString')).toBe('toString')
  })

  it('re-runs reactive readers when the locale changes', () => {
    const seen = []
    const dispose = effect(() => {
      seen.push(t('common.same'))
    })
    locale.value = 'cs'
    dispose()
    expect(seen).toEqual(['same', 'stejné'])
  })
})

describe('loadLocale', () => {
  // A fresh module instance has no catalogue loaded yet, unlike the shared one. English
  // loads on import (the module's effect), so wait for it; Czech stays unloaded.
  const freshModule = async () => {
    vi.resetModules()
    const fresh = await import('./index.js')
    await fresh.loadLocale('en')
    return fresh
  }

  it('loads a language on request, and only then', async () => {
    const fresh = await freshModule()
    expect(fresh.messages.cs).toBeUndefined()
    await fresh.loadLocale('cs')
    expect(fresh.messages.cs['common.same']).toBe('stejné')
  })

  it('bumps catalogVersion once when a catalogue arrives, and not again when loaded', async () => {
    const fresh = await freshModule()
    const before = fresh.catalogVersion.value
    await fresh.loadLocale('cs')
    expect(fresh.catalogVersion.value).toBe(before + 1)
    await fresh.loadLocale('cs')
    await fresh.loadLocale('en')
    expect(fresh.catalogVersion.value).toBe(before + 1)
  })

  it('rejects a language that has no catalogue', async () => {
    await expect(loadLocale('de')).rejects.toThrow('No catalogue for locale "de"')
  })

  it('shows English while the Czech catalogue loads, then Czech', async () => {
    const fresh = await freshModule()
    fresh.locale.value = 'cs'
    expect(fresh.t('common.same')).toBe('same')
    await fresh.loadLocale('cs')
    expect(fresh.t('common.same')).toBe('stejné')
  })

  it('re-runs a reactive reader when its catalogue arrives', async () => {
    const fresh = await freshModule()
    const seen = []
    const dispose = effect(() => {
      seen.push(fresh.t('common.same'))
    })
    fresh.locale.value = 'cs'
    await fresh.loadLocale('cs')
    dispose()
    expect(seen).toEqual(['same', 'same', 'stejné'])
  })

  it('loads the catalogue of the language the locale signal selects', async () => {
    const fresh = await freshModule()
    fresh.locale.value = 'cs'
    await vi.waitFor(() => expect(fresh.messages.cs).toBeDefined())
    expect(fresh.t('common.same')).toBe('stejné')
  })
})

describe('getMissingKeys', () => {
  it('returns an empty list when the locale has every English key', () => {
    expect(getMissingKeys({ locale: 'cs' })).toEqual([])
  })

  it('lists keys the reference has but the locale lacks', () => {
    messages.en['test.onlyEnglish'] = 'Only in English'
    expect(getMissingKeys({ locale: 'cs' })).toEqual(['test.onlyEnglish'])
  })

  it('compares against an explicit reference language', () => {
    messages.cs['test.onlyCzech'] = 'Jen česky'
    expect(getMissingKeys({ locale: 'en', reference: 'cs' })).toEqual(['test.onlyCzech'])
    expect(getMissingKeys({ locale: 'cs', reference: 'en' })).toEqual([])
    expect(getMissingKeys({ locale: 'en' })).toEqual([])
  })
})

describe('message catalogue (parity across every namespace file)', () => {
  it('discovers at least one namespace file per language', () => {
    expect(namespaces.length).toBeGreaterThan(0)
    expect(languages).toEqual(expect.arrayContaining(['en', 'cs']))
  })

  it.each(namespaces)('%s exists in every language', (namespace) => {
    languages.forEach((lang) => {
      expect(Object.keys(localeFiles)).toContain(`./locales/${lang}/${namespace}.js`)
    })
  })

  it.each(namespaces)(
    '%s has identical flattened keys in every language',
    (namespace) => {
      const reference = keysOf({ lang: 'en', namespace })
      expect(reference.length).toBeGreaterThan(0)
      languages.forEach((lang) => {
        expect(keysOf({ lang, namespace })).toEqual(reference)
      })
    },
  )

  it.each(namespaces)('%s uses the same {placeholders} as English', (namespace) => {
    keysOf({ lang: 'en', namespace }).forEach((key) => {
      languages.forEach((lang) => {
        expect(placeholdersOf(messages[lang][key])).toEqual(
          placeholdersOf(messages.en[key]),
        )
      })
    })
  })

  it.each(namespaces)('%s has only non-empty string values', (namespace) => {
    languages.forEach((lang) => {
      keysOf({ lang, namespace }).forEach((key) => {
        expect(typeof messages[lang][key]).toBe('string')
        expect(messages[lang][key].trim()).not.toBe('')
      })
    })
  })
})
