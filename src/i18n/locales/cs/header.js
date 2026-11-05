/**
 * Texty hlavičky, panelu nástrojů a sdíleného zobrazení (jmenný prostor `header`, klíče `header.*`).
 * Patří shellu aplikace: hlavička, kopírování odkazu, souhrn pohodlného okna a banner sdílení.
 */
export default {
  shortName: 'Pixely',
  nav: {
    label: 'Zobrazení',
    compareCount: 'Porovnat ({count})',
  },
  preset: {
    label: 'Předvolba měřítka',
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
  },
  copyLink: {
    fieldLabel: 'Odkaz na toto porovnání',
    fallbackHint: 'Kopírování tady není dostupné. Odkaz je vybraný, zkopírujte ho ručně.',
  },
  comfort: {
    ppi: 'Pohodlné: {min}–{max} PPI · ≥ {width}\u00a0px',
    ppd: '{min}–{max}\u00a0px/° · ≥ {width}\u00a0px',
  },
  shared: {
    label: 'Sdílené porovnání',
    message: 'Prohlížíte sdílené porovnání. Vaše vlastní displeje zůstávají beze změny.',
    keep: 'Ponechat',
    discard: 'Zpět na moje',
  },
}
