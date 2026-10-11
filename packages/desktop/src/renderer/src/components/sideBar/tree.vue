<template>
  <div class="tree-view">
    <div class="title">
      <!-- Placeholder -->
    </div>

    <!-- Project tree view -->
    <div
      v-if="projectTree"
      class="project-tree"
    >
      <div
        class="title"
      >
        <el-icon
          class="icon-arrow"
          :class="{ fold: !showDirectories }"
          :size="12"
          @click.stop="toggleDirectories()"
        >
          <ArrowRight />
        </el-icon>
        <span
          class="default-cursor text-overflow"
          @click.stop="toggleDirectories()"
        >{{
          projectTree.name
        }}</span>
      </div>
      <div
        v-show="showDirectories"
        ref="treeWrapper"
        class="tree-wrapper"
        tabindex="0"
        @contextmenu.prevent="showFileMenu"
        @mousedown="handleTreeMouseDown"
        @keydown="handleTreeKeydown"
      >
        <folder
          v-for="folder of projectTree.folders"
          :key="folder.id"
          :folder="folder"
          :depth="depth"
        />
        <file
          v-for="file of projectTree.files"
          :key="file.id"
          :file="file"
          :depth="depth"
        />
        <div
          v-if="
            projectTree.files.length === 0 &&
              projectTree.folders.length === 0
          "
          class="empty-project"
        >
          <span>{{ t('sideBar.tree.emptyProject') }}</span>
          <div class="centered-group">
            <button
              class="button-primary"
              @click.stop="createFile"
            >
              {{ t('sideBar.tree.createFile') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="open-project"
    >
      <div class="centered-group">
        <el-button
          text
          bg
          type="primary"
          @click="openFolder"
        >
          {{ t('sideBar.tree.openFolder') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useProjectStore } from '@/store/project'
import { useEditorStore } from '@/store/editor'
import { useLayoutStore } from '@/store/layout'
import { usePreferencesStore } from '@/store/preferences'
import Folder from './treeFolder.vue'
import File from './treeFile.vue'
import bus from '../../bus'
import { useI18n } from 'vue-i18n'
import { ArrowRight } from '@element-plus/icons-vue'
import { computeRevealScrollTop } from '@/util/revealTreeRow'
import { TREE_ROW_REGISTRY_KEY, toRowKey, type TreeRowRegistry } from './rowRegistry'
import type { TreeNode } from './types'

const { t } = useI18n()

defineProps<{
  // The project store seeds `projectTree` as `null` until a folder is
  // opened; the template renders the "open project" empty-state behind
  // `v-if="projectTree"`. Type the prop nullable to match runtime + the
  // template guard.
  projectTree: TreeNode | null
}>()

const depth = 0
// Persist the section collapse state (#2421). The tree is rendered under a
// v-if and is destroyed when the sidebar collapses to its icon strip, so local
// refs reset to expanded on re-open. Back them with localStorage (like the
// sidebar width) so the state survives a re-mount and app restart.
const SHOW_DIRECTORIES_KEY = 'side-bar-show-directories'
const showDirectories = ref(localStorage.getItem(SHOW_DIRECTORIES_KEY) !== 'false')
const treeWrapper = ref<HTMLDivElement | null>(null)

const rowRegistry: TreeRowRegistry = new Map()
provide(TREE_ROW_REGISTRY_KEY, rowRegistry)

const projectStore = useProjectStore()
const editorStore = useEditorStore()
const layoutStore = useLayoutStore()
const preferencesStore = usePreferencesStore()

// Methods
const openFolder = (): void => {
  projectStore.ASK_FOR_OPEN_PROJECT()
}

const createFile = (): void => {
  bus.emit('show-notebook-repository-manager')
}

const showFileMenu = (event: MouseEvent): void => {
  window.electron.ipcRenderer.send('mt::popup-file-menu', {
    x: event.clientX,
    y: event.clientY
  })
}

const setShowDirectories = (value: boolean): void => {
  showDirectories.value = value
  localStorage.setItem(SHOW_DIRECTORIES_KEY, String(value))
}

const toggleDirectories = (): void => {
  setShowDirectories(!showDirectories.value)
}

const findRow = (pathname: string): HTMLElement | undefined => {
  const key = toRowKey(pathname)
  const row = rowRegistry.get(key)
  if (row) return row
  // Windows paths can differ in case.
  for (const [registered, element] of rowRegistry) {
    if (window.fileUtils.isSamePathSync(registered, key)) return element
  }
  return undefined
}

const scrollRowIntoView = (container: HTMLElement, row: HTMLElement): void => {
  const containerRect = container.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const scrollTop = computeRevealScrollTop({
    rowTopInContent: rowRect.top - containerRect.top + container.scrollTop,
    rowHeight: rowRect.height,
    viewportHeight: container.clientHeight,
    scrollHeight: container.scrollHeight,
    scrollTop: container.scrollTop
  })
  if (scrollTop !== null) container.scrollTop = scrollTop
}

// Reveals only: the caret, the tree selection and `activeItem` stay untouched.
// `force` (the "Show in Side Bar" command) ignores the preference.
const revealPath = async (
  pathname: string | null | undefined,
  { force = false }: { force?: boolean } = {}
): Promise<void> => {
  if (!pathname) return
  if (!force && !preferencesStore.autoRevealInSidebar) return
  if (!showDirectories.value) {
    if (!force) return
    setShowDirectories(true)
  }
  // Off screen (icon strip, View menu) there is nothing to reveal.
  if (!layoutStore.showSideBar || layoutStore.rightColumn !== 'files') return
  if (!projectStore.REVEAL_PATH(pathname)) return

  await nextTick()
  const container = treeWrapper.value
  // Hidden views report a zero-size viewport.
  if (!container || container.offsetParent === null) return

  const row = findRow(pathname)
  if (row) scrollRowIntoView(container, row)
}

const handleRevealPath = (pathname: unknown): void => {
  revealPath(typeof pathname === 'string' ? pathname : null, { force: true })
}

const focusTree = (): void => {
  treeWrapper.value?.focus()
}

// preventDefault stops the browser's default mousedown focus move (to <body>)
// from undoing the focus() call.
const handleTreeMouseDown = (event: MouseEvent): void => {
  const target = event.target as { tagName?: unknown; isContentEditable?: unknown } | null
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable === true) return
  if (event.button === 0) {
    projectStore.CHANGE_ACTIVE_ITEM({})
    event.preventDefault()
  }
  focusTree()
}

const handleTreeKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') projectStore.CHANGE_ACTIVE_ITEM({})
}

// The row can arrive after the tab does: opening a project delivers its
// contents incrementally, so every tree change is a new chance to reveal.
watch(
  () => [projectStore.treeVersion, editorStore.currentFile?.pathname] as const,
  ([, pathname]) => {
    revealPath(pathname)
  },
  { flush: 'post' }
)

// The tree stays mounted while the side bar is hidden, so a switch made then
// never scrolled; reveal again as soon as the file list is visible.
watch(
  () => layoutStore.showSideBar && layoutStore.rightColumn === 'files',
  (visible) => {
    if (visible) revealPath(editorStore.currentFile?.pathname)
  },
  { flush: 'post' }
)

onMounted(() => {
  bus.on('SIDEBAR::focus-tree', focusTree)
  bus.on('SIDEBAR::reveal-path', handleRevealPath)
  revealPath(editorStore.currentFile?.pathname)
})

onUnmounted(() => {
  bus.off('SIDEBAR::focus-tree', focusTree)
  bus.off('SIDEBAR::reveal-path', handleRevealPath)
})
</script>

<style scoped>
.tree-view {
  font-size: 14px;
  color: var(--sideBarColor);
  display: flex;
  flex-direction: column;
  height: 100%;
}
.tree-view > .title {
  height: 35px;
  line-height: 35px;
  padding: 0 15px;
  display: flex;
  flex-shrink: 0;
  flex-direction: row-reverse;
}

.icon-arrow {
  margin-right: 5px;
  transition: transform 0.25s ease-out;
  transform: rotate(90deg);
  color: var(--sideBarTextColor);
  cursor: pointer;
}

.icon-arrow.fold {
  transform: rotate(0);
}

.project-tree > .title {
  height: 30px;
  line-height: 30px;
  font-size: 14px;
}

.project-tree {
  display: flex;
  flex-direction: column;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.project-tree > .title {
  padding-right: 15px;
  display: flex;
  align-items: center;
}

.project-tree > .title > span {
  flex: 1;
  user-select: none;
}

.project-tree > .tree-wrapper {
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.project-tree > .tree-wrapper::-webkit-scrollbar:vertical {
  width: 8px;
}
.open-project {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding-bottom: 100px;
}

.open-project .centered-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.open-project .el-button {
  margin-top: 20px;
}
.open-project .el-button.is-text.is-has-bg,
.empty-project .el-button.is-text.is-has-bg {
  background-color: var(--buttonPrimaryBgColor);
  color: var(--buttonPrimaryFontColor);
  border-color: transparent;
}
.open-project .el-button.is-text.is-has-bg:hover,
.open-project .el-button.is-text.is-has-bg:focus,
.empty-project .el-button.is-text.is-has-bg:hover,
.empty-project .el-button.is-text.is-has-bg:focus {
  background-color: var(--buttonPrimaryBgColorHover);
  color: var(--buttonPrimaryFontColorHover);
}
.tree-wrapper {
  position: relative;
}
.tree-wrapper:focus-visible {
  outline: none;
}
.tree-wrapper:focus-within :deep(.side-bar-file.active),
.tree-wrapper:focus-within :deep(.folder-name.active) {
  outline: 1px solid var(--focusColor);
  outline-offset: -1px;
}
.tree-wrapper:not(:focus-within) :deep(.side-bar-file.active),
.tree-wrapper:not(:focus-within) :deep(.folder-name.active) {
  background: color-mix(in srgb, var(--themeColor20) 55%, transparent);
}
.empty-project {
  font-size: 14px;
  display: flex;
  flex-direction: column;
  padding-top: 40px;
  align-items: center;
  color: var(--sideBarTextColor);
  & button {
    margin-top: 10px;
  }
}

.empty-project > a {
  color: var(--highlightThemeColor);
  text-align: center;
  margin-top: 15px;
  text-decoration: none;
}
</style>
