import { popupContextMenu } from '@/contextMenu/popupMenu'
import { useProjectStore } from '@/store/project'
import { useEditorStore } from '@/store/editor'
import notice from '@/services/notification'
import type { TreeNode, TreeFileNode } from './types'

type Item = TreeNode | TreeFileNode
let clipboard: { root: string; pathname: string; type: 'copy' | 'cut' } | null = null

const run = (operation: () => Promise<unknown>): void => {
  operation().catch((error: unknown) => {
    void notice.notify({ title: '文件操作失败', message: error instanceof Error ? error.message : String(error), type: 'error' })
  })
}

export const createTreeItem = (root: string, parent: string, type: 'file' | 'directory'): void => {
  const name = window.prompt(type === 'file' ? '新笔记名称' : '新文件夹名称', type === 'file' ? '新笔记.md' : '')?.trim()
  if (!name) return
  run(async() => {
    await window.electron.ipcRenderer.invoke('mt::repository::create', root, parent, name, type)
    if (type === 'file' && window.fileUtils.hasMarkdownExtension(name)) window.electron.ipcRenderer.send('mt::open-file', window.path.join(parent, name))
  })
}

export const showTreeMenu = (event: MouseEvent, root: TreeNode, item: Item = root): void => {
  const project = useProjectStore()
  const editor = useEditorStore()
  project.CHANGE_ACTIVE_ITEM(item)
  const parent = item.isDirectory ? item.pathname : window.path.dirname(item.pathname)
  const mutable = !project.projectTrees.some((tree) => window.fileUtils.isSamePathSync(tree.pathname, item.pathname))
  popupContextMenu([
    { label: '打开新文件夹', click: () => project.ASK_FOR_OPEN_PROJECT() },
    { type: 'separator' },
    { label: '新建笔记', click: () => createTreeItem(root.pathname, parent, 'file') },
    { label: '新建文件夹', click: () => createTreeItem(root.pathname, parent, 'directory') },
    { type: 'separator' },
    { label: '重命名', enabled: mutable, click: () => {
      const name = window.prompt('重命名', item.name)?.trim()
      if (!name || name === item.name) return
      run(async() => {
        editor.flushActiveEditor()
        await window.electron.ipcRenderer.invoke('mt::repository::rename', root.pathname, item.pathname, name)
        editor.RENAME_IF_NEEDED({ src: item.pathname, dest: window.path.join(window.path.dirname(item.pathname), name) })
      })
    } },
    { label: '复制', enabled: mutable, click: () => { clipboard = { root: root.pathname, pathname: item.pathname, type: 'copy' } } },
    { label: '剪切', enabled: mutable, click: () => { clipboard = { root: root.pathname, pathname: item.pathname, type: 'cut' } } },
    { label: '粘贴', enabled: !!clipboard, click: () => {
      const entry = clipboard
      if (!entry) return
      run(async() => {
        editor.flushActiveEditor()
        const name = window.path.basename(entry.pathname)
        await window.electron.ipcRenderer.invoke('mt::repository::copy', root.pathname, entry.pathname, parent, name, entry.type, entry.root)
        if (entry.type === 'cut') {
          editor.RENAME_IF_NEEDED({ src: entry.pathname, dest: window.path.join(parent, name) })
          clipboard = null
        }
      })
    } },
    { type: 'separator' },
    { label: '复制路径', click: () => window.electron.clipboard.writeText(item.pathname) },
    { label: '在资源管理器中显示', click: () => window.electron.shell.showItemInFolder(item.pathname) },
    { label: '删除', enabled: mutable, click: () => run(() => window.electron.ipcRenderer.invoke('mt::repository::trash', root.pathname, item.pathname)) }
  ], { x: event.clientX, y: event.clientY })
}

export const showItemMenu = (event: MouseEvent, item: Item): void => {
  const root = useProjectStore().projectTrees.find((tree) => window.fileUtils.isSamePathSync(tree.pathname, item.pathname) || window.fileUtils.isChildOfDirectory(tree.pathname, item.pathname))
  if (root) showTreeMenu(event, root, item)
}

export const startTreeDrag = (event: DragEvent, item: Item): void => {
  event.dataTransfer?.setData('application/x-marktext-path', item.pathname)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

export const dropTreeItem = (event: DragEvent, item: Item): void => {
  const project = useProjectStore()
  const editor = useEditorStore()
  const root = project.projectTrees.find((tree) => window.fileUtils.isSamePathSync(tree.pathname, item.pathname) || window.fileUtils.isChildOfDirectory(tree.pathname, item.pathname))
  if (!root) return
  const parent = item.isDirectory ? item.pathname : window.path.dirname(item.pathname)
  const internal = event.dataTransfer?.getData('application/x-marktext-path')
  const sources = internal ? [internal] : Array.from(event.dataTransfer?.files ?? []).map((file) => window.electron.webUtils.getPathForFile(file)).filter(Boolean)
  run(async() => {
    editor.flushActiveEditor()
    for (const source of sources) {
      if (project.projectTrees.some((tree) => window.fileUtils.isSamePathSync(tree.pathname, source))) throw new Error('不能移动已打开的根目录。')
      const destination = window.path.join(parent, window.path.basename(source))
      if (window.fileUtils.isSamePathSync(source, destination)) continue
      await window.electron.ipcRenderer.invoke('mt::repository::import', root.pathname, source, parent)
      editor.RENAME_IF_NEEDED({ src: source, dest: destination })
    }
  })
}
