/**
 * Inline SVG icon set. Icons are drawn on a 24 × 24 grid with `currentColor`
 * strokes, so they take the text colour of their container and follow the theme.
 *
 * Decorative by default (`aria-hidden`). Pass `title` when the icon carries meaning
 * on its own; it then becomes a labelled `img`.
 *
 * @module components/ui/icon/icon
 */

/**
 * Icon drawing functions keyed by name. Each returns SVG children for the 24 × 24
 * grid. Kept as functions so every render creates fresh vnodes.
 *
 * @type {Record<string, () => import('preact').JSX.Element>}
 */
const ICONS = {
  star: () => (
    <polygon points="12 2.5 14.47 9.1 21.51 9.41 16 13.8 17.88 20.59 12 16.7 6.12 20.59 8 13.8 2.49 9.41 9.53 9.1" />
  ),
  'star-filled': () => (
    <polygon
      points="12 2.5 14.47 9.1 21.51 9.41 16 13.8 17.88 20.59 12 16.7 6.12 20.59 8 13.8 2.49 9.41 9.53 9.1"
      fill="currentColor"
    />
  ),
  plus: () => <path d="M12 5v14M5 12h14" />,
  close: () => <path d="M6 6l12 12M18 6L6 18" />,
  help: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4" />
      <path d="M12 17h.01" />
    </>
  ),
  link: () => (
    <>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </>
  ),
  compare: () => (
    <>
      <rect x="3" y="4" width="8" height="16" rx="1.5" />
      <rect x="13" y="4" width="8" height="16" rx="1.5" />
    </>
  ),
  check: () => <path d="M5 12.5l4.5 4.5L19 7.5" />,
  trash: () => <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />,
  edit: () => (
    <>
      <path d="M4 20h4L19.5 8.5l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  'chevron-down': () => <path d="M6 9l6 6 6-6" />,
  'sort-asc': () => <path d="M12 19V5M6 11l6-6 6 6" />,
  'sort-desc': () => <path d="M12 5v14M6 13l6 6 6-6" />,
  monitor: () => (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  laptop: () => (
    <>
      <rect x="5" y="5" width="14" height="10" rx="1.5" />
      <path d="M2.5 19h19" />
    </>
  ),
  settings: () => (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  upload: () => (
    <>
      <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </>
  ),
  download: () => (
    <>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </>
  ),
  eye: () => (
    <>
      <path d="M2.5 12C4.7 8 8 5.5 12 5.5s7.3 2.5 9.5 6.5c-2.2 4-5.5 6.5-9.5 6.5S4.7 16 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': () => (
    <>
      <path d="M2.5 12C4.7 8 8 5.5 12 5.5s7.3 2.5 9.5 6.5c-2.2 4-5.5 6.5-9.5 6.5S4.7 16 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M4 4l16 16" />
    </>
  ),
}

/**
 * Names accepted by {@link Icon}.
 *
 * @type {readonly string[]}
 */
export const ICON_NAMES = Object.freeze(Object.keys(ICONS))

/**
 * Render one icon from the built-in set.
 *
 * Unknown names render nothing and log a warning in development, so a typo never
 * breaks the layout.
 *
 * @param {object} props
 * @param {string} props.name Icon name from {@link ICON_NAMES}, e.g. `'star-filled'`.
 * @param {number} [props.size=16] Width and height in CSS pixels.
 * @param {string} [props.title] Accessible name. When set the icon is exposed as
 *   `role="img"` with this text; when omitted the icon is hidden from assistive tech.
 * @returns {import('preact').JSX.Element | null}
 *
 * @example
 * <Icon name="star-filled" title="Familiar display" />
 * <Icon name="chevron-down" size={12} />
 */
export const Icon = ({ name, size = 16, title }) => {
  const draw = ICONS[name]
  if (!draw) {
    if (import.meta.env.DEV) console.warn(`Icon: unknown icon name "${name}"`)
    return null
  }
  const isLabelled = typeof title === 'string' && title.length > 0
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      role={isLabelled ? 'img' : undefined}
      aria-hidden={isLabelled ? undefined : 'true'}
    >
      {isLabelled && <title>{title}</title>}
      {draw()}
    </svg>
  )
}
