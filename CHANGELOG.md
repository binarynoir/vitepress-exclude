# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-10-22

### Changed

- README: replace the plugin list with a generated More from BinaryNoir section, and use a BinaryNoir logo that shows on light and dark backgrounds

## [0.2.0] - 2026-10-20

### Added

- `excludeFrontmatter` option: frontmatter keys that leave a page out of the build when they are `true`, such as `["draft"]`, with dotted keys for nested values (`blog.draft`). In `vitepress dev`, a page that gains or loses the flag restarts the server
- `findFrontmatterExcludedPages` and `isExcludedByFrontmatter` exports

## [0.1.2] - 2026-10-15

### Changed

- README: add Sidebar Accordion to the list of BinaryNoir plugins

## [0.1.1] - 2026-10-14

### Changed

- README: add a Documentation and live demo link, list the README Index and Broken Links plugins under More from BinaryNoir, and point website links to binarynoir.tech

## [0.1.0] - 2026-10-14

### Added

- Initial release: `.exclude` files in any folder keep pages out of the VitePress build (`excludeSrc`, `withExclude`), and `vitepress dev` restarts when one changes (`excludeVitePlugin`).
