import { defineStore } from 'pinia'
import notice, { type NotifyOptions } from '../services/notification'
import { t } from '../i18n'

export const useNotificationStore = defineStore('notification', () => {
  function listenForNotification(): void {
    const DEFAULT_OPTS = {
      title: t('notifications.defaultTitle'),
      type: 'primary' as const,
      time: 10000,
      message: t('notifications.defaultMessage')
    }

    window.electron.ipcRenderer.on('mt::show-notification', (_e, opts) => {
      const options = Object.assign({ ...DEFAULT_OPTS }, opts as Partial<NotifyOptions>)
      notice.notify(options)
    })
  }

  return { listenForNotification }
})
