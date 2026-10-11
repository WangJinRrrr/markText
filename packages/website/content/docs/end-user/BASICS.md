# Basics

## Getting started

markText is a realtime preview editor for Markdown with various Markdown extensions. You can write and edit text while markText hides unnecessary syntax elements. When you first start markText an empty editor window is shown. You can see [key bindings](KEYBINDINGS.md) or the command palette (<kbd>CmdOrCtrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) for available commands. markText provides a minimal, local-first interface for writing and organizing notes.

![](../assets/marktext-default.png)

### Interface

#### Toggle sidebar

The sidebar consists of three panels and you can toggle the sidebar by pressing <kbd>CmdOrCtrl</kbd>+<kbd>J</kbd>:

- Repository navigation tree for the opened root directory.
- Find in files
- Table of contents of the selected tab

#### Toggle tabs

markText can be used as a single editor but opens all files in separate tabs. Tabs can be toggled via <kbd>CmdOrCtrl</kbd>+<kbd>Alt</kbd>+<kbd>B</kbd> and reordered by drag and drop.

**Want to use tabs without showing them?**

You can hide tabs and use key bindings such as <kbd>CmdOrCtrl</kbd>+<kbd>Tab</kbd> to cycle through tabs. The tab bar remains the canonical list of open notes.

![](../assets/marktext-interface-1.png)

#### Switch between editor modes

You can use <kbd>CmdOrCtrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd> to switch between the preview and source-code editor. The realtime preview editor is the default editor with many features. A detailed overview of all features can be found [here](EDITING.md).

#### Typewriter and focus mode

Use <kbd>CmdOrCtrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> to enter distraction free focus mode or <kbd>CmdOrCtrl</kbd>+<kbd>Alt</kbd>+<kbd>T</kbd> for typewriter.

<h4 align="center">:smile_cat:Edit modes:dog:</h4>

|        Source Code        |          Typewriter           |          Focus           |
| :-----------------------: | :---------------------------: | :----------------------: |
| ![](../assets/source.gif) | ![](../assets/typewriter.gif) | ![](../assets/focus.gif) |

## Open and modify markdown files

### Open your first file

You can press <kbd>CmdOrCtrl</kbd>+<kbd>O</kbd> to open a Markdown file. You can also launch markText with directories or files from the command line.

### Save your edited file

After some modifications you can save your file via <kbd>CmdOrCtrl</kbd>+<kbd>S</kbd> or use _save as_ to use a different file name.

### Open a directory

markText supports opening a directory via <kbd>CmdOrCtrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> or the sidebar button _Open Folder_. After opening a directory, browse its files in the sidebar tree. Right-click the file tree to access file operations. Use the notebook repository manager (<kbd>CmdOrCtrl</kbd>+<kbd>Shift</kbd>+<kbd>F12</kbd>) for repository organization. To view another sidebar panel, such as find in files, click a left sidebar icon.

![](../assets/marktext-interface-2.png)

## Themes

You can change the application theme from the categorized Settings window.

## Preferences

You can control and modify all preferences in the settings window or edit `preferences.json` in the [application data directory](APPLICATION_DATA_DIRECTORY.md). Detailed information about the preference file can be found [here](PREFERENCES.md).

- General application settings
- Settings that control the editor appearance
- Markdown related settings
- The application theme
- Options how images are handled

![](../assets/marktext-settings.png)
