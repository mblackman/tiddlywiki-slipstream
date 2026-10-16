#!/usr/bin/env node
/**
 * Builds the Slipstream plugin ($:/plugins/mblackman/slipstream) using TiddlyWiki v5.4.1
 * and minifies embedded CSS in the output artifacts (build/slipstream.tid,
 * build/slipstream-plugin.json, and dist/slipstream-plugin.json) without modifying source files.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const esbuild = require("esbuild");

const ROOT_DIR = path.resolve(__dirname, "..");
const PLUGIN_SRC = path.join(ROOT_DIR, "plugins", "mblackman", "slipstream");
const BUILD_DIR = path.join(ROOT_DIR, "build");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const CSS_PATH = path.join(PLUGIN_SRC, "styles", "core.css");

function main() {
  const originalCss = fs.readFileSync(CSS_PATH, "utf8");

  try {
    // Minify CSS in-place temporarily during official TiddlyWiki build, then restore source
    const minified = esbuild.transformSync(originalCss, {
      loader: "css",
      minify: true,
    });
    fs.writeFileSync(CSS_PATH, minified.code, "utf8");

    fs.mkdirSync(BUILD_DIR, { recursive: true });
    fs.mkdirSync(DIST_DIR, { recursive: true });

    execSync(
      "npx cross-env TIDDLYWIKI_PLUGIN_PATH=plugins tiddlywiki demo --output build --build slipstream",
      { stdio: "inherit", cwd: ROOT_DIR }
    );

    // Format slipstream-plugin.json as a drag-and-drop array bundle in dist/ as well
    const rawJsonPath = path.join(BUILD_DIR, "slipstream-plugin.json");
    if (fs.existsSync(rawJsonPath)) {
      const pluginObj = JSON.parse(fs.readFileSync(rawJsonPath, "utf8"));
      const dragDropBundle = Array.isArray(pluginObj) ? pluginObj : [pluginObj];
      fs.writeFileSync(
        path.join(DIST_DIR, "slipstream-plugin.json"),
        JSON.stringify(dragDropBundle, null, 2),
        "utf8"
      );
    }

    console.log(
      "✅ Built build/slipstream.tid, build/slipstream-plugin.json, and dist/slipstream-plugin.json"
    );
  } finally {
    // Always restore readable source CSS
    fs.writeFileSync(CSS_PATH, originalCss, "utf8");
  }
}

main();
