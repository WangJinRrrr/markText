import { computed, nextTick, ref, watch } from 'vue'
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
  rootDirectories: string[]
}

const createBufferedProjectState = (state: unknown): BufferedProjectState => {
  const s = (state || {}) as {
    rootDirectory?: string
    rootDirectories?: string[]
    projectTree?: { pathname?: string }
  }
  return {
    rootDirectory: normalizeProjectRoot(s.rootDirectory || s.projectTree?.pathname),
    rootDirectories: (s.rootDirectories ?? [s.rootDirectory || s.projectTree?.pathname || ''])
      .map(normalizeProjectRoot)
      .filter(Boolean)
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
  const projectTrees = ref<ProjectTree[]>([])
  const projectTree = computed<ProjectTree | null>({
    get: () => projectTrees.value[projectTrees.value.length - 1] ?? null,
    set: (tree) => {
      projectTrees.value = tree ? [tree] : []
    }
  })
  const treeVersion = ref(0)
  const pendingTreeEvents = ref<PendingEvent[]>([])

  const preferencesStore = usePreferencesStore()

  watch(
    [() => preferencesStore.fileSortBy, () => preferencesStore.fileSortOrder],
    ([sortBy, sortOrder]) => {
      for (const tree of projectTrees.value) resortTree(tree, String(sortBy), String(sortOrder))
    }
  )

  function OPEN_PROJECT(
    pathname: string,
    { scheduleBufferUpdate = true }: OpenProjectOptions = {}
  ): void {
    const layoutStore = useLayoutStore()
    const tree = createProjectRoot(pathname)
    if (!tree) return

    if (
      projectTrees.value.some(
        (root) => normalizeProjectRoot(root.pathname) === normalizeProjectRoot(tree.pathname)
      )
    )
      return
    projectTrees.value.push(tree)
    activeItem.value = {}

    const layout = {
      rightColumn: 'files',
      showSideBar: true,
      showTabBar: true
    }
    layoutStore.SET_LAYOUT(layout, { scheduleBufferUpdate })
    layoutStore.DISPATCH_LAYOUT_MENU_ITEMS()

    // Process pending events that arrived before projectTree was initialized.
    const pending = pendingTreeEvents.value
    pendingTreeEvents.value = []
    for (const event of pending) {
      const tracked = projectTrees.value.some((root) => {
        const relative = window.path.relative(root.pathname, event.change.pathname)
        return (
          relative !== '..' &&
          !relative.startsWith('../') &&
          !relative.startsWith('..\\') &&
          !window.path.isAbsolute(relative)
        )
      })
      if (tracked) _processTreeEvent(event.type, event.change)
      else pendingTreeEvents.value.push(event)
    }

    if (scheduleBufferUpdate) {
      debouncedSendBufferedState()
    }
  }

  function CREATE_BUFFERED_STATE(): BufferedProjectState {
    return createBufferedProjectState({
      projectTree: projectTree.value,
      rootDirectories: projectTrees.value.map((tree) => tree.pathname)
    })
  }

  function RESTORE_BUFFERED_STATE(state: unknown): void {
    const { rootDirectories } = createBufferedProjectState(state)
    if (rootDirectories.length) {
      for (const root of rootDirectories) OPEN_PROJECT(root, { scheduleBufferUpdate: false })
    } else {
      CLOSE_PROJECT({ scheduleBufferUpdate: false })
    }
  }

  function CLOSE_PROJECT({ scheduleBufferUpdate = true }: OpenProjectOptions = {}): void {
    projectTrees.value = []
    pendingTreeEvents.value = []
    activeItem.value = {}
    if (scheduleBufferUpdate) debouncedSendBufferedState()
  }

  function LISTEN_FOR_LOAD_PROJECT(): void {
    window.electron.ipcRenderer.on('mt::open-directory', (_e, pathname) => {
      OPEN_PROJECT(String(pathname))
    })
  }

  function LISTEN_FOR_CLOSE_PROJECT(): void {
    window.electron.ipcRenderer.on('mt::close-directory', () => {
      CLOSE_PROJECT()
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
    const trees = projectTrees.value.filter((tree) => {
      const relative = window.path.relative(tree.pathname, change.pathname)
      return (
        relative !== '..' &&
        !relative.startsWith('../') &&
        !relative.startsWith('..\\') &&
        !window.path.isAbsolute(relative)
      )
    })
    if (!trees.length) {
      pendingTreeEvents.value.push({ type, change })
      return
    }
    for (const tree of trees) {
      switch (type) {
        case 'add':
          addFile(
            tree,
            change as Parameters<typeof addFile>[1],
            String(preferencesStore.fileSortBy),
            String(preferencesStore.fileSortOrder)
          )
          break
        case 'unlink':
          unlinkFile(tree, change)
          editorStore.SET_SAVE_STATUS_WHEN_REMOVE(change)
          break
        case 'addDir':
          addDirectory(tree, change)
          break
        case 'unlinkDir':
          unlinkDirectory(tree, change)
          break
        case 'change':
          if (change?.mtimeMs !== undefined) {
            updateFileMtime(
              tree,
              change as Parameters<typeof updateFileMtime>[1],
              String(preferencesStore.fileSortBy),
              String(preferencesStore.fileSortOrder)
            )
          }
          break
        default:
          if (window.electron?.process?.env?.NODE_ENV === 'development') {
            console.log(`Unknown directory watch type: "${type}"`)
          }
          break
      }
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
    return projectTrees.value.some((tree) => expandAncestors(tree, pathname) !== null)
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
    projectTrees,
    treeVersion,
    pendingTreeEvents,
    OPEN_PROJECT,
    CLOSE_PROJECT,
    CREATE_BUFFERED_STATE,
    RESTORE_BUFFERED_STATE,
    LISTEN_FOR_LOAD_PROJECT,
    LISTEN_FOR_CLOSE_PROJECT,
    LISTEN_FOR_UPDATE_PROJECT,
    CHANGE_ACTIVE_ITEM,
    REVEAL_PATH,
    REVEAL_FILE_IN_SIDE_BAR,
    SET_FOLDER_COLLAPSED,
    ASK_FOR_OPEN_PROJECT,
    OPEN_SETTING_WINDOW
  }
})
