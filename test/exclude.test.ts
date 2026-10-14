import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { glob } from "tinyglobby";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { excludeSrc, findExcludeFiles, ruleToGlobs } from "../src/index.js";

function write(root: string, file: string, content = "# page") {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

/** The pages VitePress would build: the same glob call as its `resolvePages`. */
function pages(srcDir: string, srcExclude: string[]) {
  return glob(["**/*.md"], { cwd: srcDir, ignore: srcExclude }).then((files) => files.sort());
}

describe("ruleToGlobs", () => {
  const rule = (pattern: string, directory = "") => ({ pattern, directory, file: "/x/.exclude" });

  it("anchors rules to the folder of the exclusion file", () => {
    expect(ruleToGlobs(rule("draft.md", "guide"))).toEqual(["guide/draft.md", "guide/draft.md/**"]);
    expect(ruleToGlobs(rule("draft/", "guide"))).toEqual(["guide/draft/**"]);
    expect(ruleToGlobs(rule("internal-*.md"))).toEqual(["internal-*.md", "internal-*.md/**"]);
    expect(ruleToGlobs(rule("./notes/"))).toEqual(["notes/**"]);
  });

  it("turns `.` into the whole folder", () => {
    expect(ruleToGlobs(rule(".", "a/b"))).toEqual(["a/b/**"]);
    expect(ruleToGlobs(rule("."))).toEqual(["**"]);
  });

  it("escapes glob characters in folder names", () => {
    expect(ruleToGlobs(rule("x/", "a (old)/[v1]"))).toEqual(["a \\(old\\)/\\[v1\\]/x/**"]);
  });

  it("skips rules that cannot be expressed, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(ruleToGlobs(rule("../other/"))).toEqual([]);
    expect(ruleToGlobs(rule("a/../../b"))).toEqual([]);
    expect(ruleToGlobs(rule("!keep.md"))).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
});

describe("excludeSrc", () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vpe-")));
    write(root, "index.md");
    write(root, "guide/index.md");
    write(root, "guide/draft.md");
    write(root, "guide/internal-notes.md");
    write(root, "guide/downloads/readme.md");
    write(root, "guide/deep/internal-x.md");
    write(root, "secret/index.md");
    write(root, "secret/more/page.md");
    write(root, "todo.md");
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("returns no globs without exclusion files", async () => {
    expect(excludeSrc(root)).toEqual([]);
    expect(await pages(root, excludeSrc(root))).toHaveLength(9);
  });

  it("keeps excluded files out of the pages VitePress finds", async () => {
    write(root, ".exclude", "# root rules\n\ntodo.md\r\n");
    write(root, "guide/.exclude", "draft.md\ninternal-*.md\ndownloads\n");
    write(root, "secret/.exclude", ".\n");

    expect(await pages(root, excludeSrc(root))).toEqual([
      "guide/deep/internal-x.md",
      "guide/index.md",
      "index.md",
    ]);
  });

  it("supports `**` for any depth", async () => {
    write(root, "guide/.exclude", "**/internal-*.md\n");
    expect(await pages(root, excludeSrc(root))).not.toContain("guide/deep/internal-x.md");
  });

  it("reads custom filenames and skips hidden folders and node_modules", () => {
    write(root, "guide/.hide", "draft.md");
    write(root, ".vitepress/.hide", "x.md");
    write(root, "node_modules/pkg/.hide", "x.md");
    expect(findExcludeFiles(root, { excludeFilenames: [".hide"] })).toEqual([
      path.join(root, "guide/.hide"),
    ]);
    expect(excludeSrc(root, { excludeFilenames: [".hide"] })).toEqual([
      "guide/draft.md",
      "guide/draft.md/**",
    ]);
  });

  it("logs what it found when verbose", () => {
    write(root, "guide/.exclude", "draft.md");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    excludeSrc(root, { verbose: true });
    expect(log.mock.calls.flat().join("\n")).toContain("srcExclude: guide/draft.md");
    log.mockRestore();
  });
});
