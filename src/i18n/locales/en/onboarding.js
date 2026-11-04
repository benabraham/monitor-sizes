/**
 * First-run onboarding (namespace `onboarding`, keys `onboarding.*`): pick the
 * familiar displays, then set how far away and at which scale they are used.
 */
export default {
  stepOf: 'Step {step} of {total}',
  step1Title: 'Which displays do you know?',
  step2Title: 'How do you use them?',
  intro:
    'Pick the displays you have seen or own. Every comparison is measured against them, so the more you know, the easier a new one is to judge. Choose at least one. Nothing is preselected.',
  units: 'Units',
  search: 'Search displays',
  searchEmpty: 'No displays match “{query}”.',
  selectedCount: 'Selected: {count}',
  groups: {
    laptops: 'Laptops',
    monitors: 'Monitors',
    ultrawides: 'Ultrawides',
  },
  displayLabel: '{name}, {diagonal}, {resolution}',
  addOwn: 'Add your own',
  addOwnTitle: 'Add your own display',
  addOwnSubmit: 'Add and select',
  baselineHint: 'The first display you pick is the baseline. You can change it later.',
  noDisplays: 'There are no displays yet. Add your own to start.',
  pickAtLeastOne: 'Pick at least one display',
  continue: 'Continue',
  back: 'Back',
  finish: 'Finish',
}
