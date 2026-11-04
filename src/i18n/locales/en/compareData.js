/**
 * Strings of the Compare view's data part: the metric grid and the scaling
 * matrix (namespace `compareData`, keys `compareData.*`).
 *
 * Metric labels and help texts come from the `metrics` namespace. This file adds
 * only what is specific to Compare: section headings, entry badges, the two rows
 * that have no metric entry (viewing distance and scale), and matrix markers.
 */
export default {
  sections: {
    metrics: 'Metrics',
    scaling: 'Scaling',
  },
  metricColumn: 'Metric',
  help: 'Help: {name}',
  caption: {
    metrics: 'Metrics for each compared display',
    matrix: 'Scaling options for {name}',
  },
  badge: {
    baseline: 'Baseline',
    familiar: 'Familiar',
    candidate: 'Candidate',
  },
  rows: {
    distance: {
      label: 'Viewing distance',
      help: 'How far your eyes sit from this display. A candidate starts at the baseline distance. Moving it further back makes the display look smaller, and moving it closer makes it look bigger.',
    },
    scale: {
      label: 'Scale',
      help: 'The OS scale used on this display in the comparison. Familiar displays keep the scale you saved. A candidate starts at its best comfortable scale, and you can change it.',
    },
  },
  matrix: {
    looksLike: 'looks like {size}',
    comfortable: 'Comfortable',
    notComfortable: 'Outside the comfort window',
    inUse: 'In use',
    recommended: 'Recommended',
  },
  noComfortable: 'No comfortable scale',
  comfortable: {
    label: 'Comfortable scales',
    more: '+{count} more',
  },
}
