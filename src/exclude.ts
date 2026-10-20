import path from "node:path";
import { findFrontmatterExcludedPages } from "./frontmatter.js";
import { escapeGlob, findExcludeRules, rulesToGlobs } from "./rules.js";
import type { ExcludeOptions } from "./types.js";

/**
 * `srcExclude` globs for the rules in every `.exclude` file under `srcDir`,
 * and for every page whose frontmatter sets one of `excludeFrontmatter` to
 * `true`.
 *
 * ```ts
 * // .vitepress/config.mts
 * export default defineConfig({
 *   srcExclude: excludeSrc(path.resolve(import.meta.dirname, "..")),
 * });
 * ```
 */
export function excludeSrc(srcDir: string, options: ExcludeOptions = {}): string[] {
  const root = path.resolve(srcDir);
  const rules = findExcludeRules(root, options);
  const pages = findFrontmatterExcludedPages(root, options);
  const globs = [...new Set([...rulesToGlobs(rules), ...pages.map(escapeGlob)])];

  if (options.verbose) {
    const files = new Set(rules.map((rule) => rule.file));
    console.log(
      `[vitepress-exclude] ${rules.length} rule(s) in ${files.size} file(s) -> ${globs.length} glob(s)`,
    );
    for (const file of files) {
      console.log(`  ${path.relative(root, file)}`);
      for (const rule of rules.filter((r) => r.file === file)) {
        console.log(`    ${rule.pattern}`);
      }
    }
    if (pages.length) {
      console.log(`[vitepress-exclude] ${pages.length} page(s) excluded by frontmatter`);
      for (const page of pages) console.log(`  ${page}`);
    }
    for (const glob of globs) console.log(`  srcExclude: ${glob}`);
  }

  return globs;
}
