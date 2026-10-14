# vitepress-exclude

[![npm version](https://img.shields.io/npm/v/@binarynoir/vitepress-exclude.svg)](https://www.npmjs.com/package/@binarynoir/vitepress-exclude)
[![CI](https://github.com/binarynoir/vitepress-exclude/actions/workflows/ci.yml/badge.svg)](https://github.com/binarynoir/vitepress-exclude/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@binarynoir/vitepress-exclude.svg)](LICENSE)

A [VitePress](https://vitepress.dev) plugin that keeps pages out of the build
with a `.exclude` file in the folder that holds them.

[![Support me on Buy Me a Coffee](https://img.shields.io/badge/Support%20me-Buy%20Me%20a%20Coffee-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/binarynoir)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20me-Ko--fi-blue?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/binarynoir)
[![More tools](https://img.shields.io/badge/Website-binarynoir.tech-8c8c8c?style=for-the-badge)](https://binarynoir.tech)

## What this does

VitePress's `srcExclude` is one list of globs in `config.mts`, far from the
pages it hides. With this plugin, each folder says what to leave out:

```txt
docs/guide/
  .exclude
  index.md
  draft.md
  internal-notes.md
  drafts/
```

```txt
# docs/guide/.exclude
draft.md
internal-*.md
drafts/
```

Those pages are not built, not in search and not in the sitemap. The files
stay where they are.

- **Same syntax as auto-sidebar.** [`@binarynoir/vitepress-auto-sidebar`](https://github.com/binarynoir/vitepress-auto-sidebar) and [`@binarynoir/vitepress-auto-navbar`](https://github.com/binarynoir/vitepress-auto-navbar) read the same `.exclude` files, so one line hides a page from the navigation and keeps it out of the build.
- **Live in `vitepress dev`.** Add, change or delete a `.exclude` file and the dev server restarts with the new rules.

## Install

```sh
npm install --save-dev @binarynoir/vitepress-exclude
```

## Usage

Wrap your config with `withExclude` and pass it the docs source directory:

```ts
// .vitepress/config.mts
import path from "node:path";
import { defineConfig } from "vitepress";
import { withExclude } from "@binarynoir/vitepress-exclude/vitepress";

export default withExclude(
  defineConfig({
    // ...your config
  }),
  path.resolve(import.meta.dirname, ".."),
);
```

`withExclude` adds the globs to `srcExclude` and the dev-server plugin to
`vite.plugins`. It keeps what is already there, so it composes with other
`withX()` wrappers in any order.

### Wiring it by hand

The two pieces are also exported on their own:

```ts
// .vitepress/config.mts
import path from "node:path";
import { defineConfig } from "vitepress";
import { excludeSrc, excludeVitePlugin } from "@binarynoir/vitepress-exclude";

const docsRoot = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  // Globs for every `.exclude` rule under the docs folder.
  srcExclude: [...excludeSrc(docsRoot), "**/_snippets/**"],

  vite: {
    // Restarts `vitepress dev` when a `.exclude` file changes.
    plugins: [excludeVitePlugin()],
  },
});
```

## `.exclude` files

One rule per line. Blank lines and lines starting with `#` are ignored. Rules
are relative to the folder the `.exclude` file is in, and a `.exclude` file in
the docs root works too.

| Rule             | Excludes                                                      |
| ---------------- | ------------------------------------------------------------- |
| `draft.md`       | That file. A name without a `/` also matches a folder.        |
| `drafts/`        | That folder and everything in it.                             |
| `internal-*.md`  | Matching files in this folder. `*` and `?` stay in one level. |
| `**/internal.md` | Matching files in this folder or any folder below it.         |
| `.`              | The whole folder the `.exclude` file is in.                   |

Rules that cannot be turned into `srcExclude` globs are skipped with a warning:

- `!keep.md`: VitePress cannot re-include a file that another rule excluded.
- `../other.md`: a rule cannot reach outside its own folder. Put a `.exclude` file in that folder instead.

Folders whose names start with `.` (such as `.vitepress`) and `node_modules`
are not searched for `.exclude` files. VitePress never builds pages from them.

## Options

Both `withExclude(config, srcDir, options)` and `excludeSrc(srcDir, options)` take:

| Option             | Default        | Description                                                |
| ------------------ | -------------- | ---------------------------------------------------------- |
| `excludeFilenames` | `[".exclude"]` | Filenames read in each folder.                             |
| `verbose`          | `false`        | Log each `.exclude` file, its rules and the globs it made. |

`excludeVitePlugin(options)` takes `excludeFilenames`. Pass it the same list.

## How it works

`srcExclude` is read when VitePress loads the config, so `excludeSrc` walks the
source folder then and turns each rule into globs. The dev-server plugin
registers every `.exclude` file as a config dependency. When one changes,
VitePress reloads the config and restarts the server, as it does when you edit
`config.mts`. The plugin does nothing in `vitepress build`.

## Releasing

Releases are tag-triggered. To ship a new version, from a clean `main` that's
in sync with `origin/main`:

```sh
npm run release:patch   # or release:minor / release:major
```

This runs typecheck/lint/test/build locally, then `npm version <bump>`
(bumps `package.json`, commits, and creates a matching `vX.Y.Z` tag) and
`git push --follow-tags`. Pushing that tag triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml), which
re-runs the checks, publishes to npm (with
[provenance](https://docs.npmjs.com/generating-provenance-statements)), and
creates a GitHub release with auto-generated notes.

For a prerelease or an explicit version, use `npm run release -- <arg>`
(e.g. `npm run release -- 1.2.3` or `npm run release -- prerelease`) — see
[`npm version`](https://docs.npmjs.com/cli/v10/commands/npm-version) for the
full list of accepted values.

Publishing uses npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers)
(OIDC): no npm token is stored in the repository. The package's npm settings
trust `.github/workflows/release.yml` in this repository, so renaming that
file breaks publishing until the setting is updated.

## License

[MIT](LICENSE)

---

## Feedback and support

Bug reports, feature requests and questions are all welcome. Please open them on this project's [GitHub issue tracker](https://github.com/binarynoir/vitepress-exclude/issues):

- **Found a bug?** [Report it](https://github.com/binarynoir/vitepress-exclude/issues/new?labels=bug&title=Bug%3A%20). Include your version and the steps to reproduce it.
- **Have an idea?** [Request a feature](https://github.com/binarynoir/vitepress-exclude/issues/new?labels=enhancement&title=Feature%20request%3A%20). Tell us what you are trying to do.
- **Something else?** [Browse open issues](https://github.com/binarynoir/vitepress-exclude/issues) to see if it has already been raised.

Pull requests are welcome too.

## More from BinaryNoir

<p align="center">
  <a href="https://binarynoir.tech">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://binarynoir.github.io/logo-wide-dark.svg">
      <img alt="BinaryNoir" src="https://binarynoir.github.io/logo-wide-light.svg" width="320">
    </picture>
  </a>
</p>

Exclude is one of a family of open-source VitePress plugins, editor extensions and command-line tools from BinaryNoir. Browse them all, with documentation and live demos, at **[binarynoir.github.io](https://binarynoir.github.io)**.

**VitePress plugins**

- [Auto Sidebar](https://binarynoir.github.io/plugins/auto-sidebar): sidebar built from your folders
- [Auto Navbar](https://binarynoir.github.io/plugins/auto-navbar): navbar built from your folders
- [Markdown Tags](https://binarynoir.github.io/plugins/markdown-tags/): inline status badges
- [Reading Time Tag](https://binarynoir.github.io/plugins/reading-time-tag): reading-time estimates
- [Glossary Tooltips](https://binarynoir.github.io/plugins/glossary/): hover definitions from one glossary file
- [HTML Escape](https://binarynoir.github.io/plugins/html-escape/): stray tags and braces shown as text, not build errors
- [Downloads](https://binarynoir.github.io/plugins/downloads): files linked with a relative path, published as downloads

**Vite plugins**

- [Optimize Images](https://binarynoir.github.io/plugins/optimize-images): smaller images in the build output
- [Image Fallback](https://binarynoir.github.io/plugins/image-fallback): a placeholder instead of a failed build

**Editor extensions**

- [Tags for Markdown for VS Code](https://binarynoir.github.io/plugins/markdown-tags/vscode): status badges in the VS Code Markdown preview
- [Tags for Markdown for Obsidian](https://binarynoir.github.io/plugins/markdown-tags/obsidian): status badges in Obsidian

**Command-line tools**

- [NoirWatch](https://binarynoir.github.io/apps/noirwatch): get notified when a web page changes
- [NoirCon](https://binarynoir.github.io/apps/noircon): get notified when a site, server or port goes down
- [callrx](https://binarynoir.github.io/apps/callrx): amateur radio callsign lookup

Website: **[binarynoir.tech](https://binarynoir.tech)** · Docs and demos: **[binarynoir.github.io](https://binarynoir.github.io)**

## Author

John Smith III, [BinaryNoir](https://binarynoir.tech). Thanks to all contributors and users for their support and feedback.
