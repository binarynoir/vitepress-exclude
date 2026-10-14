import type { UserConfig } from "vitepress";
import { excludeSrc } from "./exclude.js";
import type { ExcludeOptions } from "./types.js";
import { excludeVitePlugin } from "./vite.js";

/**
 * Wraps a VitePress config so `.exclude` files keep pages out of the build,
 * and so `vitepress dev` restarts when one changes.
 *
 * ```ts
 * // .vitepress/config.mts
 * import path from "node:path";
 * import { defineConfig } from "vitepress";
 * import { withExclude } from "@binarynoir/vitepress-exclude/vitepress";
 *
 * export default withExclude(
 *   defineConfig({ /* ...your config... *\/ }),
 *   path.resolve(import.meta.dirname, ".."),
 * );
 * ```
 *
 * Existing `srcExclude` and `vite.plugins` are kept, so it composes with other
 * `withX()` wrappers in any order.
 */
export function withExclude(
  config: UserConfig,
  srcDir: string,
  options: ExcludeOptions = {},
): UserConfig {
  // VitePress types this as string[], but a bare string is tolerated at runtime.
  const existingSrcExclude = config.srcExclude as string[] | string | undefined;
  config.srcExclude = [
    ...(Array.isArray(existingSrcExclude)
      ? existingSrcExclude
      : existingSrcExclude
        ? [existingSrcExclude]
        : []),
    ...excludeSrc(srcDir, options),
  ];

  config.vite ??= {};
  config.vite.plugins = [...(config.vite.plugins ?? []), excludeVitePlugin(options)];

  return config;
}

export { excludeSrc } from "./exclude.js";
