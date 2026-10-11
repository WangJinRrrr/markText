import { type MenuItemConstructorOptions } from 'electron'
import edit from './edit'
import prefEdit from './prefEdit'
import marktext from './marktext'
import view from './view'
import paragraph from './paragraph'
import format from './format'
import settings from './settings'
import type Keybindings from '../../keyboard/shortcutHandler'
import type Preference from '../../preferences'

export { default as dockMenu } from './dock'

/**
 * Create the setting window menu.
 *
 * @param keybindings The keybindings instance
 */
export const configSettingMenu = (keybindings: Keybindings): MenuItemConstructorOptions[] => {
  return [
    ...(process.platform === 'darwin' ? [marktext(keybindings)] : []),
    prefEdit(keybindings)
  ]
}

/**
 * Create the application menu for the editor window.
 *
 * @param keybindings The keybindings instance.
 * @param preferences The preference instance.
 * @param recentlyUsedFiles The recently used files.
 */
export default function(
  keybindings: Keybindings,
  preferences: Preference
): MenuItemConstructorOptions[] {
  return [
    ...(process.platform === 'darwin' ? [marktext(keybindings)] : []),
    edit(keybindings),
    paragraph(keybindings, preferences),
    format(keybindings),
    view(keybindings),
    settings()
  ]
}
