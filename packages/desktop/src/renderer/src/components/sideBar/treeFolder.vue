<template>
  <div class="side-bar-folder">
    <div
      class="folder-name"
      :style="{ 'padding-left': `${depth * 6 + 10}px` }"
      :class="[{ active: isSamePath(activeItem?.pathname ?? '', folder.pathname) }]"
      :title="folder.pathname"
      @click="folderNameClick"
    >
      <el-icon
        class="icon-arrow"
        :class="{ fold: isCollapsed }"
        :size="12"
      >
        <ArrowRight />
      </el-icon>
      <span class="text-overflow">{{ folder.name }}</span>
    </div>
    <div
      v-if="!isCollapsed"
      class="folder-contents"
    >
      <tree-folder
        v-for="childFolder of folder.folders"
        :key="childFolder.id"
        :folder="childFolder"
        :depth="depth + 1"
      />
      <File
        v-for="file of folder.files"
        :key="file.id"
        :file="file"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/store/project'
import { isSamePath } from '@/util'
import File from './treeFile.vue'
import { ArrowRight } from '@element-plus/icons-vue'
import type { TreeFolderNode } from './types'

const props = defineProps<{
  folder: TreeFolderNode
  depth: number
}>()

const projectStore = useProjectStore()

// Kept on the tree node, not locally: the Files view is under a v-if and
// remounts on every sidebar view switch (#5631).
const isCollapsed = computed<boolean>({
  get: () => !!props.folder.isCollapsed,
  set: (value) => {
    projectStore.SET_FOLDER_COLLAPSED(props.folder, value)
  }
})

const { activeItem } = storeToRefs(projectStore)

const folderNameClick = (): void => {
  projectStore.CHANGE_ACTIVE_ITEM(props.folder)
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.side-bar-folder {
  & > .folder-name {
    cursor: default;
    user-select: none;
    display: flex;
    align-items: center;
    height: 30px;
    padding-right: 15px;
    & > .icon-arrow {
      flex-shrink: 0;
      color: var(--sideBarIconColor);
      margin-right: 5px;
      transition: transform 0.25s ease-out;
      transform: rotate(90deg);
    }
    & > .icon-arrow.fold {
      transform: rotate(0);
    }
    &:hover {
      background: var(--sideBarItemHoverBgColor);
    }
    /* After :hover so the selection stays visible while the pointer is over it. */
    &.active {
      background: var(--themeColor20);
    }
  }
}
</style>
