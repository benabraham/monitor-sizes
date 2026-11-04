/**
 * Metric column headers and inline help (namespace `metrics`, keys
 * `metrics.<metric>.label` and `metrics.<metric>.help`).
 *
 * - `label` is the short column header. It carries no unit: the caller adds the
 *   unit from the active unit system, for example `cm` or `in`.
 * - `help` is one to three plain sentences for the help popover (F20).
 *   It replaces the old "halp" sheet.
 */
export default {
  diagonal: {
    label: 'Diagonal',
    help: 'The screen size, measured corner to corner in inches, as manufacturers quote it. Together with the resolution it sets the PPI.',
  },
  ppi: {
    label: 'PPI',
    help: 'Pixels per inch: how many pixels fit into one inch of the screen. A higher PPI means smaller pixels, a sharper picture and a less visible pixel grid.',
  },
  relativePixelSize: {
    label: 'Relative pixel size',
    help: 'How big the pixels are compared with the baseline, from the PPI ratio. Negative means smaller pixels, so a smoother and less visible picture. Positive means larger pixels, which are easier to see.',
  },
  aspect: {
    label: 'Aspect ratio',
    help: 'The shape of the screen as width to height, given as a common name such as 16:9 or 21:9. A name in quotes is approximate. If no name fits, the plain ratio is shown.',
  },
  resolution: {
    label: 'Resolution',
    help: 'The native pixel count, width × height. These are the pixels the panel physically has, before any OS scaling.',
  },
  width: {
    label: 'Width',
    help: 'The physical width of the screen, calculated from the horizontal pixel count and the PPI. Shown in cm, or in inches with imperial units.',
  },
  height: {
    label: 'Height',
    help: 'The physical height of the screen, calculated from the vertical pixel count and the PPI. Shown in cm, or in inches with imperial units.',
  },
  widthDiff: {
    label: 'Width difference',
    help: 'How much wider (positive) or narrower (negative) the screen is than the baseline, as an absolute length. Zero means the same width.',
  },
  heightDiff: {
    label: 'Height difference',
    help: 'How much taller (positive) or shorter (negative) the screen is than the baseline, as an absolute length. Zero means the same height.',
  },
  area: {
    label: 'Area',
    help: 'The physical area of the visible screen, width times height. It shows how much screen surface there is.',
  },
  areaRatio: {
    label: 'Area vs baseline',
    help: 'How much larger (positive) or smaller (negative) the screen area is than the baseline, as a percentage.',
  },
  megapixels: {
    label: 'Megapixels',
    help: 'The total native pixel count in millions, width times height. It ignores OS scaling, so it compares the raw panels.',
  },
  megapixelRatio: {
    label: 'Megapixels vs baseline',
    help: 'How many more (positive) or fewer (negative) native pixels the panel has than the baseline, as a percentage.',
  },
  logicalResolution: {
    label: 'Logical resolution',
    help: 'The workspace the system shows at the chosen scale: native resolution divided by the scale. A 4K panel at 200 % gives a 1920 × 1080 workspace.',
  },
  effectivePpi: {
    label: 'Effective PPI',
    help: 'How dense text and interface look at the chosen scale: PPI divided by the scale. The comfortable range is usually around 90 to 105.',
  },
  workspace: {
    label: 'Workspace',
    help: 'How many workspace pixels fit on screen at the chosen scale, in millions. Each step up in scale shows fewer, because both the width and the height shrink.',
  },
  comfortable: {
    label: 'Comfortable',
    help: 'Whether this scale fits your comfort window: the effective PPI (or logical PPD in PPD mode) inside the range you set, and a logical width at least the minimum. Comfortable scales are highlighted.',
  },
  horizontalFov: {
    label: 'Horizontal FOV',
    help: "The angle the screen's width covers in your field of view at your viewing distance, in degrees. A larger angle means the screen fills more of your sight.",
  },
  verticalFov: {
    label: 'Vertical FOV',
    help: "The angle the screen's height covers in your field of view at your viewing distance, in degrees. A larger angle means the screen fills more of your sight vertically.",
  },
  ppd: {
    label: 'PPD',
    help: 'Pixels per degree: how many pixels fit into one degree of your view. Roughly 60 is often quoted as the limit of normal 20/20 vision, beyond which single pixels stop being visible.',
  },
  logicalPpd: {
    label: 'Logical PPD',
    help: 'Pixels per degree at the chosen scale: PPD divided by the scale. This is the comfort measure used when the comfort window is set to PPD.',
  },
  sameSize: {
    label: 'Same size at',
    help: 'The viewing distance at which this screen looks the same size as the baseline. Matching uses height by default, or width or diagonal if you choose. Sitting at this distance gives the same apparent size.',
  },
  sameSharpness: {
    label: 'Same sharpness at',
    help: 'The viewing distance at which this screen shows the same pixels per degree as the baseline does at its distance. Sitting this far back gives the same sharpness. A denser screen can be viewed from further away.',
  },
  sameTextSize: {
    label: 'Same text size at',
    help: 'The viewing distance at which text on this screen, at its chosen scale, looks the same size as text on the baseline at its distance and scale. Use it to keep the same reading size.',
  },
}
