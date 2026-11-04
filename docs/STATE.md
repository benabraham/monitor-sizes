# View state, links and persistence

This document is for developers. It describes the state that a shared link carries,
the wire format of that link, how it is versioned, what is stored locally, and what
happens when storage fails. The modules are `src/lib/scales.js`, `src/lib/url-state.js`
and `src/lib/storage.js`. The signatures are in [`ARCHITECTURE.md`](./ARCHITECTURE.md)
and the requirements are in [`PRD.md`](./PRD.md) (F2, F16, F17, F19, F21).

## View state

`ViewState` is the set of things that a link restores (F19). The app keeps it in
signals. The decoder returns a `Partial<ViewState>` with these long keys.

| Field               | Type                                                                   | Notes                                                |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `view`              | `'browse' \| 'compare'`                                                |                                                      |
| `familiar`          | `FamiliarEntry[]`                                                      | `{ id, distance, scale }`, F2                        |
| `baselineId`        | `string \| null`                                                       | exactly one familiar display drives relative columns |
| `compareIds`        | `string[]`                                                             | compared displays, besides familiar ones             |
| `compareSettings`   | `Record<id, { distance?, scale? }>`                                    | per-display overrides, F13                           |
| `hiddenFamiliarIds` | `string[]`                                                             | familiar displays hidden in Compare                  |
| `customDisplays`    | `Display[]`                                                            | embedded as inputs, F17, F19                         |
| `units`             | `'metric' \| 'imperial'`                                               | F16                                                  |
| `locale`            | `'en' \| 'cs'`                                                         | F16                                                  |
| `presetId`          | `'windows' \| 'macos' \| 'linux'`                                      | F21                                                  |
| `customScales`      | `number[]`                                                             | factors such as `1.33`, F21                          |
| `comfort`           | `{ mode, minPpi, maxPpi, minPpd, maxPpd, minWidth }`                   | F7, F23                                              |
| `filters`           | `{ search, tags, aspects, minDiagonal, maxDiagonal, onlyComfortable }` | F8, F9                                               |
| `sort`              | `{ key, direction: 'asc' \| 'desc' }`                                  | F5                                                   |
| `vizMode`           | `'physical' \| 'seen'`                                                 | F12                                                  |
| `sizeMatchBy`       | `'height' \| 'width' \| 'diagonal'`                                    | F15                                                  |

Units are canonical in the store: inches, square inches, and factors. Conversion happens
only in the format layer, so the link never holds centimetres.

## URL format

A link is `#s=` followed by the **base64url** encoding (no padding) of **UTF-8 JSON**.
The JSON uses short keys and carries a version, `v: 1`.

| Long key            | Short | Value on the wire                                                                            |
| ------------------- | ----- | -------------------------------------------------------------------------------------------- |
| `v`                 | `v`   | always `1`                                                                                   |
| `view`              | `w`   | `"browse"`, `"compare"`                                                                      |
| `familiar`          | `f`   | `[[id, distance, scale], …]`                                                                 |
| `baselineId`        | `b`   | id or `null`                                                                                 |
| `compareIds`        | `c`   | `[id, …]`                                                                                    |
| `compareSettings`   | `cs`  | `{ [id]: [distance \| null, scale \| null] }`                                                |
| `hiddenFamiliarIds` | `h`   | `[id, …]`                                                                                    |
| `customDisplays`    | `cd`  | `[{ i, n, d, w, h, t? }, …]` (id, name, diagonal, width, height, tag)                        |
| `units`             | `u`   | `"m"` (metric), `"i"` (imperial)                                                             |
| `locale`            | `l`   | `"en"`, `"cs"`                                                                               |
| `presetId`          | `p`   | `"windows"`, `"macos"`, `"linux"`                                                            |
| `customScales`      | `x`   | `[factor, …]`                                                                                |
| `comfort`           | `cf`  | `{ m, a, b, c, d, mw }` = mode, minPpi, maxPpi, minPpd, maxPpd, minWidth                     |
| `filters`           | `fl`  | `{ q, t, a, mn, mx, oc }` = search, tags, aspects, minDiagonal, maxDiagonal, onlyComfortable |
| `sort`              | `s`   | `[key, "a" \| "d"]`                                                                          |
| `vizMode`           | `vm`  | `"p"` (physical), `"s"` (seen)                                                               |
| `sizeMatchBy`       | `sm`  | `"h"`, `"w"`, `"d"`                                                                          |

### Encoding rules

- Only fields that are present in the input are written. A partial state gives a partial
  link.
- Distances are rounded to 2 decimals and scales to 4 decimals (half away from zero).
- Custom displays are embedded as their inputs. The recipient gets the same comparison,
  and can save the displays with one tap (F19).

### Decoding rules

- The leading `#` is optional. Other parameters are ignored, so `#foo=1&s=…` works.
  Padded base64 is accepted.
