/**
 * Texty zobrazení Procházet (jmenný prostor `browse`, klíče `browse.*`).
 *
 * Společná slova (Známé, Referenční displej, Porovnat, Přidat displej, stejné) jsou
 * v `common.*`. Záhlaví metrik a nápověda jsou v `metrics.*`.
 */
export default {
  title: 'Procházet',
  baselineMarker: 'Referenční',
  setBaselineHint: 'Nastavit {name} jako referenční',
  familiarEmpty: 'Označte displej jako známý a použijte ho jako referenci.',
  search: 'Hledat displeje',
  searchPlaceholder: 'Hledat podle názvu',
  filterType: 'Typ',
  tag: {
    laptop: 'Notebook',
    monitor: 'Monitor',
    ultrawide: 'Ultrawide',
  },
  filterAspect: 'Poměr stran',
  filterDiagonal: 'Úhlopříčka',
  diagonalMin: 'Nejmenší',
  diagonalMax: 'Největší',
  clearMin: 'Zrušit nejmenší úhlopříčku',
  clearMax: 'Zrušit největší úhlopříčku',
  onlyComfortable: 'Jen displeje s pohodlným měřítkem',
  clearFilters: 'Zrušit filtry',
  count: 'Zobrazené displeje: {count}',
  emptyFiltered: 'Těmto filtrům neodpovídá žádný displej.',
  emptyAll: 'Zatím nejsou žádné displeje.',
  compareButton: 'Porovnat ({count})',
  markFamiliar: 'Označit {name} jako známý',
  compareDisplay: 'Porovnat {name}',
  compareAdded: 'Přidáno do porovnání: {name}',
  compareRemoved: 'Odebráno z porovnání: {name}',
  custom: 'Vlastní',
  bestScale: 'Nejlepší',
  bestScaleHeading: 'Nejlepší pohodlné měřítko',
  noComfortableScale: 'Žádné pohodlné měřítko',
  comfortableScales: 'Pohodlná měřítka',
  helpLabel: 'Nápověda: {metric}',
  tableCaption: 'Displeje porovnané s referenčním displejem',
  col: {
    familiar: 'Známý',
    compare: 'Porovnat',
    name: 'Název',
  },
}
