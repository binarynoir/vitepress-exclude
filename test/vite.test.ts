import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Plugin } from "vite";
import { excludeVitePlugin } from "../src/vite.js";

describe("excludeVitePlugin", () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "vpe-vite-")));
    fs.mkdirSync(path.join(root, "guide"));
    fs.writeFileSync(path.join(root, "guide/.exclude"), "draft.md");
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  function setup(options = {}) {
    const site = { srcDir: root, configDeps: ["/project/.vitepress/config.mts"] };
    const plugin = excludeVitePlugin(options);
    (plugin.configResolved as (c: unknown) => void)({ vitepress: site });
    const hotUpdate = (file: string) =>
      (plugin.hotUpdate as (ctx: { file: string }) => void)({ file });
    return { plugin, site, hotUpdate };
  }

  it("runs only in dev, ahead of VitePress", () => {
    const plugin: Plugin = excludeVitePlugin();
    expect(plugin.apply).toBe("serve");
    expect(plugin.enforce).toBe("pre");
  });

  it("registers existing exclusion files as config dependencies", () => {
    const { site } = setup();
    expect(site.configDeps).toEqual(["/project/.vitepress/config.mts", `${root}/guide/.exclude`]);
  });

  it("registers a new exclusion file once, when it appears", () => {
    const { site, hotUpdate } = setup();
    hotUpdate(`${root}/new/.exclude`);
    hotUpdate(`${root}/new/.exclude`);
    expect(site.configDeps.filter((file) => file === `${root}/new/.exclude`)).toHaveLength(1);
  });

  it("ignores other files and files outside the source directory", () => {
    const { site, hotUpdate } = setup();
    hotUpdate(`${root}/guide/page.md`);
    hotUpdate("/elsewhere/.exclude");
    expect(site.configDeps).toHaveLength(2);
  });

  it("honors custom filenames", () => {
    const { site, hotUpdate } = setup({ excludeFilenames: [".hide"] });
    expect(site.configDeps).toHaveLength(1);
    hotUpdate(`${root}/guide/.exclude`);
    hotUpdate(`${root}/guide/.hide`);
    expect(site.configDeps).toEqual(["/project/.vitepress/config.mts", `${root}/guide/.hide`]);
  });

  it("does nothing outside VitePress", () => {
    const plugin = excludeVitePlugin();
    (plugin.configResolved as (c: unknown) => void)({});
    expect(() =>
      (plugin.hotUpdate as (ctx: { file: string }) => void)({ file: "/a/.exclude" }),
    ).not.toThrow();
  });
});