- The `s` value is rejected when it is longer than 100,000 characters.
- The result is `null` when there is no `s` parameter, the text is not base64url, not
  UTF-8, or not JSON, the JSON is not an object, or `v` is not `1`.
- Otherwise each field is validated on its own. An invalid field is left out of the
  result, and an invalid item is dropped from its array. The rest is kept. A valid
  envelope with nothing usable gives `{}`.
- Limits: ids are 1 to 100 characters, names 1 to 120 (trimmed non-empty), search text
  200, aspect labels 20. Numbers must be finite and greater than 0, except `null` where
  a field allows it. Arrays keep their first 200 items, and duplicate ids keep their
  first occurrence.
- Decoded custom displays always have `isCustom: true`. A decoded `tag` that is not one
  of `laptop`, `monitor` or `ultrawide` is left out, and the display is kept.
- `comfort` and `filters` come back as partial objects. Merge them into the current
  settings (for example with `setComfort(partial)`) rather than replacing them.
- `decodeState` never throws. Property names from the payload are read only through the
  fixed field table, and compare settings are built with `Object.fromEntries`, so a key
  such as `__proto__` cannot change any prototype.

### Worked example

The typical shared comparison has two familiar displays, three compared displays and one
custom display. The units, language and preset are set. This is the state, written as
the app's `ViewState`:

```js
encodeState({
  view: 'compare',
  familiar: [
    { id: '27-4k-3840x2160', distance: 23.62, scale: 1.5 },
    { id: '24-fhd-1920x1080', distance: 23.62, scale: 1 },
  ],
  baselineId: '24-fhd-1920x1080',
  compareIds: ['27-4k-3840x2160', '32-4k-3840x2160', 'c-k3j9x2'],
  compareSettings: {
    '27-4k-3840x2160': { distance: 23.62, scale: 1.5 },
    '32-4k-3840x2160': { distance: 31.5, scale: 1.5 },
    'c-k3j9x2': { distance: 27.56, scale: 1.25 },
  },
  customDisplays: [
    {
      id: 'c-k3j9x2',
      name: 'Pracovní 34″',
      diagonal: 34,
      width: 3440,
      height: 1440,
      isCustom: true,
    },
  ],
  units: 'metric',
  locale: 'cs',
  presetId: 'windows',
})
```

The JSON inside the link is:

```json
{
  "v": 1,
  "w": "compare",
  "f": [
    ["27-4k-3840x2160", 23.62, 1.5],
    ["24-fhd-1920x1080", 23.62, 1]
  ],
  "b": "24-fhd-1920x1080",
  "c": ["27-4k-3840x2160", "32-4k-3840x2160", "c-k3j9x2"],
  "cs": {
    "27-4k-3840x2160": [23.62, 1.5],
    "32-4k-3840x2160": [31.5, 1.5],
    "c-k3j9x2": [27.56, 1.25]
  },
  "cd": [{ "i": "c-k3j9x2", "n": "Pracovní 34″", "d": 34, "w": 3440, "h": 1440 }],
  "u": "m",
  "l": "cs",
  "p": "windows"
}
```

The link is 475 characters:

```
#s=eyJ2IjoxLCJ3IjoiY29tcGFyZSIsImYiOltbIjI3LTRrLTM4NDB4MjE2MCIsMjMuNjIsMS41XSxbIjI0LWZoZC0xOTIweDEwODAiLDIzLjYyLDFdXSwiYiI6IjI0LWZoZC0xOTIweDEwODAiLCJjIjpbIjI3LTRrLTM4NDB4MjE2MCIsIjMyLTRrLTM4NDB4MjE2MCIsImMtazNqOXgyIl0sImNzIjp7IjI3LTRrLTM4NDB4MjE2MCI6WzIzLjYyLDEuNV0sIjMyLTRrLTM4NDB4MjE2MCI6WzMxLjUsMS41XSwiYy1rM2o5eDIiOlsyNy41NiwxLjI1XX0sImNkIjpbeyJpIjoiYy1rM2o5eDIiLCJuIjoiUHJhY292bsOtIDM04oCzIiwiZCI6MzQsInciOjM0NDAsImgiOjE0NDB9XSwidSI6Im0iLCJsIjoiY3MiLCJwIjoid2luZG93cyJ9
```

A state with only `view: 'compare'` and `units: 'imperial'` gives `#s=eyJ2IjoxLCJ3IjoiY29tcGFyZSIsInUiOiJpIn0`.
The test suite pins the typical link above.

### Link length

- Typical comparison (above, with units, language and preset): **475 characters**. This
  is under the 600-character target.
- The same comparison with `comfort`, `filters`, `sort`, `vizMode` and `sizeMatchBy`
  also present (at their default values): about **675 characters**. Base64 adds a third
  to the JSON length, so keep this in mind before adding fields to the link. Links this
  size still work everywhere, but they are long to paste.

## Versioning and migration

