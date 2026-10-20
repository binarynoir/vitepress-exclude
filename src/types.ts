export interface ExcludeOptions {
  /**
   * Filenames checked in every folder for exclusion rules.
   * The same default as `@binarynoir/vitepress-auto-sidebar`, so one file
   * hides a page from the sidebar and keeps it out of the build.
   * @default [".exclude"]
   */
  excludeFilenames?: string[];
  /**
   * Frontmatter keys that keep a page out of the build when they are `true`,
   * such as `["draft"]`, or `["draft", "blog.draft"]` to include
   * `@binarynoir/vitepress-blog` drafts. Dotted keys read nested values. The
   * same option in `@binarynoir/vitepress-auto-sidebar` and
   * `@binarynoir/vitepress-auto-navbar` hides those pages from the menus.
   * @default []
   */
  excludeFrontmatter?: string[];
  /** Log each rule file found and the globs it produced. @default false */
  verbose?: boolean;
}

/** One line of an exclusion file, with where it came from. */
export interface ExcludeRule {
  /** The line as written, trimmed. */
  pattern: string;
  /** Absolute path of the exclusion file. */
  file: string;
  /** Folder the exclusion file lives in, relative to the source directory ("" for the root). */
  directory: string;
}
