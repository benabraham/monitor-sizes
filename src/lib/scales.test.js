import { afterEach, describe, expect, it, vi } from 'vitest'
import { SCALE_PRESETS, detectPresetId, parseScaleInput } from './scales.js'

const UA = {
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  iPhone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iPadOs:
    'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  linuxChrome:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  linuxFirefox:
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
  chromeOs:
    'Mozilla/5.0 (X11; CrOS x86_64 15662.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SCALE_PRESETS', () => {
  it('matches the PRD presets (F21)', () => {
    expect(SCALE_PRESETS.windows).toEqual({
      kind: 'factor',
      values: [1, 1.25, 1.5, 1.75, 2],
    })
    expect(SCALE_PRESETS.macos).toEqual({
      kind: 'looksLike',
      values: [1280, 1440, 1512, 1680, 1728, 1920, 2048, 2304, 2560, 3008, 3200],
    })
    expect(SCALE_PRESETS.linux).toEqual({
      kind: 'factor',
      values: [1, 1.1, 1.25, 1.5, 1.75, 2],
    })
  })

  it('is frozen, including the nested value lists', () => {
    expect(Object.isFrozen(SCALE_PRESETS)).toBe(true)
    expect(Object.isFrozen(SCALE_PRESETS.windows)).toBe(true)
    expect(Object.isFrozen(SCALE_PRESETS.windows.values)).toBe(true)
    expect(() => SCALE_PRESETS.windows.values.push(3)).toThrow(TypeError)
  })
})

describe('detectPresetId', () => {
  it.each([
    ['Mac Chrome', { userAgent: UA.macChrome, platform: 'MacIntel' }],
    ['Mac Safari', { userAgent: UA.macSafari, platform: 'MacIntel' }],
    ['iPhone', { userAgent: UA.iPhone, platform: 'iPhone' }],
    ['iPadOS', { userAgent: UA.iPadOs, platform: 'iPad' }],
    ['iPad in desktop mode', { userAgent: UA.macSafari, platform: 'MacIntel' }],
    ['empty platform on Mac UA', { userAgent: UA.macChrome, platform: '' }],
  ])('maps %s to macos', (_, input) => {
    expect(detectPresetId(input)).toBe('macos')
  })

  it.each([
    ['Linux Chrome', { userAgent: UA.linuxChrome, platform: 'Linux x86_64' }],
    ['Linux Firefox', { userAgent: UA.linuxFirefox, platform: 'Linux x86_64' }],
    ['ChromeOS (X11; CrOS)', { userAgent: UA.chromeOs, platform: 'Linux x86_64' }],
    ['platform only', { userAgent: '', platform: 'Linux x86_64' }],
  ])('maps %s to linux', (_, input) => {
    expect(detectPresetId(input)).toBe('linux')
  })

  it.each([
    ['Windows Chrome', { userAgent: UA.windowsChrome, platform: 'Win32' }],
    [
      'Android Chrome (UA says Linux)',
      { userAgent: UA.androidChrome, platform: 'Linux armv8l' },
    ],
    ['Android via userAgentData', { userAgent: UA.androidChrome, platform: 'Android' }],
    ['unknown UA', { userAgent: 'Some/1.0', platform: '' }],
    ['empty input', { userAgent: '', platform: '' }],
  ])('maps %s to windows (the fallback)', (_, input) => {
    expect(detectPresetId(input)).toBe('windows')
  })

  it('reads navigator.userAgent and navigator.platform by default', () => {
    vi.stubGlobal('navigator', { userAgent: UA.macChrome, platform: 'MacIntel' })
    expect(detectPresetId()).toBe('macos')
    expect(detectPresetId({})).toBe('macos')
  })

  it('prefers navigator.userAgentData.platform over navigator.platform', () => {
    vi.stubGlobal('navigator', {
      userAgent: UA.linuxChrome,
      userAgentData: { platform: 'macOS' },
      platform: 'Linux x86_64',
    })
    expect(detectPresetId({})).toBe('macos')
  })

  it('treats a navigator without userAgent or platform as unknown', () => {
    vi.stubGlobal('navigator', {})
    expect(detectPresetId()).toBe('windows')
  })

  it('falls back to windows when there is no navigator at all', () => {
    vi.stubGlobal('navigator', undefined)
    expect(detectPresetId()).toBe('windows')
  })

  it('honours explicit arguments over navigator', () => {
    vi.stubGlobal('navigator', { userAgent: UA.macChrome, platform: 'MacIntel' })
    expect(detectPresetId({ userAgent: UA.linuxChrome, platform: 'Linux x86_64' })).toBe(
      'linux',
    )
  })
})

