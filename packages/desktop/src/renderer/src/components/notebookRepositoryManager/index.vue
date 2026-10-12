<template>
  <div
    v-if="visible"
    class="repository-manager-backdrop"
    role="presentation"
    @mousedown.self="close"
  >
    <section
      ref="dialog"
      class="repository-manager"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repository-manager-title"
      @keydown="handleKeydown"
    >
      <header class="manager-header">
        <div class="manager-heading">
          <h1 id="repository-manager-title">
            Notebook repository
          </h1>
          <span
            v-if="projectTree"
            class="manager-path"
            :title="projectTree.pathname"
          >{{ projectTree.pathname }}</span>
        </div>
        <div class="manager-actions">
          <button
            class="icon-button"
            type="button"
            title="Refresh repository"
            aria-label="Refresh repository"
            @click="refresh"
          >
            <Refresh />
          </button>
          <button
            class="icon-button"
            type="button"
            title="Close repository manager"
            aria-label="Close repository manager"
            @click="close"
          >
            <Close />
          </button>
        </div>
      </header>

      <div class="manager-toolbar">
        <label class="search-field">
          <Search />
          <input
            ref="searchInput"
            v-model="query"
            type="search"
            placeholder="Filter files and folders"
            aria-label="Filter files and folders"
          >
          <kbd>⌘K</kbd>
        </label>
        <button
          class="text-button"
          type="button"
          :disabled="!projectTree"
          @click="chooseCreate('file')"
        >
          <DocumentAdd />
          <span>New note</span>
        </button>
        <button
          class="text-button"
          type="button"
          :disabled="!projectTree"
          @click="chooseCreate('directory')"
        >
          <FolderAdd />
          <span>New folder</span>
        </button>
      </div>

      <div
        ref="treeElement"
        class="manager-tree"
        tabindex="0"
        role="tree"
        aria-label="Notebook repository files"
      >
        <div
          v-if="loading"
          class="manager-state"
          role="status"
        >
          Loading repository…
        </div>
        <div
          v-else-if="error"
          class="manager-state manager-error"
          role="alert"
        >
          <span>{{ error }}</span>
          <button
            class="text-button"
            type="button"
            @click="refresh"
          >
            Try again
          </button>
        </div>
        <div
          v-else-if="!projectTree"
          class="manager-state"
        >
          <FolderOpened />
          <span>Open a folder in the sidebar first.</span>
          <button
            class="text-button primary"
            type="button"
            @click="openFolder"
          >
            Open folder
          </button>
        </div>
        <div
          v-else-if="filteredNodes.length === 0"
          class="manager-state"
        >
          No matching files.
        </div>
        <template v-else>
          <button
            v-for="node of filteredNodes"
            :key="node.pathname"
            class="tree-row"
            tabindex="-1"
            :class="{ selected: node.pathname === selectedPath, folder: node.isDirectory }"
            type="button"
            role="treeitem"
            :aria-selected="node.pathname === selectedPath"
            :aria-level="node.depth + 1"
            :aria-expanded="node.isDirectory ? !node.collapsed : undefined"
            :style="{ paddingLeft: `${12 + node.depth * 18}px` }"
            :data-repository-path="node.pathname"
            @click="select(node)"
            @dblclick="activate(node)"
            @keydown.enter.prevent.stop="activate(node)"
          >
            <span
              v-if="node.isDirectory"
              class="disclosure"
              :class="{ expanded: !node.collapsed }"
              aria-hidden="true"
              @click.stop="toggleFolder(node)"
            ><ArrowRight /></span>
            <span
              v-else
              class="disclosure-spacer"
              aria-hidden="true"
            />
            <Folder
              v-if="node.isDirectory"
              class="node-icon folder-icon"
            />
            <Document
              v-else
              class="node-icon"
            />
            <span class="node-name">{{ node.name }}</span>
            <span
              v-if="node.isFile && node.isMarkdown"
              class="node-kind"
            >MD</span>
          </button>
        </template>
      </div>

      <footer class="manager-footer">
        <span class="selection-status">{{ selectedLabel }}</span>
        <div class="footer-actions">
          <button
            class="icon-button"
            type="button"
            :disabled="!selectedNode"
            title="Rename selected item (F2)"
            aria-label="Rename selected item"
            @click="renameSelected"
          >
            <EditPen />
          </button>
          <button
            class="icon-button"
            type="button"
            :disabled="!selectedNode"
            title="Copy selected item"
            aria-label="Copy selected item"
            @click="copySelected"
          >
            <CopyDocument />
          </button>
          <button
            class="icon-button"
            type="button"
            :disabled="!selectedNode"
            title="Cut selected item"
            aria-label="Cut selected item"
            @click="cutSelected"
          >
            <Scissor />
          </button>
          <button
            class="icon-button"
            type="button"
            :disabled="!clipboard"
            title="Paste selected item"
            aria-label="Paste selected item"
            @click="pasteSelected"
          >
            <DocumentAdd />
          </button>
          <button
            class="icon-button"
            type="button"
            :disabled="!selectedNode"
            title="Copy selected path"
            aria-label="Copy selected path"
            @click="copyPathSelected"
          >
            <CopyDocument />
          </button>
          <button
            class="icon-button"
            type="button"
            :disabled="!selectedNode"
            title="Show selected item in file manager"
            aria-label="Show selected item in file manager"
            @click="revealSelected"
          >
            <FolderOpened />
          </button>
          <button
            class="icon-button"
            type="button"
            :disabled="!selectedNode || isSamePath(selectedNode.pathname, projectTree?.pathname ?? '')"
            title="Move selected item to trash"
            aria-label="Move selected item to trash"
            @click="removeSelected"
          >
            <Delete />
          </button>
          <button
            class="text-button primary"
            type="button"
            :disabled="!selectedNode"
            @click="activateSelected"
          >
            Open
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowRight,
  Close,
  CopyDocument,
  Scissor,
  Delete,
  Document,
  DocumentAdd,
  EditPen,
  Folder,
  FolderAdd,
  FolderOpened,
  Refresh,
  Search
} from '@element-plus/icons-vue'
import { useProjectStore } from '@/store/project'
import { useEditorStore } from '@/store/editor'
import bus from '@/bus'
import { isSamePath } from '@/util'
import type { RepositoryEntry } from '@shared/types/ipc'

