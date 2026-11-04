/**
 * Browse view strings (namespace `browse`, keys `browse.*`).
 *
 * Shared words (Familiar, Baseline, Compare, Add display, same) come from
 * `common.*`. Metric headers and help come from `metrics.*`.
 */
export default {
  title: 'Browse',
  baselineMarker: 'Baseline',
  setBaselineHint: 'Make {name} the baseline',
  familiarEmpty: 'Mark a display as familiar to use it as a baseline.',
  search: 'Search displays',
  searchPlaceholder: 'Search by name',
  filterType: 'Type',
  tag: {
    laptop: 'Laptop',
    monitor: 'Monitor',
    ultrawide: 'Ultrawide',
  },
  filterAspect: 'Aspect ratio',
  filterDiagonal: 'Diagonal',
  diagonalMin: 'Minimum',
  diagonalMax: 'Maximum',
  clearMin: 'Clear minimum diagonal',
  clearMax: 'Clear maximum diagonal',
  onlyComfortable: 'Only displays with a comfortable scale',
  clearFilters: 'Clear filters',
  count: 'Displays shown: {count}',
  emptyFiltered: 'No displays match these filters.',
  emptyAll: 'No displays to show yet.',
  compareButton: 'Compare ({count})',
  markFamiliar: 'Mark {name} as familiar',
  compareDisplay: 'Compare {name}',
  custom: 'Custom',
  bestScale: 'Best',
  bestScaleHeading: 'Best comfortable scale',
  noComfortableScale: 'No comfortable scale',
  comfortableScales: 'Comfortable scales',
  helpLabel: 'Help: {metric}',
  tableCaption: 'Displays compared with the baseline',
  col: {
    familiar: 'Familiar',
    compare: 'Compare',
    name: 'Name',
  },
}
