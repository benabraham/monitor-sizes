/**
 * Settings panel strings (namespace `settings`, keys `settings.*`): units, language,
 * scale presets, custom scales and the comfort window. Each group has a help text.
 */
export default {
  help: {
    label: 'Help: {topic}',
  },
  units: {
    title: 'Units',
    help: 'Metric shows centimetres and dm², imperial inches and in². Values are stored in inches, so switching loses nothing.',
  },
  language: {
    title: 'Language',
    help: 'The interface language. Numbers follow it too, so Czech uses a decimal comma.',
  },
  presets: {
    title: 'Scale preset',
    help: 'Your operating system scales text and apps in its own steps. The preset decides which scales the matrix lists. It starts from the system you are on.',
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux (Wayland)',
    windowsHint: '{min}–{max} in {step} steps.',
    macosHint:
      '“Looks like” widths from {min} to {max}\u00a0px. Scale is native width ÷ looks-like width, from 1× to 2×.',
    linuxHint: 'Steps: {scales}.',
  },
  customScales: {
    title: 'Custom scales',
    help: 'Add a scale your system offers that the preset lacks, such as 133\u00a0% or 300\u00a0%. Type 133, 133\u00a0%, 1.33 or 1,33. The allowed range is 50–400\u00a0%.',
    empty: 'No custom scales yet.',
    inputLabel: 'Scale to add',
    placeholder: 'for example 133\u00a0%',
    invalid: 'Enter a scale from {min} to {max}, for example 133\u00a0% or 1.33.',
    duplicate: 'That scale is already in the list.',
    remove: 'Remove {scale}',
  },
  comfort: {
    title: 'Comfort window',
    help: 'A scale is comfortable when its effective PPI is inside the window and its logical width is at least the minimum. Pixels per degree also counts the viewing distance: Browse uses the baseline display’s distance, Compare uses each display’s own distance.',
    rule: 'Rule',
    mode: {
      ppi: 'PPI',
      ppd: 'Pixels per degree',
    },
    minPpi: 'Minimum PPI',
    maxPpi: 'Maximum PPI',
    minPpd: 'Minimum px/°',
    maxPpd: 'Maximum px/°',
    ppdHint:
      'Browse uses the baseline display’s viewing distance; Compare uses each display’s own distance.',
    minWidth: 'Minimum logical width',
    rangeError: 'The minimum must not be higher than the maximum.',
  },
}