interface ManagerNode {
  pathname: string
  name: string
  depth: number
  isDirectory: boolean
  isFile: boolean
  isMarkdown: boolean
  collapsed: boolean
}

interface ManagerTree {
  root: RepositoryEntry
  expanded: Set<string>
}

const projectStore = useProjectStore()
const editorStore = useEditorStore()
const projectTree = computed(() => projectStore.projectTree)
const repositoryTree = ref<ManagerTree | null>(null)
const visible = ref(false)
const loading = ref(false)
const error = ref('')
const query = ref('')
const selectedPath = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const treeElement = ref<HTMLDivElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const previousFocus = ref<HTMLElement | null>(null)
const nodes = ref<ManagerNode[]>([])
const clipboard = ref<{ pathname: string; type: 'copy' | 'cut' } | null>(null)
let refreshRequest = 0

const isInsideRoot = (pathname: string): boolean => {
  const root = projectTree.value?.pathname
  if (!root || !pathname) return false
  const relative = window.path.relative(root, pathname)
  return relative === '' || (!relative.startsWith('..') && !window.path.isAbsolute(relative))
}

const normalizePath = (pathname: string): string => window.path.normalize(pathname)

const makeNode = (pathname: string, name: string, depth: number, isDirectory: boolean): ManagerNode => ({
  pathname: normalizePath(pathname),
  name,
  depth,
  isDirectory,
  isFile: !isDirectory,
  isMarkdown: !isDirectory && window.fileUtils.hasMarkdownExtension(name),
  collapsed: isDirectory
})

const flattenRepositoryTree = (tree: ManagerTree): ManagerNode[] => {
  const result: ManagerNode[] = [{
    ...makeNode(tree.root.pathname, tree.root.name, 0, true),
    collapsed: false
  }]
  const visit = (folder: RepositoryEntry, depth: number): void => {
    for (const child of folder.children ?? []) {
      const collapsed = child.isDirectory && !tree.expanded.has(child.pathname)
      result.push({
        ...makeNode(child.pathname, child.name, depth, child.isDirectory),
        isMarkdown: child.isMarkdown,
        collapsed
      })
      if (child.isDirectory && !collapsed) visit(child, depth + 1)
    }
  }
  visit(tree.root, 1)
  return result
}

const filteredNodes = computed(() => {
  const value = query.value.trim().toLowerCase()
  if (!value) return nodes.value
  return nodes.value.filter((node) => node.name.toLowerCase().includes(value) || node.pathname.toLowerCase().includes(value))
})

