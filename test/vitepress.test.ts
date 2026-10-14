import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { UserConfig } from "vitepress";
import { withExclude } from "../src/vitepress.js";

describe("withExclude", () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vpe-config-")));
    fs.mkdirSync(path.join(root, "guide"));
    fs.writeFileSync(path.join(root, "guide/.exclude"), "draft/");
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("adds srcExclude and the Vite plugin to an empty config", () => {
    const config = withExclude({}, root);
    expect(config.srcExclude).toEqual(["guide/draft/**"]);
    expect(config.vite?.plugins).toHaveLength(1);
  });

  it("keeps existing srcExclude (string or array) and plugins", () => {
    const other = { name: "other" };
    const config = withExclude(
      { srcExclude: "**/_snippets/**", vite: { plugins: [other] } } as unknown as UserConfig,
      root,
    );
    expect(config.srcExclude).toEqual(["**/_snippets/**", "guide/draft/**"]);
    expect(config.vite?.plugins?.[0]).toBe(other);
    expect(config.vite?.plugins).toHaveLength(2);
  });
});
