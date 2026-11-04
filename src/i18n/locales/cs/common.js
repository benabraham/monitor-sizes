/**
 * Sdílené texty rozhraní používané napříč funkcemi (jmenný prostor `common`, klíče `common.*`).
 *
 * Texty konkrétní funkce patří do vlastního souboru jmenného prostoru. Klíče
 * zůstávají statické a doslovné, aby šly najít přes grep. Viz docs/I18N.md.
 */
export default {
  same: 'stejné',
  appName: 'Pixely a monitory',
  units: {
    metric: 'Metrické',
    imperial: 'Imperiální',
  },
  language: {
    en: 'English',
    cs: 'Čeština',
  },
  yes: 'Ano',
  no: 'Ne',
  close: 'Zavřít',
  cancel: 'Zrušit',
  save: 'Uložit',
  delete: 'Smazat',
  deleteConfirm: 'Smazat „{name}“?',
  edit: 'Upravit',
  add: 'Přidat',
  apply: 'Použít',
  reset: 'Obnovit výchozí',
  copyLink: 'Kopírovat odkaz',
  linkCopied: 'Odkaz zkopírován',
  addDisplay: 'Přidat displej',
  browse: 'Procházet',
  compare: 'Porovnat',
  settings: 'Nastavení',
  help: 'Nápověda',
  loading: 'Načítání…',
  scale: 'Měřítko',
  distance: 'Vzdálenost',
  baseline: 'Referenční displej',
  familiar: 'Známé displeje',
  candidate: 'Porovnávaný displej',
  genericError: 'Něco se pokazilo.',
}
