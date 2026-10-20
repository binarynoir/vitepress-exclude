import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { SKIPPED_FOLDERS } from "./rules.js";
import type { ExcludeOptions } from "./types.js";

// An opening `---` line, an optional YAML body, and a closing `---` line.
const FRONTMATTER = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

/** The `excludeFrontmatter` keys, trimmed, without blanks. */
export function normalizeFrontmatterKeys(keys: ExcludeOptions["excludeFrontmatter"]): string[] {
  return (keys ?? []).map((key) => key.trim()).filter(Boolean);
}

/** A value by dotted path: `blog.draft` reads `blog: { draft }`. */
function readPath(data: unknown, keyPath: string): unknown {
  let value = data;
  for (const part of keyPath.split(".")) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/**
 * Whether a page's frontmatter sets any of `keys` to `true`. Only a real
 * `true` counts: `draft: false`, `draft: "yes"` or a missing key don't. The
 * YAML is only parsed when one of the keys' names appears in it, so pages
 * without them stay cheap; invalid YAML counts as not excluded.
 */
export function isExcludedByFrontmatter(source: string, keys: string[]): boolean {
  if (keys.length === 0) return false;
  const block = FRONTMATTER.exec(source.replace(/^﻿/, ""))?.[1];
  if (!block) return false;
  const names = keys.map((key) => key.split(".")[0]);
  if (
    !names.some((name) =>
      new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`, "m").test(block),
    )
  ) {
    return false;
  }
  let data: unknown;
  try {
    data = parse(block);
  } catch {
    return false;
  }
  return keys.some((key) => readPath(data, key) === true);
}

/** Whether the file at `file` is excluded by its frontmatter. A file that can't be read is not. */
export function isFileExcludedByFrontmatter(file: string, keys: string[]): boolean {
  if (keys.length === 0) return false;
  try {
    return isExcludedByFrontmatter(fs.readFileSync(file, "utf-8"), keys);
  } catch {
    return false;
  }
}

/**
 * Every Markdown page under `srcDir` whose frontmatter excludes it, as paths
 * relative to `srcDir` with forward slashes. Hidden folders (`.vitepress`),
 * `node_modules` and `dist` are skipped, as for exclusion files.
 */
export function findFrontmatterExcludedPages(
  srcDir: string,
  options: ExcludeOptions = {},
): string[] {
  const keys = normalizeFrontmatterKeys(options.excludeFrontmatter);
  if (keys.length === 0) return [];
  const root = path.resolve(srcDir);
  const found: string[] = [];

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !SKIPPED_FOLDERS.has(entry.name)) walk(full);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        isFileExcludedByFrontmatter(full, keys)
      ) {
        found.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };

  walk(root);
  return found.sort();
}
