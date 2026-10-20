import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { glob } from "tinyglobby";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { excludeSrc, findFrontmatterExcludedPages, isExcludedByFrontmatter } from "../src/index.js";

function write(root: string, file: string, content: string) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

/** The pages VitePress would build: the same glob call as its `resolvePages`. */
function pages(srcDir: string, srcExclude: string[]) {
  return glob(["**/*.md"], { cwd: srcDir, ignore: srcExclude }).then((files) => files.sort());
}

const page = (frontmatter: string) => `---\n${frontmatter}\n---\n\n# Page\n`;

describe("isExcludedByFrontmatter", () => {
  it("excludes a page whose key is true", () => {
    expect(isExcludedByFrontmatter(page("draft: true"), ["draft"])).toBe(true);
  });

  it("reads nested keys with dots", () => {
    expect(isExcludedByFrontmatter(page("blog:\n  draft: true"), ["blog.draft"])).toBe(true);
    expect(isExcludedByFrontmatter(page("blog:\n  draft: true"), ["draft"])).toBe(false);
  });

  it.each([
    ["draft: false"],
    ['draft: "true"'],
    ["draft: yes"],
    ["title: draft"],
    ["drafts: true"],
  ])("does not exclude %s", (frontmatter) => {
    expect(isExcludedByFrontmatter(page(frontmatter), ["draft"])).toBe(false);
  });

  it("ignores pages without frontmatter, invalid YAML, and no keys", () => {
    expect(isExcludedByFrontmatter("draft: true\n# Page", ["draft"])).toBe(false);
    expect(isExcludedByFrontmatter(page("draft: [true"), ["draft"])).toBe(false);
    expect(isExcludedByFrontmatter(page("draft: true"), [])).toBe(false);
  });
});

describe("excludeFrontmatter", () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vpe-fm-")));
    write(root, "index.md", "# Home");
    write(root, "guide/ready.md", page("title: Ready"));
    write(root, "guide/draft.md", page("draft: true"));
    write(root, "blog/post.md", page("blog:\n  date: 2026-10-20"));
    write(root, "blog/unfinished.md", page("blog:\n  draft: true"));
    write(root, "blog/[weird] name (1).md", page("draft: true"));
    write(root, ".vitepress/theme/draft.md", page("draft: true"));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("is off by default", async () => {
    expect(findFrontmatterExcludedPages(root)).toEqual([]);
    expect(excludeSrc(root)).toEqual([]);
  });

  it("finds the pages to exclude, skipping hidden folders and node_modules", () => {
    write(root, "node_modules/pkg/draft.md", page("draft: true"));
    expect(
      findFrontmatterExcludedPages(root, { excludeFrontmatter: ["draft", "blog.draft"] }),
    ).toEqual(["blog/[weird] name (1).md", "blog/unfinished.md", "guide/draft.md"]);
  });

  it("keeps those pages out of the pages VitePress finds, even with glob characters in their names", async () => {
    const srcExclude = excludeSrc(root, { excludeFrontmatter: ["draft", "blog.draft"] });
    expect(await pages(root, srcExclude)).toEqual(["blog/post.md", "guide/ready.md", "index.md"]);
  });

  it("works alongside .exclude files", async () => {
    write(root, "guide/.exclude", "ready.md\n");
    const srcExclude = excludeSrc(root, { excludeFrontmatter: ["draft"] });
    expect(await pages(root, srcExclude)).toEqual([
      "blog/post.md",
      "blog/unfinished.md",
      "index.md",
    ]);
  });
});
