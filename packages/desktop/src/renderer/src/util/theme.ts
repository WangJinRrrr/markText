import {
  THEME_STYLE_ID,
  COMMON_STYLE_ID,
  DEFAULT_CODE_FONT_FAMILY,
  oneDarkThemes,
  railscastsThemes
} from '../config'
import {
  dark,
  graphite,
  materialDark,
  oneDark,
  ulysses,
  // New gogh themes - Dark
  dracula,
  nord,
  catppuccinMocha,
  gruvboxDark,
  tokyoNight,
  tokyoNightStorm,
  solarizedDark,
  ayuDark,
  ayuMirage,
  everforestDark,
  rosePine,
  rosePineMoon,
  monokaiPro,
  synthwave84,
  horizonDark,
  palenight,
  oxocarbonDark,
  kanagawa,
  nightfox,
  cyberdream,
  // New gogh themes - Light
  catppuccinLatte,
  gruvboxLight,
  tokyoNightLight,
  solarizedLight,
  ayuLight,
  everforestLight,
  rosePineDawn
} from './themeColor'
import { isLinux } from './index'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ORIGINAL_THEME = '#409EFF'

const getMinimalShellPatch = (): string => `
:root {
  --controlRadius: 4px;
  --shellBorder: 1px solid var(--floatBorderColor);
  --shellFocusRing: 0 0 0 2px var(--themeColor20);
  --shellSpace: 8px;
  --theme-color: var(--themeColor);
  --highlight-color: var(--highlightColor);
  --selection-color: var(--selectionColor);
  --editor-color: var(--editorColor);
  --editor-color-80: var(--editorColor80);
  --editor-color-60: var(--editorColor60);
  --editor-color-50: var(--editorColor50);
  --editor-color-30: var(--editorColor30);
  --editor-color-10: var(--editorColor10);
  --editor-color-04: var(--editorColor04);
  --editor-bg-color: var(--editorBgColor);
  --editor-area-width: var(--editorAreaWidth);
  --icon-color: var(--iconColor);
  --input-bg-color: var(--inputBgColor);
  --float-bg-color: var(--floatBgColor);
  --float-hover-color: var(--floatHoverColor);
  --float-border-color: var(--floatBorderColor);
  --link-color: var(--linkColor);
  --h1-color: var(--h1Color);
  --h2-color: var(--h2Color);
  --h3-color: var(--h3Color);
  --h4-color: var(--h4Color);
  --h5-color: var(--h5Color);
  --h6-color: var(--h6Color);
  --blockquote-text-color: var(--blockquoteTextColor);
  --blockquote-border-color: var(--blockquoteBorderColor);
  --strong-color: var(--strongColor);
  --em-color: var(--emColor);
  --list-marker-color: var(--listMarkerColor);
  --hr-color: var(--hrColor);
}

.el-dialog,
.el-dialog.ag-dialog-table,
.mu-float-wrapper {
  border-radius: var(--controlRadius);
  box-shadow: var(--floatShadow);
}

button,
.el-button,
input,
textarea,
select {
  border-radius: var(--controlRadius);
}

.el-button:hover,
.el-button--primary:hover {
  background-image: none;
}

.side-bar,
.editor-tabs {
  border-color: var(--floatBorderColor);
}

.side-bar .left-column ul > li:focus-visible,
.side-bar .right-column:focus-visible,
.tree-wrapper:focus-visible,
.tabs-container > li:focus-visible {
  outline: 2px solid var(--focusColor);
  outline-offset: -2px;
  box-shadow: var(--shellFocusRing);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
`

const patchTheme = (css: string): string => {
  return `@media not print {\n${css}\n${getMinimalShellPatch()}\n}`
}

const getEmojiPickerPatch = (): string => {
  return isLinux
    ? '.mu-emoji-picker section .emoji-wrapper .item span { font-family: sans-serif, "Noto Color Emoji"; }'
    : ''
}