- The version lives in the link, as `v`, and is currently `1`. `decodeState` accepts only
  the version it knows, and returns `null` for any other value.
- **Additive changes do not bump the version.** A new optional field gets a new short key
  that old decoders ignore, and an old link is valid without it. Remove a short key only
  after it has been unused for a release.
- **A change in meaning or shape bumps the version to 2.** Renaming a key, changing an
  enum value or changing a unit is a breaking change. The decoder for version 2 then
  reads `v: 2` and keeps a separate branch for `v: 1`. Old links keep working, and new
  links are written at `v: 2`.
- The encoder always writes the current version.
- Keep the short keys stable. They are part of every link that has been shared.

## Local persistence

Data that must survive a reload is stored in IndexedDB through `idb-keyval`. The
database is `pixely` and the store is `state`. Each field is one key, so a save touches
only the keys it names.

| Key                | Type              | Default | Validation on load                                                                            |
| ------------------ | ----------------- | ------- | --------------------------------------------------------------------------------------------- |
| `customDisplays`   | `Display[]`       | `[]`    | array; each item needs a valid id, name, diagonal, width and height; unknown `tag` is dropped |
| `hiddenBuiltInIds` | `string[]`        | `[]`    | array of ids; duplicates removed                                                              |
| `familiar`         | `FamiliarEntry[]` | `[]`    | array; each entry needs a valid id, distance and scale; duplicates removed                    |
| `baselineId`       | `string \| null`  | `null`  | `null` or a valid id                                                                          |
| `preferences`      | plain object      | `{}`    | any plain object; its contents belong to the state layer                                      |
| `isOnboarded`      | `boolean`         | `false` | boolean                                                                                       |

- `loadPersisted()` returns all six fields. A missing or invalid field gets its default.
  Within a list, invalid items are dropped and the valid ones kept. Custom displays are
  returned in their canonical shape, with `isCustom: true`.
- `savePersisted(partial)` writes only the keys given, in one transaction. Unknown keys
  are ignored, and `undefined` leaves a field as it is. A value that fails validation is
  skipped, so the store never holds data that `loadPersisted` would reject.
- `clearPersisted()` empties the store. The next load returns the defaults.
- `DEFAULT_PERSISTED` is deeply frozen. `loadPersisted` returns fresh copies, so the
  defaults cannot be changed by mistake.

### Storage migrations

There is no IndexedDB schema version beyond the first. Each field is validated and
defaulted, so the store is tolerant by design:

- **Adding a field** needs nothing. Old data has no value for it, so it loads as the
  default.
- **Removing a field** needs nothing. The unused key is ignored.
- **Changing a field's shape** makes the old value invalid, so it loads as the default.
  If the old data matters, add a step to `loadPersisted` that reads the old shape and
  converts it before the normal validation runs. Then remove that step one release later.
- **Renaming a key** works the same way. Read the old key once in `loadPersisted`,
  write the new key, and delete the old one.

## Failure behaviour

The storage layer never breaks the app (PRD, "Storage"). Losing storage only loses
custom entries.

| Situation                                 | `loadPersisted`                   | `savePersisted` / `clearPersisted` |
| ----------------------------------------- | --------------------------------- | ---------------------------------- |
| IndexedDB missing (`indexedDB` undefined) | defaults                          | no-op                              |
| `open` fails or is blocked                | defaults                          | no-op                              |
| Transaction rejects                       | defaults                          | no-op                              |
| Corrupt value for one field               | that field's default, others kept | the bad value is skipped           |
| Corrupt item inside a list                | item dropped, the rest kept       | item skipped by its validator      |

- No function rejects or throws. Each one resolves.
- The first failure in a module instance logs one `console.warn`. Later failures are
  silent.
- The IndexedDB connection is created lazily, so importing the module cannot throw.
  A failed connection is retried on the next call.
- Storage writes are best-effort. The in-memory state stays correct. A failed save means
  the change is lost on the next reload, and nothing else is affected.

## Scale presets and input (`scales.js`)

- `SCALE_PRESETS` holds the three presets (F21). Windows is 100 to 200 % in 25 % steps,
  Linux/Wayland adds 110 %, and macOS lists "looks like" widths. The per-display macOS
  factor is derived in `calc/scaling.js`.
- `detectPresetId({ userAgent, platform })` picks the default preset. Mac, iPhone, iPad
  and iOS give `macos`. Android is checked before Linux, so it gives `windows`. Other
  Linux, X11 and ChromeOS systems give `linux`. Everything else gives `windows`.
- `parseScaleInput(text)` reads a custom scale typed by the user. `133`, `133 %`, `133%`
  and `1.33` are accepted, as are `1,33`, `2×` and `2x`. A bare number of 10 or more is
  a percent, and a smaller one is a factor. The result is rounded to 4 decimals and must
  be between 0.5 and 4 inclusive, or it is `null`.
