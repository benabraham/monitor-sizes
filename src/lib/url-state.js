/**
 * View state ⇄ URL hash (F19).
 *
 * A link carries the whole comparison as `#s=<base64url(JSON)>`. The JSON uses short
 * keys and a version (`v: 1`). Custom displays that the state refers to travel inside
 * the link as their inputs, so the recipient sees the same comparison (decision in
 * ARCHITECTURE and PRD F19).
 *
 * Encoding writes only the fields that are present. It rounds distances to 2 decimals
 * and scales to 4, to keep links short. Decoding validates each field on its own: an
 * invalid field or item is dropped and the rest is kept. Garbage input, an unknown
 * version or a missing `s` parameter gives `null`. Decoding never throws.
 *
 * The wire format and the versioning policy are in docs/STATE.md.
 *
 * @module lib/url-state
 */

import { round } from './math.js'

/** @typedef {import('./scales.js').PresetId} PresetId */
/** @typedef {import('./storage.js').FamiliarEntry} FamiliarEntry */
/** @typedef {import('./storage.js').Display} Display */

/** @typedef {'metric'|'imperial'} Units */
/** @typedef {'en'|'cs'} Locale */
/** @typedef {'height'|'width'|'diagonal'} SizeMatchBy */

/**
 * Comfort window (F7, F23). Decoded links may carry only some of these fields, so the
 * consumer merges them over its current comfort settings.
 *
 * @typedef {object} Comfort
 * @property {'ppi'|'ppd'} mode           which rule is active
 * @property {number} minPpi              effective PPI lower bound, default 90
 * @property {number} maxPpi              effective PPI upper bound, default 105
 * @property {number} minPpd              logical PPD lower bound, default 37
 * @property {number} maxPpd              logical PPD upper bound, default 43
 * @property {number} minWidth            minimum logical width in px, default 1024
 */

/**
 * Everything a shared link restores (F19). The decoder returns a `Partial<ViewState>`
 * with the long keys shown here.
 *
 * @typedef {object} ViewState
 * @property {'browse'|'compare'} view
 * @property {FamiliarEntry[]} familiar
 * @property {string|null} baselineId
 * @property {string[]} compareIds
 * @property {Record<string, { distance?: number, scale?: number }>} compareSettings
 * @property {string[]} hiddenFamiliarIds        familiar displays hidden in Compare
 * @property {Display[]} customDisplays          embedded custom displays
 * @property {Units} units
 * @property {Locale} locale
 * @property {PresetId} presetId
 * @property {number[]} customScales
 * @property {Comfort} comfort
 * @property {{ search: string, tags: string[], aspects: string[],
 *              minDiagonal: number|null, maxDiagonal: number|null,
 *              onlyComfortable: boolean }} filters
 * @property {{ key: string, direction: 'asc'|'desc' }} sort
 * @property {'physical'|'seen'} vizMode
 * @property {SizeMatchBy} sizeMatchBy
 */

const VERSION = 1
const PARAM = 's'
/** Longer hashes are rejected before any decoding work. */
const MAX_ENCODED_LENGTH = 100000
/** Arrays are cut to this many items; the rest is ignored. */
const MAX_ITEMS = 200
const MAX_ID_LENGTH = 100
const MAX_NAME_LENGTH = 120
const MAX_SEARCH_LENGTH = 200
const MAX_ASPECT_LENGTH = 20
const TAGS = ['laptop', 'monitor', 'ultrawide']
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/

const identity = (value) => value

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isPositiveNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const isId = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH

const isName = (value) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_NAME_LENGTH

/**
 * Encode text as unpadded base64url over its UTF-8 bytes.
 *
 * @param {string} text
 * @returns {string}
 *
 * @example
 * toBase64Url('{"v":1}') // 'eyJ2IjoxfQ'
 */
