import { nextTick, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  addFile,
  unlinkFile,
  addDirectory,
  unlinkDirectory,
  resortTree,
  updateFileMtime,
  expandAncestors
} from './treeCtrl'
import { usePreferencesStore } from './preferences'
import bus from '../bus'
import { useLayoutStore } from './layout'
import { useEditorStore } from './editor'
import { debouncedSendBufferedState } from './bufferedState'
import type { TreeNode, TreeFolderNode } from '../components/sideBar/types'
import type { FileChangeDetail } from '@shared/types/files'

type ProjectTree = TreeNode
type TreeChange = FileChangeDetail

const normalizeProjectRoot = (pathname: string | null | undefined): string => {
  return pathname ? window.path.normalize(pathname) : ''
}

const createProjectRoot = (pathname: string): ProjectTree | null => {
  const normalizedPathname = normalizeProjectRoot(pathname)
  if (!normalizedPathname) return null

  let name = window.path.basename(normalizedPathname)
  if (!name) {
    // Root directory such as "/" or "C:\"
    name = normalizedPathname
  }

  return {
    pathname: normalizedPathname,
    name,
    isDirectory: true,
    isFile: false,
    isMarkdown: false,
    folders: [],
    files: []
  }
}

interface BufferedProjectState {
  rootDirectory: string
}

const createBufferedProjectState = (state: unknown): BufferedProjectState => {
  const s = (state || {}) as { rootDirectory?: string; projectTree?: { pathname?: string } }
  return {
    rootDirectory: normalizeProjectRoot(s.rootDirectory || s.projectTree?.pathname)
  }
}

interface OpenProjectOptions {
  scheduleBufferUpdate?: boolean
}

interface PendingEvent {
  type: string
  change: TreeChange
}

