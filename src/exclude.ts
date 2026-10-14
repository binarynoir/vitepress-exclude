import path from "node:path";
import { findExcludeRules, rulesToGlobs } from "./rules.js";
import type { ExcludeOptions } from "./types.js";

/**
 * `srcExclude` globs for the rules in every `.exclude` file under `srcDir`.
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
  const globs = rulesToGlobs(rules);

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
    for (const glob of globs) console.log(`  srcExclude: ${glob}`);
  }

  return globs;
}
