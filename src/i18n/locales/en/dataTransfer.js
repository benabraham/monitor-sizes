/**
 * JSON export and import of custom displays and the familiar set (namespace
 * `dataTransfer`, keys `dataTransfer.*`, PRD F18).
 */
export default {
  title: 'Data',
  description:
    'Export your custom displays and familiar set as a JSON file, or import one. Built-in displays are not included.',
  export: 'Export JSON',
  import: 'Import JSON',
  importSuccess: 'Displays imported.',
  error: {
    invalidJson: 'The file is not valid JSON.',
    invalidFormat: 'The file does not contain displays in the expected format.',
    unknown: 'The file could not be imported.',
  },
}
