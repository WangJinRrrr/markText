<p align="center"><img src="docs/assets/logo-small.png" alt="markText" width="100" height="100"></p>

<h1 align="center">markText</h1>

<p align="center">A local-first Markdown notebook editor for Windows.</p>

> markText is an independent modified distribution derived from the upstream [MarkText](https://github.com/marktext/marktext) project. The upstream project, its license, and its contributors are acknowledged with respect.

## What Changed

- Windows-focused portable distribution named `markText`.
- Repository-oriented file browsing and management from the sidebar.
- Simplified application menus and settings entry.
- Sidebar file-tree context menu for file operations.
- Reading-area context menu focused on spelling and window always-on-top.
- Local-first Markdown editing with no account or cloud service required.

## Features

- WYSIWYG Markdown editing with source-code mode.
- CommonMark and GitHub Flavored Markdown support.
- KaTeX math, Mermaid diagrams, front matter, code blocks, and tables.
- Repository navigation, in-folder search, and table of contents.
- Relative or path-based local image handling.
- HTML, PDF, and print export.
- Focus mode and typewriter mode.
- Theme and editor preferences with categorized settings.

## Download

Download the latest build from the [markText Releases](https://github.com/WangJinRrrr/markText/releases) page.

For Windows x64, use the portable executable:

```text
markText-win-x64-<version>.exe
```

The portable build does not require an installer. Place it in a directory you control and run it directly. User data is stored by Electron in the normal Windows application data location.

## Build From Source

Requirements:

- Windows 10 or later
- Node.js 20.19 or later
- pnpm 10 or later

Install dependencies and run the checks:

```bash
pnpm install
pnpm run typecheck
```

Build the Windows x64 portable package:

```bash
pnpm run build:win:x64
```

The generated packages are written to `dist/`.

## Documentation

- [User documentation](packages/website/content/docs/README.md)
- [Developer documentation](packages/website/content/docs/dev/overview.md)
- [Upstream MarkText repository](https://github.com/marktext/marktext)

## License

markText remains distributed under the [MIT License](LICENSE). See the upstream project for the original copyright and contribution history.
