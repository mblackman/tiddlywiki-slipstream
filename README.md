# Slipstream — Modern 3-Column & Mobile Zoomin Layout for TiddlyWiki v5.4.0+

**Slipstream** (`$:/plugins/mblackman/slipstream`) is a modern, cross-device layout and UI primitive plugin for **[TiddlyWiki v5.4.0+](https://tiddlywiki.com/static/Release%25205.4.0.html)** inspired by Nicolas Petton's [Notebook Theme](https://tiddlywiki.com/static/%2522Notebook%2520theme%2522%2520by%2520Nicolas%2520Petton.html), [Obsidian](https://obsidian.md/), [Capacities](https://capacities.io/), and [Craft](https://www.craft.do/).

## Highlights

- **3-Column Desktop Workspace (`>= 1024px`)**: Pairs a collapsible **Left Navigation Rail** and a **Right Context Inspector** (bound to `{$:/HistoryList!!current-tiddler}`) with a distraction-free `72ch` centered reading column.
- **Wide Breakout Mode (`1180px`)**: Any tiddler with `page-width: wide` or tagged `Wide` expands automatically from `72ch` to `1180px` for multi-column dashboards and galleries.
- **Single-Tiddler Mobile `zoomin` Experience (`< 1024px`)**: Automatically switches the story river to `zoomin` on mobile viewports, adding a horizontal open-tiddler switcher pill strip, a thumb-zone bottom bar, and a slide-up bottom action sheet (`$:/tags/ViewToolbar`).
- **Native TiddlyWiki v5.4.0+ Vanilla CSS & Custom Widgets**: Uses core `--tpc-*` palette variables and `--tp-*` metric variables in pure `text/css`, and provides global `<$ss.hero>`, `<$ss.grid>`, `<$ss.card>`, `<$ss.prop-pill>`, and `<$ss.progress>` widgets.
- **100% Generic & Tag/Config Driven**: No hardcoded dashboard titles—everything is driven by standard tags (`$:/tags/Pinned`, `$:/tags/Slipstream/BottomBar`, `$:/tags/Slipstream/LeftNav`, `$:/tags/Slipstream/InspectorTab`, `Wide`) and `$:/config/slipstream/*` settings.

---

## Development & Verification

```bash
# Install dependencies (TiddlyWiki v5.4.1, esbuild, Jest)
npm install

# Run automated tests (TiddlyWiki v5.4.1 boot, shadow tiddlers, theme invariants, layout rendering)
npm test

# Start live-reloading development wiki on http://127.0.0.1:8080
npm run dev

# Build distributable plugin (build/slipstream.tid, build/slipstream-plugin.json, dist/slipstream-plugin.json),
# standalone demo wiki (build/index.html), and CPL plugin library (build/library/)
npm run build-all
```

---

## Repository Structure

| Path | Purpose |
| :--- | :--- |
| `plugins/mblackman/slipstream/` | Unpacked TiddlyWiki plugin source (`plugin.info`, `ui/`, `styles/`, `templates/`, `widgets/`, `settings.tid`) |
| `demo/` | Pre-seeded TiddlyWiki v5.4.1 demo wiki with Slipstream active and sample dashboards/notes |
| `tests/slipstream.test.js` | Jest test suite verifying plugin boot, shadow tiddlers, CSS invariants, and HTML rendering |
| `scripts/dev.js` | Live file-watching TiddlyWiki development server (`http://127.0.0.1:8080`) |
| `scripts/build-plugin.js` | Production plugin builder with `esbuild` CSS minification |
| `examples/starter-dashboards.json` | Optional importable user-space dashboards (`Journal Dashboard`, `Project Dashboard`, `Media Hub`) |
| `studio/modern_notebook_theme_studio.html` | Standalone interactive theme preview studio |
| `docs/tiddlywiki_v54_theme_architecture_plan.md` | Architectural blueprint and design specification |
