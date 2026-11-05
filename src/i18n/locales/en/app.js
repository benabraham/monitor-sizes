/**
 * App shell strings (namespace `app`, keys `app.*`): the skip link, the Display actions
 * dialog, the Compare manager (add, hide, remove), and the hidden built-in displays in
 * Settings. Shared words come from `common.*`, metric names from `metrics.*`.
 */
export default {
  skipToContent: 'Skip to content',
  actions: {
    markFamiliar: 'Mark as familiar',
    unmarkFamiliar: 'Remove from familiar displays',
    setBaseline: 'Make this the baseline',
    isBaseline: 'This is the baseline. Every comparison is measured against it.',
    alwaysCompared: 'The baseline is always in Compare.',
    addToCompare: 'Add to Compare',
    removeFromCompare: 'Remove from Compare',
    showInCompare: 'Show in Compare',
    hideFromCompare: 'Hide from Compare',
    customHint: 'Your own display. You can edit it or delete it.',
    deleteHint: 'Deleting also removes it from your familiar displays and from Compare.',
    hideFromList: 'Hide from list',
    hideFromListHint:
      'Hides this built-in display from Browse and Compare. You can show it again in Settings.',
  },
  compare: {
    empty: 'Pick displays to compare in Browse or add one here.',
    goBrowse: 'Go to Browse',
    manageHeading: 'Displays in this comparison',
    addLabel: 'Add a display to the comparison',
    addHint: 'Start typing, then pick a display from the list.',
    addSubmit: 'Add',
    addNotFound: 'Pick a display from the list.',
    hide: 'Hide',
    hideName: 'Hide {name} from Compare',
    show: 'Show',
    showName: 'Show {name} in Compare',
    remove: 'Remove',
    removeName: 'Remove {name} from Compare',
    setBaseline: 'Set as baseline',
    setBaselineName: 'Set {name} as baseline',
  },
  hidden: {
    title: 'Hidden built-in displays',
    description: 'Built-in displays you hid from Browse and Compare.',
    empty: 'No built-in displays are hidden.',
    show: 'Show',
    showName: 'Show {name}',
  },
}
