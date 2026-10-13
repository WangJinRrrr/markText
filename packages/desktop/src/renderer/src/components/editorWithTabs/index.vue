<template>
  <div
    class="editor-with-tabs"
    :style="{ 'max-width': `calc(100vw - ${effectiveSideBarWidth}px)` }"
  >
    <tabs v-show="showTabBar" />
    <div class="panes">
      <div class="container">
        <editor
          :file="split ? primaryFile ?? undefined : undefined"
          :markdown="split ? primaryFile?.markdown : markdown"
          :cursor="split ? primaryFile?.cursor : cursor"
          :pane-active="activePane === 'primary'"
          :split-pane="split"
          :text-direction="textDirection"
          :platform="platform"
          @activate="activate('primary')"
        />
        <source-code
          v-if="sourceCode && !split"
          :markdown="markdown"
          :muya-index-cursor="muyaIndexCursor"
          :text-direction="textDirection"
        />
      </div>
      <div
        v-if="split && secondaryFile"
        class="container secondary-pane"
      >
        <editor
          :key="secondaryFile.id"
          :file="secondaryFile"
          :markdown="secondaryFile.markdown"
          :cursor="secondaryFile.cursor"
          :pane-active="activePane === 'secondary'"
          :split-pane="true"
          :text-direction="textDirection"
          :platform="platform"
          @activate="activate('secondary')"
        />
      </div>
    </div>
    <tab-notifications />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/store/editor'
import { useLayoutStore } from '@/store/layout'
import { storeToRefs } from 'pinia'
import bus from '@/bus'
import Tabs from './tabs.vue'
import Editor from './editor.vue'
import SourceCode from './sourceCode.vue'
import TabNotifications from './notifications.vue'
defineProps<{ markdown: string; cursor: unknown; muyaIndexCursor?: unknown; sourceCode: boolean; showTabBar: boolean; textDirection: string; platform: string }>()
const store = useEditorStore()
const primaryId = ref('')
const secondaryId = ref('')
const activePane = ref<'primary' | 'secondary'>('primary')
const primaryFile = computed(() => store.tabs.find((tab) => tab.id === primaryId.value))
const secondaryFile = computed(() => store.tabs.find((tab) => tab.id === secondaryId.value))
const split = computed(() => !!primaryFile.value && !!secondaryFile.value)
const activate = (pane: 'primary' | 'secondary'): void => {
  if (!split.value) return
  const tab = pane === 'primary' ? primaryFile.value : secondaryFile.value
  if (!tab) return
  activePane.value = pane
  if (store.currentFile?.id !== tab.id) store.UPDATE_CURRENT_FILE(tab)
}
const splitNote = (id: unknown): void => {
  if (typeof id !== 'string') return
  const target = store.tabs.find((tab) => tab.id === id)
  const primary = store.currentFile
  if (!target || !primary) return
  bus.emit('flush-active-editor')
  primaryId.value = primary.id === target.id ? store.tabs.find((tab) => tab.id !== id)?.id ?? '' : primary.id
  secondaryId.value = target.id
  activePane.value = 'primary'
  if (primaryFile.value) store.UPDATE_CURRENT_FILE(primaryFile.value)
}
const closeSplit = (): void => {
  bus.emit('flush-active-editor')
  if (primaryFile.value) store.UPDATE_CURRENT_FILE(primaryFile.value)
  primaryId.value = ''
  secondaryId.value = ''
  activePane.value = 'primary'
}
watch(() => store.currentFile?.id, (id) => {
  if (!split.value || !id || id === primaryId.value || id === secondaryId.value) return
  if (activePane.value === 'secondary') secondaryId.value = id
  else primaryId.value = id
})
watch(() => store.tabs.map((tab) => tab.id), () => {
  if (primaryId.value && (!primaryFile.value || !secondaryFile.value)) closeSplit()
})
onMounted(() => { bus.on('split-note', splitNote); bus.on('close-note-split', closeSplit) })
onBeforeUnmount(() => { bus.off('split-note', splitNote); bus.off('close-note-split', closeSplit) })
const { effectiveSideBarWidth } = storeToRefs(useLayoutStore())
</script>
<style scoped>
.editor-with-tabs { position: relative; height: 100%; flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--editorBgColor); }
.panes { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.container { flex: 1; min-width: 0; position: relative; overflow: hidden; }
.secondary-pane { border-left: 1px solid var(--itemBgColor); }
@media (max-width: 760px) { .panes { flex-direction: column; } .secondary-pane { border-left: 0; border-top: 1px solid var(--itemBgColor); } }
</style>