export const useProjectStore = defineStore('project', () => {
  // Heterogeneous UI state: assigned file nodes, folder nodes, and the empty
  // "no selection" object/null across sidebar components; a single non-`any`
  // union breaks both the assignments and the field reads, so it stays a hatch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeItem = ref<any>({})
  const projectTree = ref<ProjectTree | null>(null)
  const treeVersion = ref(0)
  const pendingTreeEvents = ref<PendingEvent[]>([])

  const preferencesStore = usePreferencesStore()

  watch(
    [() => preferencesStore.fileSortBy, () => preferencesStore.fileSortOrder],
    ([sortBy, sortOrder]) => {
      if (projectTree.value) {
        resortTree(projectTree.value, String(sortBy), String(sortOrder))
      }
    }
  )

  function OPEN_PROJECT(
    pathname: string,
    { scheduleBufferUpdate = true }: OpenProjectOptions = {}
  ): void {
    const layoutStore = useLayoutStore()
    const tree = createProjectRoot(pathname)
    if (!tree) return

    projectTree.value = tree
    // The old tree's selection does not survive a new root.
    activeItem.value = {}

    const layout = {
      rightColumn: 'files',
      showSideBar: true,
      showTabBar: true
    }
    layoutStore.SET_LAYOUT(layout, { scheduleBufferUpdate })
    layoutStore.DISPATCH_LAYOUT_MENU_ITEMS()

    // Process pending events that arrived before projectTree was initialized.
    for (const event of pendingTreeEvents.value) {
      _processTreeEvent(event.type, event.change)
    }
    pendingTreeEvents.value = []

    if (scheduleBufferUpdate) {
      debouncedSendBufferedState()
    }
  }

  function CREATE_BUFFERED_STATE(): BufferedProjectState {
    return createBufferedProjectState({
      projectTree: projectTree.value
    })
  }

  function RESTORE_BUFFERED_STATE(state: unknown): void {
    const { rootDirectory } = createBufferedProjectState(state)
    if (rootDirectory) {
      if (projectTree.value?.pathname === rootDirectory) return
      OPEN_PROJECT(rootDirectory, { scheduleBufferUpdate: false })
    } else {
      projectTree.value = null
      pendingTreeEvents.value = []
      activeItem.value = {}
    }
  }

  function LISTEN_FOR_LOAD_PROJECT(): void {
    window.electron.ipcRenderer.on('mt::open-directory', (_e, pathname) => {
      OPEN_PROJECT(String(pathname))
    })
  }

  function LISTEN_FOR_UPDATE_PROJECT(): void {
    window.electron.ipcRenderer.on('mt::update-object-tree', (_e, payload) => {
      const { type, change } = (payload as { type: string; change: TreeChange }) ?? {}
      if (!projectTree.value) {
        pendingTreeEvents.value.push({ type, change })
        return
      }
      _processTreeEvent(type, change)
    })
  }

  function _processTreeEvent(type: string, change: TreeChange): void {
    const editorStore = useEditorStore()
    switch (type) {
      case 'add':
        addFile(projectTree.value!, change as Parameters<typeof addFile>[1], String(preferencesStore.fileSortBy), String(preferencesStore.fileSortOrder))
        break
      case 'unlink':
        unlinkFile(projectTree.value!, change)
        editorStore.SET_SAVE_STATUS_WHEN_REMOVE(change)
        break
      case 'addDir':
        addDirectory(projectTree.value!, change)
        break
      case 'unlinkDir':
        unlinkDirectory(projectTree.value!, change)
        break
      case 'change':
        if (change?.mtimeMs !== undefined) {
          updateFileMtime(projectTree.value!, change as Parameters<typeof updateFileMtime>[1], String(preferencesStore.fileSortBy), String(preferencesStore.fileSortOrder))
        }
        break
      default:
        if (window.electron?.process?.env?.NODE_ENV === 'development') {
          console.log(`Unknown directory watch type: "${type}"`)
        }
        break
    }

    // The mutations above are in place, so watchers need a counter to react to.
    treeVersion.value++
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CHANGE_ACTIVE_ITEM(item: any): void {
    activeItem.value = item
  }

  /** Expands the folders leading to `pathname`; false when it is not in the tree. */
  function REVEAL_PATH(pathname: string | null | undefined): boolean {
    if (!pathname || !projectTree.value) return false
    return expandAncestors(projectTree.value, pathname) !== null
  }

  function REVEAL_FILE_IN_SIDE_BAR(pathname?: string | null): void {
    const editorStore = useEditorStore()
    const target = pathname ?? editorStore.currentFile?.pathname
    if (!target) return

    const layoutStore = useLayoutStore()
    layoutStore.SET_LAYOUT({ showSideBar: true, rightColumn: 'files' })
    // The tree mounts on the next flush, so the row cannot be found before it.
    nextTick(() => bus.emit('SIDEBAR::reveal-path', target))
  }

  function SET_FOLDER_COLLAPSED(folder: TreeFolderNode, isCollapsed: boolean): void {
    folder.isCollapsed = isCollapsed
  }

  function ASK_FOR_OPEN_PROJECT(): void {
    window.electron.ipcRenderer.send('mt::ask-for-open-project-in-sidebar')
  }

  // The sidebar only navigates and reveals files. Repository management owns
  // creation, renaming, copy/paste, deletion, path copying, and file reveal.
  function OPEN_SETTING_WINDOW(): void {
    window.electron.ipcRenderer.send('mt::open-setting-window')
  }

  return {
    activeItem,
    projectTree,
    treeVersion,
    pendingTreeEvents,
    OPEN_PROJECT,
    CREATE_BUFFERED_STATE,
    RESTORE_BUFFERED_STATE,
    LISTEN_FOR_LOAD_PROJECT,
    LISTEN_FOR_UPDATE_PROJECT,
    CHANGE_ACTIVE_ITEM,
    REVEAL_PATH,
    REVEAL_FILE_IN_SIDE_BAR,
    SET_FOLDER_COLLAPSED,
    ASK_FOR_OPEN_PROJECT,
    OPEN_SETTING_WINDOW
  }
})
