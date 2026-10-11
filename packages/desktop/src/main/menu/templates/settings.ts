import { type MenuItemConstructorOptions } from 'electron'
import { userSetting } from '../actions/marktext'
import { t } from '../../i18n'

export default function(): MenuItemConstructorOptions {
  return {
    label: t('menu.file.preferences'),
    click() {
      userSetting()
    }
  }
}
