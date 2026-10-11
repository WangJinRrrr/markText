import path from 'path'
import fs from 'fs-extra'
import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { confirmAndTrashItem } from '../filesystem/trash'
import { isDangerousExecutableFile } from 'common/filesystem/paths'
import { t } from '../i18n'
import { hasMarkdownExtension } from 'common/filesystem/paths'
import type { RepositoryEntry } from '@shared/types/ipc'

const isOutside = (root: string, target: string): boolean => {
  const relative = path.relative(root, target)
  return relative.startsWith('..') || path.isAbsolute(relative)
}

const resolveExisting = async(pathname: string): Promise<string> => fs.realpath(path.resolve(pathname))

const resolveChild = async(root: string, pathname: string): Promise<string> => {
  const rootPath = await resolveExisting(root)
  const candidate = path.resolve(pathname)
  if (isOutside(rootPath, candidate)) throw new Error('The target must stay inside the repository.')

  const parent = await resolveExisting(path.dirname(candidate))
  const resolved = path.join(parent, path.basename(candidate))
  if (isOutside(rootPath, resolved)) throw new Error('The target must stay inside the repository.')
  return resolved
}

const resolveSource = async(root: string, pathname: string): Promise<string> => {
  const rootPath = await resolveExisting(root)
  const resolved = await resolveExisting(pathname)
  if (resolved === rootPath || isOutside(rootPath, resolved)) {
    throw new Error('The repository root cannot be changed.')
  }
  return resolved
}

const ensureNotDescendant = (source: string, target: string): void => {
  if (source === target || !isOutside(source, target)) {
    throw new Error('A directory cannot be copied into itself.')
  }
}

const listTree = async(pathname: string): Promise<RepositoryEntry> => {
  const stats = await fs.lstat(pathname)
  const isDirectory = stats.isDirectory()
  const entry: RepositoryEntry = {
    pathname,
    name: path.basename(pathname),
    isDirectory,
    isFile: stats.isFile(),
    isMarkdown: stats.isFile() && hasMarkdownExtension(pathname),
    isSymbolicLink: stats.isSymbolicLink()
  }
  if (isDirectory) {
    const children = await fs.readdir(pathname)
    entry.children = []
    for (const child of children.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))) {
      const childPath = path.join(pathname, child)
      if (child === 'node_modules' || child.endsWith('.asar')) continue
      entry.children.push(await listTree(childPath))
    }
  }
  return entry
}

const register = <T extends unknown[]>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: T) => Promise<unknown>
): void => {
  ipcMain.handle(channel, handler)
}

export const registerRepositoryHandlers = (): void => {
  register('mt::repository::list', async(_event, root: string) => {
    const rootPath = await resolveExisting(root)
    return listTree(rootPath)
  })

  register('mt::repository::open', async(event, root: string, target: string) => {
    const current = await resolveSource(root, target)
    const win = BrowserWindow.fromWebContents(event.sender)
    if (isDangerousExecutableFile(current)) {
      const options = {
        type: 'warning' as const,
        buttons: [t('dialog.cancel'), t('dialog.openAnyway')],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
        title: t('dialog.unsafeFileTitle'),
        message: t('dialog.unsafeFileMessage'),
        detail: t('dialog.unsafeFileDetail', { name: path.basename(current) })
      }
      const { response } = win
        ? await dialog.showMessageBox(win, options)
        : await dialog.showMessageBox(options)
      if (response !== 1) return false
    }
    await shell.openPath(current)
    return true
  })

  register('mt::repository::create', async(_event, root: string, parent: string, name: string, type: 'file' | 'directory') => {
    if (!name || /[/\\]/.test(name) || name === '.' || name === '..' || (type !== 'file' && type !== 'directory')) throw new Error('Invalid repository item.')
    const target = await resolveChild(root, path.join(parent, name))
    if (await fs.pathExists(target)) throw new Error('An item with that name already exists.')
    if (type === 'directory') await fs.ensureDir(target)
    else await fs.outputFile(target, '')
  })

  register('mt::repository::rename', async(_event, root: string, source: string, name: string) => {
    if (!name || /[/\\]/.test(name) || name === '.' || name === '..') throw new Error('Invalid repository name.')
    const current = await resolveSource(root, source)
    const target = await resolveChild(root, path.join(path.dirname(current), name))
    if (await fs.pathExists(target)) throw new Error('An item with that name already exists.')
    await fs.move(current, target, { overwrite: false })
  })

  register('mt::repository::copy', async(_event, root: string, source: string, parent: string, name: string, type: 'copy' | 'cut') => {
    if (!name || /[/\\]/.test(name) || name === '.' || name === '..' || (type !== 'copy' && type !== 'cut')) {
      throw new Error('Invalid repository operation.')
    }
    const current = await resolveSource(root, source)
    const target = await resolveChild(root, path.join(parent, name))
    ensureNotDescendant(current, target)
    if (await fs.pathExists(target)) throw new Error('An item with that name already exists.')
    if (type === 'cut') await fs.move(current, target, { overwrite: false })
    else await fs.copy(current, target, { overwrite: false, errorOnExist: true })
  })

  register('mt::repository::trash', async(event, root: string, target: string) => {
    const current = await resolveSource(root, target)
    const win = BrowserWindow.fromWebContents(event.sender)
    return confirmAndTrashItem(win, current)
  })
}
