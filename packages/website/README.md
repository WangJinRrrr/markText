# MarkText Website

This package contains the official MarkText website and its user/developer documentation. It lives in the MarkText monorepo alongside the Electron desktop app and the Muya editor engine.

The site is built with Next.js and React, and renders the Markdown content under `content/docs/`. The documentation describes the current lightweight, local-first notebook application, including its repository manager, Markdown editor, themes, exports, and local image handling.

## Prerequisites

- Node.js >= 20.19.0
- pnpm >= 10

Install dependencies from the repository root:

```bash
pnpm install
```

## Development

From the repository root:

```bash
pnpm --filter marktext-website dev
```

The development server starts on the port reported by Next.js. The docs index is generated automatically when it is missing.

To regenerate the searchable documentation index explicitly:

```bash
pnpm --filter marktext-website docs:index
```

## Production

Build and preview the site with:

```bash
pnpm --filter marktext-website build
pnpm --filter marktext-website start
```

The production build also regenerates `public/docs-index.json` from the registered documentation pages and their Markdown sources.

## Structure

```text
packages/website/
├── content/docs/       User and developer Markdown documentation
├── public/             Static assets and generated docs index
├── src/app/            Next.js routes and layouts
├── src/components/     Website and documentation UI
├── src/lib/            Documentation registry, Markdown loading, and utilities
├── scripts/             Documentation index generation
├── package.json         Website scripts and dependencies
└── tsconfig.json        TypeScript configuration
```

`src/lib/docs-nav.ts` is the authoritative documentation registry. When adding or removing a documentation page, update the registry and run `pnpm --filter marktext-website docs:index`.

## Documentation scope

The desktop application owns the product behavior. Keep user-facing documentation aligned with the current app, especially these boundaries:

- The notebook repository manager owns repository file and folder organization.
- The sidebar is for navigation, search, and the table of contents.
- Images are persisted locally using folder- or path-based workflows.
- Pandoc conversion and cloud image uploader integrations are not part of the current desktop app.

## Contributing

Documentation and website changes should follow the repository contribution guidelines in [`.github/CONTRIBUTING.md`](../../.github/CONTRIBUTING.md). Run the website type check and build for changes to the website code or documentation registry:

```bash
pnpm --filter marktext-website type-check
pnpm --filter marktext-website build
```

## License

MarkText is distributed under the MIT License. See [`../../LICENSE`](../../LICENSE).
