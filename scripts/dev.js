#!/usr/bin/env node
/**
 * Live development server for Slipstream ($:/plugins/mblackman/slipstream).
 * Watches plugins/mblackman/slipstream/ and automatically restarts the TiddlyWiki
 * server on port 8080 when plugin source files change.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const pluginDir = path.join(rootDir, "plugins", "mblackman", "slipstream");
const demoDir = path.join(rootDir, "demo");
const debugDir = path.join(rootDir, "debug");
const port = process.env.PORT || "8080";

let tiddlyWikiProcess = null;
let debounceTimer = null;

function ensureDebugWiki() {
  if (!fs.existsSync(debugDir)) {
    fs.cpSync(demoDir, debugDir, { recursive: true });
  }
}

function startServer() {
  if (tiddlyWikiProcess) return;
  ensureDebugWiki();
  console.log(`🌐 Starting Slipstream dev server on http://127.0.0.1:${port} ...`);
  tiddlyWikiProcess = spawn(
    "npx",
    ["tiddlywiki", "debug", "--listen", `port=${port}`, "host=127.0.0.1"],
    {
      stdio: "inherit",
      cwd: rootDir,
      env: { ...process.env, TIDDLYWIKI_PLUGIN_PATH: "plugins" },
    }
  );

  tiddlyWikiProcess.on("exit", () => {
    tiddlyWikiProcess = null;
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!tiddlyWikiProcess) {
      resolve();
      return;
    }
    tiddlyWikiProcess.once("exit", () => {
      tiddlyWikiProcess = null;
      resolve();
    });
    tiddlyWikiProcess.kill("SIGTERM");
    setTimeout(() => {
      if (tiddlyWikiProcess) tiddlyWikiProcess.kill("SIGKILL");
    }, 1000);
  });
}

async function restartServer() {
  await stopServer();
  startServer();
}

startServer();

console.log(`👀 Watching ${pluginDir} for changes...`);
fs.watch(pluginDir, { recursive: true }, (eventType, filename) => {
  if (!filename || filename.startsWith(".")) return;
  console.log(`📝 Change detected in ${filename} (${eventType}) — restarting server...`);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    restartServer();
  }, 250);
});

const shutdown = async () => {
  await stopServer();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
