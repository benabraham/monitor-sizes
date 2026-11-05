/**
 * Header, toolbar and shared-view strings (namespace `header`, keys `header.*`).
 * Owned by the app shell: app header, copy link, comfort summary and shared banner.
 */
export default {
  shortName: 'Pixely',
  nav: {
    label: 'Views',
    compareCount: 'Compare ({count})',
  },
  preset: {
    label: 'Scale preset',
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
  },
  copyLink: {
    fieldLabel: 'Link to this comparison',
    fallbackHint:
      'Copying is not available here. The link is selected, so copy it by hand.',
  },
  comfort: {
    ppi: 'Comfortable: {min}–{max} PPI · ≥ {width}\u00a0px',
    ppd: '{min}–{max}\u00a0px/° · ≥ {width}\u00a0px',
  },
  shared: {
    label: 'Shared comparison',
    message: "You're viewing a shared comparison. Your own displays are untouched.",
    keep: 'Keep it',
    discard: 'Back to mine',
  },
}