describe('parseScaleInput', () => {
  it.each([
    ['133', 1.33],
    ['133 %', 1.33],
    ['133%', 1.33],
    ['133 %', 1.33],
    ['1.33', 1.33],
    ['1,33', 1.33],
    ['2×', 2],
    ['2x', 2],
    ['2X', 2],
    ['2 x', 2],
    ['2 ×', 2],
    ['1,5x', 1.5],
    ['1,33 ×', 1.33],
    ['  175  ', 1.75],
    ['110 %', 1.1],
    ['125', 1.25],
    ['175%', 1.75],
    ['150', 1.5],
    ['100', 1],
    ['1', 1],
    ['0.5', 0.5],
    ['.5', 0.5],
    [',5', 0.5],
    ['50', 0.5],
    ['50%', 0.5],
    ['4', 4],
    ['400', 4],
    ['400%', 4],
    ['4×', 4],
    ['2.5', 2.5],
    ['300', 3],
    ['300%', 3],
  ])('parses %j as %d', (text, expected) => {
    expect(parseScaleInput(text)).toBe(expected)
  })

  it('rounds the result to 4 decimals', () => {
    expect(parseScaleInput('133.33')).toBe(1.3333)
    expect(parseScaleInput('133,333')).toBe(1.3333)
    expect(parseScaleInput('1.333333')).toBe(1.3333)
    expect(parseScaleInput('1.23456')).toBe(1.2346)
    expect(parseScaleInput('1.23456×')).toBe(1.2346)
  })

  it.each([
    ['below the 0.5 floor, as a factor', '0.49'],
    ['below the 0.5 floor, as a percent', '49'],
    ['below the 0.5 floor, as an explicit percent', '49%'],
    ['zero', '0'],
    ['zero percent', '0%'],
    ['above the 4 ceiling, as a factor', '4.5'],
    ['above the 4 ceiling, as a percent', '401%'],
    ['above the 4 ceiling, as a bare percent', '450'],
    ['factor suffix above the ceiling', '5x'],
    ['factor suffix above the ceiling, with ×', '10×'],
    ['a plain number between 4 and 10', '9.9'],
    ['10 is a percent, so 0.1', '10'],
    ['a bare 0.4', '0.4'],
    ['a just-over-ceiling factor', '4.0001'],
    ['a fraction of a percent under the floor', '0.1%'],
  ])('returns null when out of range: %s (%j)', (_, text) => {
    expect(parseScaleInput(text)).toBeNull()
  })

  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['letters', 'abc'],
    ['two decimal separators', '1.2.3'],
    ['a space inside the number', '1 33'],
    ['negative', '-133'],
    ['explicit plus', '+133'],
    ['scientific notation', '1e2'],
    ['NaN', 'NaN'],
    ['Infinity', 'Infinity'],
    ['doubled percent', '133 %%'],
    ['percent before the number', '%133'],
    ['trailing decimal point', '1.'],
    ['unit suffix', '133px'],
    ['fraction notation', '1/3'],
    ['two factors', '2×2'],
    ['percent with a factor suffix', '133%×'],
    ['fullwidth digits are not accepted', '１３３'],
  ])('returns null for garbage: %s (%j)', (_, text) => {
    expect(parseScaleInput(text)).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(parseScaleInput(undefined)).toBeNull()
    expect(parseScaleInput(null)).toBeNull()
    expect(parseScaleInput(1.33)).toBeNull()
    expect(parseScaleInput({})).toBeNull()
  })
})
