import { t } from '../../i18n/index.js'
import { HelpPopover } from '../help-popover/help-popover.jsx'
import './settings-group.css'

/**
 * One titled group of the settings panel, with a `?` help popover beside the heading.
 * The heading names the group for assistive technology (`aria-labelledby`).
 *
 * @param {object} props
 * @param {string} props.id Stable prefix for the heading and help ids, e.g. `'units'`.
 * @param {string} props.title Visible heading.
 * @param {string} props.help Explanation shown in the help popover.
 * @param {import('preact').ComponentChildren} props.children Group controls.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <SettingsGroup id="units" title="Units" help="Metric or imperial.">
 *   <Segmented … />
 * </SettingsGroup>
 */
export const SettingsGroup = ({ id, title, help, children }) => {
  const titleId = `settings-${id}-title`
  return (
    <section class="settings-group" aria-labelledby={titleId}>
      <div class="settings-group__heading">
        <h3 id={titleId} class="settings-group__title">
          {title}
        </h3>
        <HelpPopover
          id={`settings-${id}-help`}
          label={t('settings.help.label', { topic: title })}
          title={title}
        >
          <p>{help}</p>
        </HelpPopover>
      </div>
      <div class="settings-group__body">{children}</div>
    </section>
  )
}