const toBase64Url = (text) => {
  const bytes = new TextEncoder().encode(text)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode base64url (padded or not) into UTF-8 text. Returns `null` for anything that is
 * not valid base64url or not valid UTF-8.
 *
 * @param {string} encoded
 * @returns {string|null}
 *
 * @example
 * decodeBase64Url('eyJ2IjoxfQ') // '{"v":1}'
 * decodeBase64Url('!!!') // null
 */
const decodeBase64Url = (encoded) => {
  if (!BASE64URL_PATTERN.test(encoded)) return null
  const body = encoded.replace(/=+$/, '')
  if (body.length % 4 === 1) return null
  try {
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/**
 * Parse the `s` parameter out of a hash and return its JSON object, or `null`.
 *
 * @param {unknown} hash
 * @returns {Record<string, unknown>|null}
 */
const readPayload = (hash) => {
  if (typeof hash !== 'string') return null
  const query = hash.replace(/^#/, '').replace(/^\?/, '')
  const encoded = new URLSearchParams(query).get(PARAM)
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH) return null
  const json = decodeBase64Url(encoded)
  if (json === null) return null
  let payload
  try {
    payload = JSON.parse(json)
  } catch {
    return null
  }
  return isPlainObject(payload) ? payload : null
}

/**
 * Round a number to `digits` decimals. Other values pass through unchanged, so that
 * an invalid value is still dropped by the decoder.
 *
 * @param {object} params
 * @param {unknown} params.value
 * @param {number} params.digits
 * @returns {unknown}
 */
const roundNumber = ({ value, digits }) =>
  typeof value === 'number' && Number.isFinite(value) ? round({ value, digits }) : value

/**
 * Keep the first occurrence of each key.
 *
 * @param {object} params
 * @param {unknown[]} params.items
 * @param {(item: unknown) => unknown} params.keyOf
 * @returns {unknown[]}
 */
const uniqueBy = ({ items, keyOf }) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Return the object only when every field has a value.
 *
 * @param {Record<string, unknown>} fields
 * @returns {Record<string, unknown>|undefined}
 */
const allDefined = (fields) =>
  Object.values(fields).every((value) => value !== undefined) ? fields : undefined

/*
 * Codecs. Each has `encode(value)` for the app's value and `decode(value)` for the
 * wire value. Both return `undefined` for "leave this field out". The decoder must
 * never throw.
 */

/** @type {{ encode: (value: unknown) => unknown, decode: (value: unknown) => unknown }} */
const idCodec = {
  encode: identity,
  decode: (value) => (isId(value) ? value : undefined),
}

const nullableIdCodec = {
  encode: identity,
  decode: (value) => (value === null ? null : idCodec.decode(value)),
}

const positiveCodec = {
  encode: identity,
  decode: (value) => (isPositiveNumber(value) ? value : undefined),
}

const nullablePositiveCodec = {
  encode: identity,
  decode: (value) => (value === null ? null : positiveCodec.decode(value)),
}

/**
 * Positive number, rounded to `digits` decimals when encoded.
 *
 * @param {number} digits
 * @returns {{ encode: (value: unknown) => unknown, decode: (value: unknown) => unknown }}
 *
 * @example
 * roundedCodec(2).encode(23.6220472) // 23.62
 */
const roundedCodec = (digits) => ({
  encode: (value) => roundNumber({ value, digits }),
  decode: positiveCodec.decode,
})

/** Viewing distance, inches, 2 decimals. */
const distanceCodec = roundedCodec(2)

/** OS scale factor, 4 decimals. */
const scaleCodec = roundedCodec(4)

const nameCodec = {
  encode: identity,
  decode: (value) => (isName(value) ? value : undefined),
}

const booleanCodec = {
  encode: identity,
  decode: (value) => (typeof value === 'boolean' ? value : undefined),
}

/**
 * Text up to `maxLength` characters.
 *
 * @param {number} maxLength
 * @returns {{ encode: (value: unknown) => unknown, decode: (value: unknown) => unknown }}
 */
const stringCodec = (maxLength) => ({
  encode: identity,
  decode: (value) =>
    typeof value === 'string' && value.length <= maxLength ? value : undefined,
})

/**
 * Enum with a short wire form, for example `['metric', 'm']`.
 *
 * @param {Array<[string, string]>} pairs `[appValue, wireValue]`
 * @returns {{ encode: (value: unknown) => unknown, decode: (value: unknown) => unknown }}
 *
 * @example
 * const units = mappedCodec([['metric', 'm'], ['imperial', 'i']])
 * units.encode('imperial') // 'i'
 * units.decode('x') // undefined
 */
const mappedCodec = (pairs) => {
  const wireOf = new Map(pairs)
  const appValueOf = new Map(pairs.map(([appValue, wire]) => [wire, appValue]))
  return {
    encode: (value) => wireOf.get(value),
    decode: (value) => appValueOf.get(value),
  }
}

/**
 * Enum whose wire form is the app value.
 *
 * @param {string[]} values
 * @returns {{ encode: (value: unknown) => unknown, decode: (value: unknown) => unknown }}
 *
 * @example
 * oneOfCodec(['en', 'cs']).decode('cs') // 'cs'
 */
const oneOfCodec = (values) => mappedCodec(values.map((value) => [value, value]))

const DIRECTION = mappedCodec([
  ['asc', 'a'],
  ['desc', 'd'],
])

const TAG = oneOfCodec(TAGS)

/**
 * Array of items, capped at `MAX_ITEMS` and de-duplicated by `keyOf` when decoded.
 *
 * @param {object} params
 * @param {{ encode: (value: unknown) => unknown, decode: (value: unknown) => unknown }} params.item
 * @param {(item: unknown) => unknown} [params.keyOf] Identity for primitive lists.
 * @returns {{ encode: (value: unknown) => unknown[]|undefined, decode: (value: unknown) => unknown[]|undefined }}
 *
 * @example
 * listCodec({ item: idCodec }).decode(['a', 1, 'a']) // ['a']
 */
const listCodec = ({ item, keyOf = identity }) => ({
  encode: (value) => {
    if (!Array.isArray(value)) return undefined
    return value.map((entry) => item.encode(entry)).filter((entry) => entry !== undefined)
  },
  decode: (value) => {
    if (!Array.isArray(value)) return undefined
    const decoded = value
      .slice(0, MAX_ITEMS)
      .map((entry) => item.decode(entry))
      .filter((entry) => entry !== undefined)
    return uniqueBy({ items: decoded, keyOf })
  },
})

/**
 * Object whose fields are encoded under short keys. Fields that are missing, or that
 * fail to decode, are left out.
 *
 * @param {Array<[string, string, { encode: Function, decode: Function }]>} fields
 *   `[longKey, shortKey, codec]` triples.
 * @returns {{ encode: (value: unknown) => Record<string, unknown>|undefined, decode: (value: unknown) => Record<string, unknown>|undefined }}
 */
const objectCodec = (fields) => ({
  encode: (value) => {
    if (!isPlainObject(value)) return undefined
    return Object.fromEntries(
      fields.flatMap(([key, short, codec]) => {
        const encoded = value[key] === undefined ? undefined : codec.encode(value[key])
        return encoded === undefined ? [] : [[short, encoded]]
      }),
    )
  },
  decode: (value) => {
    if (!isPlainObject(value)) return undefined
    return Object.fromEntries(
      fields.flatMap(([key, short, codec]) => {
        const decoded = codec.decode(value[short])
        return decoded === undefined ? [] : [[key, decoded]]
      }),
    )
  },
})

/** Familiar entry as the tuple `[id, distance, scale]`. */
const familiarCodec = {
  encode: (entry) => {
    if (!isPlainObject(entry)) return undefined
    return [
      idCodec.encode(entry.id),
      distanceCodec.encode(entry.distance),
      scaleCodec.encode(entry.scale),
    ]
  },
  decode: (item) => {
    if (!Array.isArray(item) || item.length !== 3) return undefined
    const [id, distance, scale] = item
    return allDefined({
      id: idCodec.decode(id),
      distance: distanceCodec.decode(distance),
      scale: scaleCodec.decode(scale),
    })
  },
}

/** Custom display as `{ i, n, d, w, h, t }`. Decoded displays are always `isCustom`. */
const customDisplayCodec = {
  encode: (display) => {
    if (!isPlainObject(display)) return undefined
    return {
      i: display.id,
      n: display.name,
      d: display.diagonal,
      w: display.width,
      h: display.height,
      t: display.tag,
    }
  },
  decode: (item) => {
    if (!isPlainObject(item)) return undefined
    const fields = allDefined({
      id: idCodec.decode(item.i),
      name: nameCodec.decode(item.n),
      diagonal: positiveCodec.decode(item.d),
      width: positiveCodec.decode(item.w),
      height: positiveCodec.decode(item.h),
    })
    if (fields === undefined) return undefined
    const tag = TAG.decode(item.t)
    return { ...fields, ...(tag === undefined ? {} : { tag }), isCustom: true }
  },
}

/** Compare settings as `{ [id]: [distance|null, scale|null] }`. */
const compareSettingsCodec = {
  encode: (value) => {
    if (!isPlainObject(value)) return undefined
    return Object.fromEntries(
      Object.entries(value).map(([id, setting]) => [
        id,
        [
          distanceCodec.encode(setting?.distance) ?? null,
          scaleCodec.encode(setting?.scale) ?? null,
        ],
      ]),
    )
  },
  decode: (value) => {
    if (!isPlainObject(value)) return undefined
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_ITEMS)
        .flatMap(([id, pair]) => {
          if (idCodec.decode(id) === undefined) return []
          if (!Array.isArray(pair) || pair.length !== 2) return []
          const setting = Object.fromEntries(
            [
              ['distance', positiveCodec.decode(pair[0])],
              ['scale', positiveCodec.decode(pair[1])],
            ].filter(([, decoded]) => decoded !== undefined),
          )
          return [[id, setting]]
        }),
    )
  },
}

/** Sort as `[key, 'a'|'d']`. */
const sortCodec = {
  encode: (value) => {
    if (!isPlainObject(value)) return undefined
    const direction = DIRECTION.encode(value.direction)
    return direction === undefined ? undefined : [idCodec.encode(value.key), direction]
  },
  decode: (value) => {
    if (!Array.isArray(value) || value.length !== 2) return undefined
    return allDefined({
      key: idCodec.decode(value[0]),
      direction: DIRECTION.decode(value[1]),
    })
  },
}

const COMFORT_CODEC = objectCodec([
  ['mode', 'm', oneOfCodec(['ppi', 'ppd'])],
  ['minPpi', 'a', positiveCodec],
  ['maxPpi', 'b', positiveCodec],
  ['minPpd', 'c', positiveCodec],
  ['maxPpd', 'd', positiveCodec],
  ['minWidth', 'mw', positiveCodec],
])

const FILTERS_CODEC = objectCodec([
  ['search', 'q', stringCodec(MAX_SEARCH_LENGTH)],
  ['tags', 't', listCodec({ item: TAG })],
  ['aspects', 'a', listCodec({ item: stringCodec(MAX_ASPECT_LENGTH) })],
  ['minDiagonal', 'mn', nullablePositiveCodec],
  ['maxDiagonal', 'mx', nullablePositiveCodec],
  ['onlyComfortable', 'oc', booleanCodec],
])

/** Every ViewState field, as `[longKey, shortKey, codec]`. */
const STATE_FIELDS = [
  ['view', 'w', oneOfCodec(['browse', 'compare'])],
  ['familiar', 'f', listCodec({ item: familiarCodec, keyOf: (entry) => entry.id })],
  ['baselineId', 'b', nullableIdCodec],
  ['compareIds', 'c', listCodec({ item: idCodec })],
  ['compareSettings', 'cs', compareSettingsCodec],
  ['hiddenFamiliarIds', 'h', listCodec({ item: idCodec })],
  [
    'customDisplays',
    'cd',
    listCodec({ item: customDisplayCodec, keyOf: (display) => display.id }),
  ],
  [
    'units',
    'u',
    mappedCodec([
      ['metric', 'm'],
      ['imperial', 'i'],
    ]),
  ],
  ['locale', 'l', oneOfCodec(['en', 'cs'])],
  ['presetId', 'p', oneOfCodec(['windows', 'macos', 'linux'])],
  ['customScales', 'x', listCodec({ item: scaleCodec })],
  ['comfort', 'cf', COMFORT_CODEC],
  ['filters', 'fl', FILTERS_CODEC],
  ['sort', 's', sortCodec],
  [
    'vizMode',
    'vm',
    mappedCodec([
      ['physical', 'p'],
      ['seen', 's'],
    ]),
  ],
  [
    'sizeMatchBy',
    'sm',
    mappedCodec([
      ['height', 'h'],
      ['width', 'w'],
      ['diagonal', 'd'],
    ]),
  ],
]

const STATE_CODEC = objectCodec(STATE_FIELDS)

/**
 * Encode a view state as a URL hash: `#s=<base64url(JSON)>`.
 *
 * Only the fields present in `viewState` are written, so a partial state gives a
 * partial link. Distances are rounded to 2 decimals and scales to 4. Custom displays
 * are embedded as their inputs (name, diagonal, width, height and tag). Pass the result
 * to `location.hash`, or append it to the page URL to share it.
 *
 * @param {Partial<ViewState>} viewState
 * @returns {string} The hash, starting with `#s=`.
 *
 * @example
 * encodeState({ view: 'compare', units: 'imperial' })
 * // '#s=eyJ2IjoxLCJ3IjoiY29tcGFyZSIsInUiOiJpIn0'  (JSON: {"v":1,"w":"compare","u":"i"})
 */
export const encodeState = (viewState) => {
  const body = { v: VERSION, ...STATE_CODEC.encode(viewState) }
  return `#${PARAM}=${toBase64Url(JSON.stringify(body))}`
}

/**
 * Decode a URL hash into a partial view state. Works with or without the leading `#`
 * and ignores other parameters. Each field is validated on its own: an invalid field or
 * item is dropped and the rest is kept, and arrays are capped at 200 items. Duplicate
 * ids keep their first occurrence.
 *
 * Returns `null` when there is no `s` parameter, the text is not base64url or JSON, or
 * the version is not 1. Never throws. An object with a valid version and no usable
 * fields gives `{}`.
 *
 * Decoded comfort and filters are partial objects. Merge them into the current settings
 * (for example with `setComfort(partial)`) rather than replacing them.
 *
 * @param {string} hash
 * @returns {Partial<ViewState>|null}
 *
 * @example
 * decodeState('#s=eyJ2IjoxLCJ1IjoiaSJ9') // { units: 'imperial' }
 * decodeState('#s=!!!') // null
 * decodeState('#x=1') // null
 */
export const decodeState = (hash) => {
  const payload = readPayload(hash)
  if (payload?.v !== VERSION) return null
  return STATE_CODEC.decode(payload)
}