const selectedNode = computed(() => nodes.value.find((node) => isSamePath(node.pathname, selectedPath.value)))
const selectedLabel = computed(() => selectedNode.value?.pathname ?? 'Select a file or folder')

const focusNode = (pathname: string): void => {
  nextTick(() => {
    document.querySelector<HTMLElement>(`[data-repository-path="${CSS.escape(pathname)}"]`)?.focus()
  })
}

const rebuild = (): void => {
  nodes.value = repositoryTree.value ? flattenRepositoryTree(repositoryTree.value) : []
  if (selectedPath.value && !nodes.value.some((node) => isSamePath(node.pathname, selectedPath.value))) {
    selectedPath.value = ''
  }
}

const refresh = async(): Promise<void> => {
  const request = ++refreshRequest
  error.value = ''
  const root = projectTree.value?.pathname
  if (!root) {
    repositoryTree.value = null
    rebuild()
    return
  }
  loading.value = true
  try {
    const snapshot = await window.electron.ipcRenderer.invoke('mt::repository::list', root)
    if (request !== refreshRequest || !projectTree.value || !isSamePath(projectTree.value.pathname, root)) return
    const previousRoot = repositoryTree.value?.root.pathname
    const expanded = previousRoot && isSamePath(previousRoot, root)
      ? repositoryTree.value?.expanded ?? new Set<string>([root])
      : new Set<string>([root])
    repositoryTree.value = { root: snapshot, expanded }
    rebuild()
  } catch (err) {
    if (request === refreshRequest) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  } finally {
    if (request === refreshRequest) loading.value = false
  }
}

const select = (node: ManagerNode): void => {
  selectedPath.value = node.pathname
}

const toggleFolder = (node: ManagerNode): void => {
  if (!node.isDirectory || !repositoryTree.value) return
  if (repositoryTree.value.expanded.has(node.pathname)) {
    repositoryTree.value.expanded.delete(node.pathname)
  } else {
    repositoryTree.value.expanded.add(node.pathname)
  }
  rebuild()
}

const activate = (node: ManagerNode): void => {
  selectedPath.value = node.pathname
  if (node.isDirectory) {
    if (repositoryTree.value?.expanded.has(node.pathname)) {
      repositoryTree.value.expanded.delete(node.pathname)
    } else {
      repositoryTree.value?.expanded.add(node.pathname)
    }
    rebuild()
    return
  }
  if (node.isMarkdown) {
    window.electron.ipcRenderer.send('mt::open-file', node.pathname)
    close()
  } else {
    const root = projectTree.value?.pathname
    if (!root) return
    window.electron.ipcRenderer.invoke('mt::repository::open', root, node.pathname).catch((err: unknown) => {
      error.value = err instanceof Error ? err.message : String(err)
    })
  }
}

const activateSelected = (): void => {
  if (selectedNode.value) activate(selectedNode.value)
}

const openFolder = (): void => {
  projectStore.ASK_FOR_OPEN_PROJECT()
  close()
}

const chooseCreate = (type: 'file' | 'directory'): void => {
  const target = selectedNode.value?.isDirectory ? selectedNode.value.pathname : window.path.dirname(selectedPath.value)
  const root = projectTree.value?.pathname
  if (!target || !root || !isInsideRoot(target)) return
  const name = window.prompt(type === 'file' ? 'New note name' : 'New folder name')?.trim()
  if (!name) return
  const pathname = window.path.join(target, name)
  if (!isInsideRoot(pathname)) return
  window.electron.ipcRenderer.invoke('mt::repository::create', root, target, name, type).then(refresh).catch((err: unknown) => {
    error.value = err instanceof Error ? err.message : String(err)
  })
}

const renameSelected = (): void => {
  const node = selectedNode.value
  const root = projectTree.value?.pathname
  if (!node || !root || isSamePath(node.pathname, root)) return
  const name = window.prompt('Rename item', node.name)?.trim()
  if (!name || name === node.name) return
  const destination = window.path.join(window.path.dirname(node.pathname), name)
  if (!isInsideRoot(destination)) return
  window.electron.ipcRenderer.invoke('mt::repository::rename', root, node.pathname, name).then(() => {
    const destination = window.path.join(window.path.dirname(node.pathname), name)
    editorStore.RENAME_IF_NEEDED({ src: node.pathname, dest: destination })
    refresh()
  }).catch((err: unknown) => {
    error.value = err instanceof Error ? err.message : String(err)
  })
}

