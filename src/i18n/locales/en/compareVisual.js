/**
 * Texts of the Compare visualization and per-display controls (namespace
 * `compareVisual`, keys `compareVisual.*`). Keys are literal so they can be
 * found by grep. Placeholders must match the Czech file (parity test).
 */
export default {
  visualization: {
    title: 'Visualization',
    modeLabel: 'Drawing mode',
    modePhysical: 'Physical',
    modeSeen: 'As seen',
    svgTitlePhysical: 'Physical size of the compared displays',
    svgTitleSeen: 'Apparent size of the compared displays',
    svgDescPhysical:
      'The {count} compared displays are drawn to one length scale and aligned at the bottom centre. The sizes are listed below the drawing.',
    svgDescSeen:
      'The {count} compared displays are drawn at their angle from each viewing distance, aligned at the bottom centre. The angles are listed below the drawing.',
    captionPhysical: 'Physical: true relative size on one length scale.',
    captionSeen:
      'As seen: each outline shows its angle from its viewing distance, so equal angles look equal. Same-size distances match by {sizeBy}.',
    sizesHeading: 'Sizes',
    sizePhysical: '{width} × {height}',
    sizeSeen: '{horizontal} × {vertical}, from {distance}',
    empty: 'Choose at least one display to compare.',
  },
  sizeBy: {
    label: 'Match size by',
    option: {
      height: 'Height',
      width: 'Width',
      diagonal: 'Diagonal',
    },
    of: {
      height: 'height',
      width: 'width',
      diagonal: 'diagonal',
    },
  },
  list: {
    label: 'Compared displays',
  },
  badge: {
    baseline: 'Baseline',
    familiar: 'Familiar',
    candidate: 'Compared',
  },
  distance: {
    label: 'Distance',
    exact: 'Exact distance',
  },
  scale: {
    hint: '✓ marks comfortable scales',
    looksLike: 'looks like {resolution}',
  },
  match: {
    heading: 'Match the baseline',
    sameSize: 'Match size',
    sameSharpness: 'Match sharpness',
    sameTextSize: 'Match text size',
    description: 'Sets the viewing distance to {distance}',
  },
  equivalence:
    'Looks like your {baseline} at {sameSize} · as sharp at {sameSharpness} · same text size at {sameTextSize} ({scale})',
}
