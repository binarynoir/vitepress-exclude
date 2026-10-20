import fs from "node:fs";
import path from "node:path";
import type { ExcludeOptions, ExcludeRule } from "./types.js";

export const DEFAULT_EXCLUDE_FILENAMES = [".exclude"];

/** Folders that never hold pages and are not worth walking. */
export const SKIPPED_FOLDERS = new Set(["node_modules", "dist"]);

export function normalizeExcludeFilenames(filenames: ExcludeOptions["excludeFilenames"]): string[] {
  const list = (filenames ?? DEFAULT_EXCLUDE_FILENAMES).filter(Boolean);
  return list.length > 0 ? list : DEFAULT_EXCLUDE_FILENAMES;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Reads one exclusion file: one rule per line, `#` comments and blank lines ignored. */
export function readExcludeFile(file: string): string[] {
  try {
    return fs
      .readFileSync(file, "utf-8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch (error) {
    console.error(`[vitepress-exclude] failed to read ${file}: ${errorMessage(error)}`);
    return [];
  }
}

/**
 * Every exclusion file under `srcDir`, including one in `srcDir` itself, as
 * absolute paths. Hidden folders (`.vitepress`, `.git`) and `node_modules` are
 * skipped: VitePress never builds pages from them.
 */
export function findExcludeFiles(srcDir: string, options: ExcludeOptions = {}): string[] {
  const filenames = normalizeExcludeFilenames(options.excludeFilenames);
  const found: string[] = [];

  const walk = (dir: string): void => {
    for (const filename of filenames) {
      const file = path.join(dir, filename);
      if (isFile(file)) found.push(file);
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      console.warn(`[vitepress-exclude] could not scan ${dir}: ${errorMessage(error)}`);
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || SKIPPED_FOLDERS.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
    }
  };

  walk(path.resolve(srcDir));
  return found;
}

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

/** The rules in every exclusion file under `srcDir`. */
export function findExcludeRules(srcDir: string, options: ExcludeOptions = {}): ExcludeRule[] {
  const root = path.resolve(srcDir);
  return findExcludeFiles(root, options).flatMap((file) => {
    const directory = toPosix(path.relative(root, path.dirname(file)));
    return readExcludeFile(file).map((pattern) => ({ pattern, file, directory }));
  });
}

/**
 * Turns one rule into `srcExclude` globs, relative to the source directory.
 * Returns an empty list (with a warning) for a rule that cannot be expressed.
 *
 * - `.` excludes the folder the exclusion file is in.
 * - `name/` excludes a folder and everything in it.
 * - `name` excludes a file, or a folder and everything in it.
 * - `*` and `?` match within one path segment; `**` matches any depth.
 */
export function ruleToGlobs(rule: ExcludeRule): string[] {
  const prefix = rule.directory ? `${escapeGlob(rule.directory)}/` : "";

  if (rule.pattern === ".") return [`${prefix}**`];

  if (rule.pattern.startsWith("!")) {
    warn(rule, "negated rules are not supported (VitePress cannot re-include a file)");
    return [];
  }

  const pattern = rule.pattern.replace(/\\/g, "/").replace(/^\.?\/+/, "");
  if (pattern.split("/").includes("..")) {
    warn(rule, "rules cannot reach outside their folder");
    return [];
  }

  const isFolderRule = pattern.endsWith("/");
  const body = pattern.replace(/\/+$/, "");
  if (!body) return [];

  const glob = prefix + escapeRule(body);
  return isFolderRule ? [`${glob}/**`] : [glob, `${glob}/**`];
}

/** `srcExclude` globs for every rule under `srcDir`, without duplicates. */
export function rulesToGlobs(rules: ExcludeRule[]): string[] {
  return [...new Set(rules.flatMap(ruleToGlobs))];
}

function warn(rule: ExcludeRule, reason: string): void {
  console.warn(`[vitepress-exclude] skipped "${rule.pattern}" in ${rule.file}: ${reason}`);
}

/** Escapes every glob character, for a literal folder path. */
export function escapeGlob(text: string): string {
  return text.replace(/[*?[\]{}()!+@\\]/g, "\\$&");
}

/** Escapes glob characters other than the `*` and `?` wildcards a rule may use. */
function escapeRule(text: string): string {
  return text.replace(/[[\]{}()!+@\\]/g, "\\$&");
}

function toPosix(file: string): string {
  return file.split(path.sep).join("/");
}