const copySelected = (): void => {
  if (selectedNode.value) clipboard.value = { pathname: selectedNode.value.pathname, type: 'copy' }
}

const cutSelected = (): void => {
  if (selectedNode.value) clipboard.value = { pathname: selectedNode.value.pathname, type: 'cut' }
}

const pasteSelected = (): void => {
  const entry = clipboard.value
  const target = selectedNode.value?.isDirectory ? selectedNode.value.pathname : window.path.dirname(selectedPath.value)
  if (!entry || !target || !isInsideRoot(target)) return
  const destination = window.path.join(target, window.path.basename(entry.pathname))
  if (!isInsideRoot(destination)) return
  const root = projectTree.value?.pathname
  if (!root) return
  window.electron.ipcRenderer.invoke(
    'mt::repository::copy',
    root,
    entry.pathname,
    target,
    window.path.basename(entry.pathname),
    entry.type
  ).then(() => {
    clipboard.value = entry.type === 'copy' ? entry : null
    refresh()
  }).catch((err: unknown) => {
    error.value = err instanceof Error ? err.message : String(err)
  })
}

const copyPathSelected = (): void => {
  if (selectedNode.value) window.electron.clipboard.writeText(selectedNode.value.pathname)
}

const revealSelected = (): void => {
  if (selectedNode.value) window.electron.shell.showItemInFolder(selectedNode.value.pathname)
}

