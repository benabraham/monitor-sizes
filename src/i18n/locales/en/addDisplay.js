/**
 * "Add display" and "Edit display" form (namespace `addDisplay`, keys
 * `addDisplay.*`). Field names, live preview, resolution presets, the "Like my
 * screen" helper and the familiar option.
 */
export default {
  title: 'Add display',
  editTitle: 'Edit display',
  name: 'Name',
  diagonal: 'Diagonal',
  width: 'Width',
  height: 'Height',
  presets: 'Common resolutions',
  likeScreen: 'Like my screen',
  likeScreenHint:
    'Fills in the resolution and scale of this screen. Only the diagonal is left to enter.',
  likeScreenNote: 'Now enter the diagonal.',
  tag: 'Type',
  tagLaptop: 'Laptop',
  tagMonitor: 'Monitor',
  tagUltrawide: 'Ultrawide',
  tagSuggested: 'Suggested from the size and shape. Pick a type to change it.',
  preview: {
    title: 'Preview',
    size: 'Size',
    empty: 'Enter the diagonal and the resolution to see the preview.',
  },
  isFamiliar: 'I know this one',
  isFamiliarHint:
    'Adds it to the displays you know, with the distance and scale you use.',
  hint: {
    incomplete: 'Fill in the required fields to continue.',
  },
  error: {
    nameRequired: 'Enter a name.',
    diagonalRequired: 'Enter the diagonal.',
    diagonalRange: 'Enter a diagonal from {min} to {max}.',
    pixelsRequired: 'Enter the number of pixels.',
    pixelsRange: 'Enter a whole number from {min} to {max}.',
    distanceRequired: 'Enter the distance.',
    distanceRange: 'Enter a distance from {min} to {max}.',
  },
}
