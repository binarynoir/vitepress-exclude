import path from "node:path";
import type { Plugin } from "vite";
import { findExcludeFiles, normalizeExcludeFilenames } from "./rules.js";
import type { ExcludeOptions } from "./types.js";

/** The part of VitePress's resolved site config this plugin touches. */
interface SiteConfigLike {
  srcDir: string;
  configDeps: string[];
}

/**
 * Restarts `vitepress dev` when an `.exclude` file is added, changed or
 * removed, so the new rules take effect without restarting by hand.
 *
 * `srcExclude` is computed once, when the config loads. VitePress restarts
 * the dev server (and reloads the config) when one of the config's
 * dependencies changes, so this plugin registers every exclusion file as one.
 * It does nothing in a build.
 */
export function excludeVitePlugin(options: ExcludeOptions = {}): Plugin {
  const filenames = normalizeExcludeFilenames(options.excludeFilenames);
  let site: SiteConfigLike | undefined;

  /** Adds an exclusion file to VitePress's config dependencies, once. */
  const track = (file: string): void => {
    if (!site) return;
    const normalized = file.split(path.sep).join("/");
    if (!filenames.includes(path.posix.basename(normalized))) return;
    if (!isInside(site.srcDir, normalized)) return;
    if (!site.configDeps.includes(normalized)) site.configDeps.push(normalized);
  };

  return {
    name: "vitepress-exclude",
    apply: "serve",
    // Ahead of VitePress's own hook, which decides whether to restart.
    enforce: "pre",

    configResolved(config) {
      site = (config as { vitepress?: SiteConfigLike }).vitepress;
      if (!site) return;
      for (const file of findExcludeFiles(site.srcDir, options)) track(file);
    },

    // A new exclusion file is not a dependency yet. Vite already watches the
    // source directory, so registering it here, before VitePress sees the
    // change, is enough to trigger the restart.

    // Vite 6+ (VitePress 2).
    hotUpdate({ file }) {
      track(file);
    },

    // Vite 5 (VitePress 1).
    handleHotUpdate({ file }) {
      track(file);
    },
  };
}

function isInside(dir: string, file: string): boolean {
  const relative = path.posix.relative(dir.split(path.sep).join("/"), file);
  return !!relative && !relative.startsWith("..") && !path.posix.isAbsolute(relative);
}