const removeSelected = async(): Promise<void> => {
  const node = selectedNode.value
  const root = projectTree.value?.pathname
  if (!node || !root || isSamePath(node.pathname, root) || !isInsideRoot(node.pathname)) return
  try {
    const trashed = await window.electron.ipcRenderer.invoke('mt::repository::trash', root, node.pathname)
    if (trashed) {
      selectedPath.value = ''
      refresh()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

const close = (): void => {
  visible.value = false
  query.value = ''
  nextTick(() => previousFocus.value?.focus())
}

const open = (): void => {
  previousFocus.value = document.activeElement as HTMLElement | null
  visible.value = true
  refresh()
  selectedPath.value = projectStore.activeItem?.pathname || projectStore.projectTree?.pathname || ''
  nextTick(() => searchInput.value?.focus())
}

const handleKeydown = (event: KeyboardEvent): void => {
  const target = event.target as HTMLElement
  if (target === searchInput.value) {
    if (event.key === 'Escape' && query.value) {
      event.preventDefault()
      query.value = ''
      return
    }
    if (event.key !== 'Enter' && !event.ctrlKey && !event.metaKey && event.key !== 'Escape') return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (target === searchInput.value && event.key === 'Enter') {
    event.preventDefault()
    const first = filteredNodes.value[0]
    if (first) activate(first)
    return
  }
  if (event.key === 'F2') {
    event.preventDefault()
    renameSelected()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
    event.preventDefault()
    copySelected()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
    event.preventDefault()
    pasteSelected()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') {
    event.preventDefault()
    cutSelected()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
    event.preventDefault()
    chooseCreate('file')
    return
  }
  const index = filteredNodes.value.findIndex((node) => isSamePath(node.pathname, selectedPath.value))
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1
    const item = filteredNodes.value[Math.max(0, Math.min(filteredNodes.value.length - 1, next))]
    if (item) {
      selectedPath.value = item.pathname
      focusNode(item.pathname)
      document.querySelector<HTMLElement>(`[data-repository-path="${CSS.escape(item.pathname)}"]`)?.scrollIntoView({ block: 'nearest' })
    }
  }
  if (event.key === 'ArrowLeft' && selectedNode.value?.isDirectory) {
    event.preventDefault()
    if (repositoryTree.value?.expanded.has(selectedNode.value.pathname)) {
      repositoryTree.value.expanded.delete(selectedNode.value.pathname)
      rebuild()
      focusNode(selectedNode.value.pathname)
    }
  }
  if (event.key === 'ArrowRight' && selectedNode.value?.isDirectory) {
    event.preventDefault()
    if (!repositoryTree.value?.expanded.has(selectedNode.value.pathname)) {
      repositoryTree.value?.expanded.add(selectedNode.value.pathname)
      rebuild()
      focusNode(selectedNode.value.pathname)
    }
  }
  if (event.key === 'Enter' && selectedNode.value) {
    event.preventDefault()
    activateSelected()
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    void removeSelected()
  }
}

watch(projectTree, refresh, { deep: true })
watch(() => projectStore.treeVersion, refresh)

onMounted(() => {
  bus.on('show-notebook-repository-manager', open)
  window.electron.ipcRenderer.on('mt::show-notebook-repository-manager', open)
})

onBeforeUnmount(() => {
  bus.off('show-notebook-repository-manager', open)
  window.electron.ipcRenderer.removeAllListeners('mt::show-notebook-repository-manager')
})
</script>

<style scoped>
.repository-manager-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  background: color-mix(in srgb, var(--maskColor) 72%, transparent);
}

.repository-manager {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  color: var(--editorColor);
  background: var(--editorBgColor);
}

.manager-header,
.manager-toolbar,
.manager-footer {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 28px;
  border-bottom: 1px solid var(--floatBorderColor);
}

.manager-header {
  justify-content: space-between;
  min-height: 64px;
}

.manager-heading {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
}

h1 {
  margin: 0;
  color: var(--editorColor80);
  font-size: 18px;
  font-weight: 600;
}

.manager-path,
.selection-status {
  max-width: 70vw;
  overflow: hidden;
  color: var(--editorColor50);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manager-actions,
.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.manager-toolbar {
  gap: 10px;
  background: var(--sideBarBgColor);
}

.search-field {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 140px;
  height: 32px;
  gap: 8px;
  padding: 0 10px;
  color: var(--editorColor50);
  background: var(--inputBgColor);
  border: 1px solid var(--floatBorderColor);
  border-radius: var(--controlRadius, 4px);
}

.search-field:focus-within {
  border-color: var(--focusColor);
  box-shadow: 0 0 0 2px var(--themeColor20);
}

.search-field input {
  flex: 1;
  min-width: 0;
  color: var(--editorColor80);
  background: transparent;
  border: 0;
  outline: 0;
}

.search-field kbd {
  color: var(--editorColor50);
  font-size: 11px;
}

.icon-button,
.text-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  gap: 6px;
  color: var(--editorColor60);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--controlRadius, 4px);
  cursor: pointer;
}

.icon-button {
  width: 32px;
}

.text-button {
  padding: 0 10px;
  white-space: nowrap;
}

.icon-button:hover,
.text-button:hover:not(:disabled),
.tree-row:hover {
  background: var(--sideBarItemHoverBgColor);
}

.icon-button:focus-visible,
.text-button:focus-visible,
.tree-row:focus-visible {
  border-color: var(--focusColor);
  outline: 2px solid var(--themeColor20);
  outline-offset: -2px;
}

.text-button.primary {
  color: var(--buttonPrimaryFontColor);
  background: var(--buttonPrimaryBgColor);
}

.text-button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.manager-tree {
  flex: 1;
  min-height: 0;
  padding: 16px 0;
  overflow: auto;
  outline: 0;
}

.tree-row {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  gap: 8px;
  color: var(--editorColor60);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: default;
}

.tree-row.selected {
  color: var(--sideBarTitleColor);
  background: var(--themeColor20);
}

.tree-row.folder {
  font-weight: 500;
}

.disclosure,
.disclosure-spacer {
  display: inline-flex;
  flex: 0 0 14px;
  align-items: center;
  justify-content: center;
  color: var(--editorColor50);
}

.disclosure {
  transition: transform 120ms ease-out;
}

.disclosure.expanded {
  transform: rotate(90deg);
}

.node-icon {
  flex: 0 0 16px;
  color: var(--iconColor);
}

.folder-icon {
  color: var(--themeColor);
}

.node-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-kind {
  margin-left: auto;
  padding-right: 18px;
  color: var(--editorColor40);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.manager-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--editorColor50);
}

.manager-error {
  color: var(--deleteColor);
}

.manager-footer {
  justify-content: space-between;
  min-height: 48px;
  border-top: 1px solid var(--floatBorderColor);
  border-bottom: 0;
}

@media (max-width: 720px) {
  .manager-header,
  .manager-toolbar,
  .manager-footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .manager-toolbar {
    flex-wrap: wrap;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .search-field {
    flex-basis: 100%;
  }

  .manager-footer .selection-status {
    max-width: 38vw;
  }
}
</style>
