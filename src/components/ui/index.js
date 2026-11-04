/**
 * Public surface of the UI primitives. Feature components import from here:
 *
 * @example
 * import { Button, Chip, Dialog, Segmented, NumberField } from '../ui/index.js'
 *
 * `HelpPopover` lives in `components/help-popover` and is not re-exported here, to
 * keep this barrel to reusable primitives.
 *
 * @module components/ui
 */

export { Button } from './button/button.jsx'
export { Chip } from './chip/chip.jsx'
export { Dialog } from './dialog/dialog.jsx'
export { Icon, ICON_NAMES } from './icon/icon.jsx'
export { NumberField, parseLocaleNumber } from './number-field/number-field.jsx'
export { Segmented } from './segmented/segmented.jsx'
export { Slider } from './slider/slider.jsx'