export const addThemeStyle = (theme: string): void => {
  const isCmRailscasts = railscastsThemes.includes(theme)
  const isCmOneDark = oneDarkThemes.includes(theme)
  const isDarkTheme = isCmOneDark || isCmRailscasts
  let themeStyleEle = document.querySelector(`#${THEME_STYLE_ID}`) as HTMLStyleElement | null
  if (!themeStyleEle) {
    themeStyleEle = document.createElement('style')
    themeStyleEle.id = THEME_STYLE_ID
    document.head.appendChild(themeStyleEle)
  }

  switch (theme) {
    case 'light':
      themeStyleEle.innerHTML = patchTheme(
        ':root {\n  --link-color: var(--linkColor);\n  --blockquote-border-color: var(--blockquoteBorderColor);\n}'
      )
      break
    case 'dark':
      themeStyleEle.innerHTML = patchTheme(dark())
      break
    case 'material-dark':
      themeStyleEle.innerHTML = patchTheme(materialDark())
      break
    case 'ulysses':
      themeStyleEle.innerHTML = patchTheme(ulysses())
      break
    case 'graphite':
      themeStyleEle.innerHTML = patchTheme(graphite())
      break
    case 'one-dark':
      themeStyleEle.innerHTML = patchTheme(oneDark())
      break
    // New gogh themes - Dark
    case 'dracula':
      themeStyleEle.innerHTML = patchTheme(dracula())
      break
    case 'nord':
      themeStyleEle.innerHTML = patchTheme(nord())
      break
    case 'catppuccin-mocha':
      themeStyleEle.innerHTML = patchTheme(catppuccinMocha())
      break
    case 'gruvbox-dark':
      themeStyleEle.innerHTML = patchTheme(gruvboxDark())
      break
    case 'tokyo-night':
      themeStyleEle.innerHTML = patchTheme(tokyoNight())
      break
    case 'tokyo-night-storm':
      themeStyleEle.innerHTML = patchTheme(tokyoNightStorm())
      break
    case 'solarized-dark':
      themeStyleEle.innerHTML = patchTheme(solarizedDark())
      break
    case 'ayu-dark':
      themeStyleEle.innerHTML = patchTheme(ayuDark())
      break
    case 'ayu-mirage':
      themeStyleEle.innerHTML = patchTheme(ayuMirage())
      break
    case 'everforest-dark':
      themeStyleEle.innerHTML = patchTheme(everforestDark())
      break
    case 'rose-pine':
      themeStyleEle.innerHTML = patchTheme(rosePine())
      break
    case 'rose-pine-moon':
      themeStyleEle.innerHTML = patchTheme(rosePineMoon())
      break
    case 'monokai-pro':
      themeStyleEle.innerHTML = patchTheme(monokaiPro())
      break
    case 'synthwave-84':
      themeStyleEle.innerHTML = patchTheme(synthwave84())
      break
    case 'horizon-dark':
      themeStyleEle.innerHTML = patchTheme(horizonDark())
      break
    case 'palenight':
      themeStyleEle.innerHTML = patchTheme(palenight())
      break
    case 'oxocarbon-dark':
      themeStyleEle.innerHTML = patchTheme(oxocarbonDark())
      break
    case 'kanagawa':
      themeStyleEle.innerHTML = patchTheme(kanagawa())
      break
    case 'nightfox':
      themeStyleEle.innerHTML = patchTheme(nightfox())
      break
    case 'cyberdream':
      themeStyleEle.innerHTML = patchTheme(cyberdream())
      break
    // New gogh themes - Light
    case 'catppuccin-latte':
      themeStyleEle.innerHTML = patchTheme(catppuccinLatte())
      break
    case 'gruvbox-light':
      themeStyleEle.innerHTML = patchTheme(gruvboxLight())
      break
    case 'tokyo-night-light':
      themeStyleEle.innerHTML = patchTheme(tokyoNightLight())
      break
    case 'solarized-light':
      themeStyleEle.innerHTML = patchTheme(solarizedLight())
      break
    case 'ayu-light':
      themeStyleEle.innerHTML = patchTheme(ayuLight())
      break
    case 'everforest-light':
      themeStyleEle.innerHTML = patchTheme(everforestLight())
      break
    case 'rose-pine-dawn':
      themeStyleEle.innerHTML = patchTheme(rosePineDawn())
      break
    default:
      break
  }

  // workaround: use dark icons
  document.body.classList.remove('dark')
  if (isDarkTheme) {
    document.body.classList.add('dark')
  }

  // change CodeMirror theme
  const cm = document.querySelector('.CodeMirror')
  if (cm) {
    cm.classList.remove('cm-s-default')
    cm.classList.remove('cm-s-one-dark')
    cm.classList.remove('cm-s-railscasts')
    if (isCmOneDark) {
      cm.classList.add('cm-s-one-dark')
    } else if (isCmRailscasts) {
      cm.classList.add('cm-s-railscasts')
    } else {
      cm.classList.add('cm-s-default')
    }
  }
}

