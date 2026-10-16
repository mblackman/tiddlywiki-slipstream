# Slipstream — Modern 3-Column & Mobile Layout for TiddlyWiki v5.4.0+

[![CI](https://github.com/mblackman/tiddlywiki-slipstream/actions/workflows/ci.yml/badge.svg)](https://github.com/mblackman/tiddlywiki-slipstream/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/mblackman/tiddlywiki-slipstream?color=blue)](https://github.com/mblackman/tiddlywiki-slipstream/releases)
[![TiddlyWiki Version](https://img.shields.io/badge/TiddlyWiki-%3E%3D5.4.0-darkgreen.svg)](https://tiddlywiki.com/static/Release%25205.4.0.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Demo-Interactive%20Wiki-brightgreen)](https://mblackman.github.io/tiddlywiki-slipstream/)

**Slipstream** (`$:/plugins/mblackman/slipstream`) is a modern, responsive page layout theme and UI component toolkit for **[TiddlyWiki v5.4.0+](https://tiddlywiki.com/static/Release%25205.4.0.html)**.

Inspired by modern note-taking workspaces like [Craft](https://www.craft.do/), [Capacities](https://capacities.io/), [Obsidian](https://obsidian.md/), and Nicolas Petton's iconic [Notebook Theme](https://tiddlywiki.com/static/%2522Notebook%2520theme%2522%2520by%2520Nicolas%2520Petton.html), Slipstream provides an ergonomic 3-column desktop workspace, a fluid single-tiddler mobile experience, dynamic wide breakout views, and reusable UI widgets.

👉 **[Launch Interactive Live Demo](https://mblackman.github.io/tiddlywiki-slipstream/)**

---

## ✨ Features

### 🖥️ 3-Column Desktop Workspace (`>= 1024px`)
* **Collapsible Left Navigation Rail**: Access your pinned dashboard notes, active story river list, recent history, and extensible sidebar sections with smooth collapse animation (`⌥` shortcut or `☰` button).
* **Distraction-Free Reading Column**: Standard prose notes remain centered at an ergonomic measure of `72ch` (`840px`), eliminating eye fatigue on ultra-wide desktop monitors.
* **Context-Aware Right Inspector**: Stays synchronized with the focused note (`{$:/HistoryList!!current-tiddler}`) and provides:
  * **Backlinks**: Instant real-time view of incoming references.
  * **Document Outline**: Automatic hierarchical table of contents (`!`, `!!`, `!!!`) with smooth jump scrolling.
  * **Fields Manager**: Inspect, edit, add, and remove tiddler fields inline without entering edit mode.
  * **Extensible Tabs**: Add custom inspector views simply by tagging tiddlers with `$:/tags/Slipstream/InspectorTab`.

### 📱 Fluid Mobile `fade` Experience (`< 1024px`)
* **Single-Tiddler Focus**: Seamlessly transitions from desktop multi-column view to an uncluttered single-tiddler reading mode with hardware-accelerated cross-fading.
* **Per-Note Scroll Restoration**: Remembers your exact reading position when switching back and forth between open tiddlers.
* **Horizontal Switcher Strip**: Swipe through open tiddlers from a pinned top pill bar.
* **Thumb-Zone Bottom Navigation**: Fast access to core navigation, search, and creation from comfortable lower screen reach. Contextually switches between reading and editing modes.
* **Slide-Up Action Sheet**: Clean bottom sheet drawer for note toolbar actions (`$:/tags/ViewToolbar`).

### ↔️ Dynamic Wide Breakout Layout (`1120px`)
* Dashboards, kanban boards, media hubs, and data tables automatically expand from standard reading width (`840px`) to full container width (`1120px`).
* Trigger wide breakout on any note by tagging it `Wide` or adding the field `page-width: wide`.

### 🧩 UI Primitives Toolkit
Included out-of-the-box via global custom widgets (`$:/tags/Global`):
* `<$ss.hero title="..." subtitle="..." />`: Showcase hero headers for dashboards and indexes.
* `<$ss.grid min="240px">`: Responsive CSS Grid that auto-fits columns according to viewport size.
* `<$ss.card badge="..." accent="...">`: Clean surface containers with subtle borders and hover elevation.
* `<$ss.prop-pill name="..." value="..." />`: Metadata property badges (supports static attributes or dynamic tiddler fields with select options).
* `<$ss.progress value="..." total="..." />`: Adaptive progress bars with percentage calculations.

### 🎨 Native Design Tokens & Zero CSS Bleed
* **Zero Global CSS Leakage**: Every stylesheet rule is strictly scoped under `.mn-app-shell`. Switch seamlessly between Slipstream and any other TiddlyWiki theme with `Ctrl+Shift+L` with zero style collisions or broken core layouts.
* **Palette Agnostic**: 100% of theme colors derive directly from native TiddlyWiki v5.4.0 `--tpc-*` CSS variables, ensuring perfect contrast across light, dark, and custom palettes.
* **100% Generic & Configurable**: No hardcoded personal titles or rigid opinions. Everything is driven by tags (`$:/tags/Pinned`, `$:/tags/Slipstream/LeftNav`, etc.) and configuration tiddlers in `$:/config/slipstream/*`.

---

## 📦 Installation

### Method 1: Drag & Drop (Easiest)
1. Open your TiddlyWiki (v5.4.0 or newer) in your web browser.
2. Open the [Live Demo](https://mblackman.github.io/tiddlywiki-slipstream/) or the [Latest Release](https://github.com/mblackman/tiddlywiki-slipstream/releases/latest).
3. Drag the plugin link or `slipstream.tid` / `slipstream-plugin.json` file into your TiddlyWiki window.
4. Click **Import** in the import modal.
5. Save and reload your wiki. Slipstream activates automatically!

### Method 2: Manual Plugin Import
1. Download `slipstream-plugin.json` or `slipstream.tid` from [Releases](https://github.com/mblackman/tiddlywiki-slipstream/releases).
2. In your wiki, go to **$:/ControlPanel** > **Plugins** and drag the file onto the window.
3. Save and reload.

### Method 3: Node.js Edition
Clone or symlink the plugin directory into your wiki's `plugins` folder:
```bash
cd my-wiki/plugins
git clone https://github.com/mblackman/tiddlywiki-slipstream.git mblackman/slipstream
```
Add `"mblackman/slipstream"` to the `plugins` array in your `tiddlywiki.info` file:
```json
{
  "plugins": [
    "tiddlywiki/tiddlyweb",
    "tiddlywiki/filesystem",
    "mblackman/slipstream"
  ]
}
```

---

## 🛠️ Customization & Usage

### Pinned Navigation Shortcuts
Pin any note or hub to the Left Navigation Rail:
1. Tag your note with `$:/tags/Pinned`.
2. (Optional) Add a `caption` field for display text.
3. (Optional) Add an `ss-icon` or `icon` field (e.g. `🗂️`, `✍️`, `🎯`).
4. Reorder items in `$:/ControlPanel` > **Appearance** > **Toolbars** or directly inside [[$:/tags/Pinned]].

### Custom Inspector Tabs
Add custom tabs to the Right Context Inspector:
1. Create a tiddler with your custom analysis or backlinks filter.
2. Tag it `$:/tags/Slipstream/InspectorTab`.
3. Add a `caption` field (e.g. `Tasks`, `History`, `Graph`).

### Settings Panel
Configure reading widths, wide breakout width, mobile breakpoints, and custom filters in:
`$:/ControlPanel` > **Settings** > **Slipstream** (or `$:/plugins/mblackman/slipstream/settings`).

---

## 💻 Development & Testing

Requirements: [Node.js](https://nodejs.org/) (v18+)

```bash
# Clone the repository
git clone https://github.com/mblackman/tiddlywiki-slipstream.git
cd tiddlywiki-slipstream

# Install dependencies
npm install

# Run automated tests (verifies boot, shadow tiddlers, theme invariants, zero-bleed CSS, layout rendering)
npm test

# Launch live-reloading dev server on http://127.0.0.1:8080
npm run dev

# Build distributable plugin bundle, standalone demo wiki, and CPL plugin library
npm run build-all
```

### Build Artifacts
Running `npm run build-all` generates:
* `build/slipstream.tid` — Single-tiddler plugin distribution
* `build/slipstream-plugin.json` — Plugin bundle JSON
* `dist/slipstream-plugin.json` — Production distribution release
* `build/index.html` — Standalone offline demo wiki for GitHub Pages preview
* `build/library/` — CPL (Community Plugin Library) metadata and index

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Matt Blackman.
