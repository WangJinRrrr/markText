<template>
  <div
    ref="fileEl"
    :title="file.pathname"
    class="side-bar-file"
    :style="{ 'padding-left': `${depth * 6 + 10}px`, opacity: file.isMarkdown ? 1 : 0.75 }"
    :class="[
      {
        current: isSamePath(currentFile?.pathname ?? '', file.pathname),
        active: isSamePath(activeItem?.pathname ?? '', file.pathname)
      }
    ]"
    @click="handleFileClick"
    @dblclick="handleFileDblClick"
  >
    <file-icon :name="file.name" />
    <span>{{ file.name }}</span>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/store/project'
import { useEditorStore } from '@/store/editor'
import FileIcon from './icon.vue'
import bus from '../../bus'
import { TREE_ROW_REGISTRY_KEY, toRowKey, type TreeRowRegistry } from './rowRegistry'
import { isSamePath } from '@/util'
import type { TreeFileNode } from './types'

const props = defineProps<{
  file: TreeFileNode
  depth: number
}>()

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const fileEl = ref<HTMLDivElement | null>(null)

const rowRegistry = inject<TreeRowRegistry | null>(TREE_ROW_REGISTRY_KEY, null)

watch(
  () => props.file.pathname,
  (pathname, previous) => {
    if (!rowRegistry) return
    if (previous) rowRegistry.delete(toRowKey(previous))
    if (fileEl.value) rowRegistry.set(toRowKey(pathname), fileEl.value)
  }
)

const { activeItem } = storeToRefs(projectStore)
const { currentFile, tabs } = storeToRefs(editorStore)

const handleFileClick = (event: MouseEvent): void => {
  // Select before the open-file branch runs, so non-markdown rows select too.
  projectStore.CHANGE_ACTIVE_ITEM(props.file)
  // A double-click's second click must not re-issue the open request.
  if (event.detail === 2) return
  const { isMarkdown, pathname } = props.file
  if (!isMarkdown) return
  const openedTab = tabs.value.find((f) => window.fileUtils.isSamePathSync(f.pathname, pathname))
  if (openedTab) {
    if (isSamePath(currentFile.value?.pathname ?? '', openedTab.pathname)) {
      return
    }
    editorStore.UPDATE_CURRENT_FILE(openedTab)
    // Restoring the tab's caret pulls DOM focus into the editor.
    bus.emit('SIDEBAR::focus-tree')
  } else {
    editorStore.SET_OPEN_INTENT(pathname, false)
    window.electron.ipcRenderer.send('mt::open-file', pathname)
  }
}

const handleFileDblClick = (): void => {
  if (!props.file.isMarkdown) return
  editorStore.FOCUS_FILE(props.file.pathname)
}

onMounted(() => {
  if (fileEl.value) rowRegistry?.set(toRowKey(props.file.pathname), fileEl.value)
})

onBeforeUnmount(() => {
  rowRegistry?.delete(toRowKey(props.file.pathname))
})
</script>

<style scoped>
.side-bar-file {
  display: flex;
  position: relative;
  align-items: center;
  cursor: default;
  user-select: none;
  height: 30px;
  box-sizing: border-box;
  padding-right: 15px;
  &:hover {
    background: var(--sideBarItemHoverBgColor);
  }
  & > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &::before {
    content: '';
    position: absolute;
    display: block;
    left: 0;
    background: var(--themeColor);
    width: 2px;
    height: 0;
    top: 50%;
    transform: translateY(-50%);
    transition: all 0.2s ease;
  }
}
.side-bar-file.current::before {
  height: 100%;
}
.side-bar-file.current > span {
  color: var(--themeColor);
}
/* After :hover so the selection stays visible while the pointer is over it. */
.side-bar-file.active {
  background: var(--themeColor20);
}
.side-bar-file.active > span {
  color: var(--sideBarTitleColor);
}
</style>