export const setEditorWidth = (value: string): void => {
  const EDITOR_WIDTH_STYLE_ID = 'editor-width'
  let result = ''
  if (value && /^[0-9]+(?:ch|px|%)$/.test(value)) {
    // Add 100px for the container's horizontal padding. Set both the legacy
    // camelCase var (source mode) and the kebab-case var the active
    // @muyajs/core engine reads for `.mu-container` max-width (issue #4828).
    const width = `calc(100px + ${value})`
    result = `:root { --editorAreaWidth: ${width}; --editor-area-width: ${width}; }`
  }
  let styleEle = document.querySelector(`#${EDITOR_WIDTH_STYLE_ID}`) as HTMLStyleElement | null
  if (!styleEle) {
    styleEle = document.createElement('style')
    styleEle.setAttribute('id', EDITOR_WIDTH_STYLE_ID)
    document.head.appendChild(styleEle)
  }

  styleEle.innerHTML = result
}

export interface CommonStyleOptions {
  codeFontFamily: string
  codeFontSize: number | string
  hideScrollbar?: boolean
  [key: string]: unknown
}

export const addCommonStyle = (options: CommonStyleOptions): void => {
  const { codeFontFamily, codeFontSize, hideScrollbar } = options
  let sheet = document.querySelector(`#${COMMON_STYLE_ID}`) as HTMLStyleElement | null
  if (!sheet) {
    sheet = document.createElement('style')
    sheet.id = COMMON_STYLE_ID
    document.head.appendChild(sheet)
  }

  let scrollbarStyle = ''
  if (hideScrollbar) {
    scrollbarStyle = '::-webkit-scrollbar {display: none;}'
  }

  sheet.innerHTML = `${scrollbarStyle}
.CodeMirror {
font-family: ${codeFontFamily}, ${DEFAULT_CODE_FONT_FAMILY};
font-size: ${codeFontSize}px;
}

${getEmojiPickerPatch()}
`
}

export interface CustomStyleOptions {
  customCss?: string
  [key: string]: unknown
}

export const addCustomStyle = (options: CustomStyleOptions): void => {
  const { customCss } = options
  if (!customCss) {
    document.querySelector('#custom-styles')?.remove()
    return
  }

  let customStyleEle = document.querySelector('#custom-styles') as HTMLStyleElement | null
  if (!customStyleEle) {
    customStyleEle = document.createElement('style')
    customStyleEle.id = 'custom-styles'
    document.head.appendChild(customStyleEle)
  }
  customStyleEle.innerHTML = customCss
}

export interface AddStylesOptions extends CommonStyleOptions {
  theme: string
}

// Append common sheet and theme at the end of head - order is important.
export const addStyles = (options: AddStylesOptions): void => {
  const { theme } = options
  addThemeStyle(theme)
  addCommonStyle(options)
}
