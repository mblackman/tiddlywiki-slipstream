# Slipstream

A modern, distraction-free workspace and responsive layout for **[TiddlyWiki](https://tiddlywiki.com)** (v5.4.0+).

[![CI](https://github.com/mblackman/tiddlywiki-slipstream/actions/workflows/ci.yml/badge.svg)](https://github.com/mblackman/tiddlywiki-slipstream/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/mblackman/tiddlywiki-slipstream?color=blue)](https://github.com/mblackman/tiddlywiki-slipstream/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Demo-Interactive%20Preview-brightgreen)](https://mblackman.github.io/tiddlywiki-slipstream/)

Slipstream transforms TiddlyWiki into a polished, modern note-taking experience inspired by tools like Craft, Capacities, Obsidian, and Nicolas Petton's Notebook theme.

👉 **[Try the Live Demo](https://mblackman.github.io/tiddlywiki-slipstream/)**

---

## Why Slipstream?

* 📖 **Distraction-Free Writing**: Notes stay centered at a comfortable reading width so your eyes don't get tired scanning wide desktop monitors.
* 🧭 **3-Column Desktop Workspace**: Keep your navigation on the left, your writing in the center, and contextual info on the right. Both side panels collapse smoothly whenever you want total focus.
* 🔍 **Right Context Inspector**: Stay in flow with instant access to backlinks, an auto-generated table of contents with jump links, and an inline field manager for the note you're reading.
* 📱 **First-Class Mobile Experience**: Automatically adapts to phones with smooth single-note focus, a swipeable switcher for open notes, and thumb-friendly bottom navigation.
* ↔️ **Wide Mode for Dashboards**: Tag any note `Wide` to expand it into a full-width canvas for dashboards, kanban boards, and gallery grids.
* 🧩 **Drop-in UI Primitives**: Build clean dashboards easily using built-in widgets for auto-fitting grids, cards, progress bars, and header banners.
* 🎨 **Works with Any Palette**: Adapts automatically to light, dark, and community color palettes with zero contrast or readability issues.
* 🧼 **Zero CSS Bleed**: Completely self-contained. Switch back and forth between Slipstream and standard TiddlyWiki layouts without breaking your wiki's styles.

---

## Installation

### Drag & Drop (Fastest)
1. Open your TiddlyWiki in a browser.
2. Open the [Live Demo](https://mblackman.github.io/tiddlywiki-slipstream/) or grab `slipstream.tid` from the [Latest Release](https://github.com/mblackman/tiddlywiki-slipstream/releases/latest).
3. Drag and drop the plugin file into your wiki, click **Import**, and save & reload.

### Node.js Edition
Clone into your wiki's `plugins` folder:
```bash
git clone https://github.com/mblackman/tiddlywiki-slipstream.git plugins/mblackman/slipstream
```
And add `"mblackman/slipstream"` to the `plugins` list in your `tiddlywiki.info`.

---

## Quick Tips

* **Pin shortcuts**: Tag any note with `$:/tags/Pinned` to pin it to your Left Navigation rail.
* **Make a note wide**: Add the tag `Wide` (or field `page-width: wide`) to any dashboard, table, or hub.
* **Toggle panels**: Use `☰` to toggle the navigation rail, and click `Context` to toggle the inspector.
* **Customize**: Open **$:/ControlPanel** > **Settings** > **Slipstream** to tweak reading widths, filters, and mobile options.

---

## Development

```bash
npm install        # Install dependencies
npm test           # Run automated test suite
npm run dev        # Start live-reloading dev server (http://127.0.0.1:8080)
npm run build-all  # Build plugin, demo wiki, and release assets
```

## License

MIT © [Matt Blackman](https://github.com/mblackman)
