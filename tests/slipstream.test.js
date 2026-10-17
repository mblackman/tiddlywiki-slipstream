const fs = require("fs");
const path = require("path");
const { TiddlyWiki } = require("tiddlywiki");

const ROOT_DIR = path.resolve(__dirname, "..");
const PLUGIN_DIR = path.join(ROOT_DIR, "plugins", "mblackman", "slipstream");

describe("Slipstream Plugin ($:/plugins/mblackman/slipstream)", () => {
  let $tw;

  beforeAll(() => {
    process.env.TIDDLYWIKI_PLUGIN_PATH = path.join(ROOT_DIR, "plugins");
    $tw = TiddlyWiki();
    $tw.boot.argv = [path.join(ROOT_DIR, "demo")];
    $tw.boot.boot();
    if ($tw.syncer) {
      if ($tw.syncer.pollTimerId) {
        clearInterval($tw.syncer.pollTimerId);
      }
      $tw.syncer.syncadaptor = { isReady: () => false };
    }
  });

  test("loads plugin manifest with TiddlyWiki >=5.4.0 requirement", () => {
    const pluginTiddler = $tw.wiki.getTiddler("$:/plugins/mblackman/slipstream");
    expect(pluginTiddler).toBeDefined();
    expect(pluginTiddler.fields.name).toBe("Slipstream");
    expect(pluginTiddler.fields["core-version"]).toBe(">=5.4.0");
    expect(pluginTiddler.fields["plugin-type"]).toBe("plugin");
    expect(pluginTiddler.fields.list).toEqual(["readme", "docs", "settings"]);
  });

  test("registers all expected shadow tiddlers", () => {
    const expectedShadows = [
      "$:/plugins/mblackman/slipstream/readme",
      "$:/plugins/mblackman/slipstream/docs",
      "$:/plugins/mblackman/slipstream/docs/primitives",
      "$:/plugins/mblackman/slipstream/docs/writing",
      "$:/plugins/mblackman/slipstream/docs/connections",
      "$:/plugins/mblackman/slipstream/docs/customization",
      "$:/plugins/mblackman/slipstream/settings",
      "$:/plugins/mblackman/slipstream/styles/core.css",
      "$:/plugins/mblackman/slipstream/templates/wide-body",
      "$:/plugins/mblackman/slipstream/ui/Layout",
      "$:/plugins/mblackman/slipstream/ui/LeftNav",
      "$:/plugins/mblackman/slipstream/ui/MobileBar",
      "$:/plugins/mblackman/slipstream/ui/MobilePillStrip",
      "$:/plugins/mblackman/slipstream/ui/ObjectPropertyHeader",
      "$:/plugins/mblackman/slipstream/ui/RightInspector",
      "$:/plugins/mblackman/slipstream/ui/TopBar",
      "$:/plugins/mblackman/slipstream/ui/WideViewWrapper",
      "$:/plugins/mblackman/slipstream/widgets/ui-primitives",
      "$:/plugins/mblackman/slipstream/storyviews/fade.js",
      "$:/plugins/mblackman/slipstream/startup/sync-history.js",
      "$:/config/ui/SideBar/More/horizontal",
      "$:/core/ui/SideBar/Open",
    ];

    for (const title of expectedShadows) {
      expect($tw.wiki.isShadowTiddler(title)).toBe(true);
    }
  });

  test("enforces Theme Invariant 1: 100% generic theme code (no hardcoded user dashboards in UI/templates)", () => {
    const uiFiles = [
      "ui/Layout.tid",
      "ui/TopBar.tid",
      "ui/LeftNav.tid",
      "ui/RightInspector.tid",
      "ui/MobileBar.tid",
      "ui/MobilePillStrip.tid",
      "ui/ObjectPropertyHeader.tid",
      "ui/WideViewWrapper.tid",
      "ui/open-tab.tid",
      "templates/wide-body.tid",
      "widgets/ui-primitives.tid",
      "styles/core.css",
    ];

    for (const relPath of uiFiles) {
      const content = fs.readFileSync(path.join(PLUGIN_DIR, relPath), "utf8");
      expect(content).not.toMatch(/Journal Dashboard|Project Dashboard|Media Hub/);
    }
  });

  test("enforces Theme Invariants 2 & 3: native v5.4.0 --tpc-* / --tp-* variables and strict z-index hierarchy", () => {
    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");
    expect(css).toContain("--tpc-page-background");
    expect(css).toContain("--tpc-background");
    expect(css).toContain("--tpc-foreground");
    expect(css).toContain("--tpc-primary");
    expect(css).toContain("--tp-tiddler-width");
    expect(css).toContain("--tp-animation-duration");

    // Verify z-index hierarchy
    expect(css).toMatch(/\.mn-topbar\s*\{[^}]*z-index:\s*420/s);
    expect(css).toMatch(/\.mn-mobile-pill-strip\s*\{[^}]*z-index:\s*410/s);
    expect(css).toMatch(/\.mn-mobile-bottombar\s*\{[^}]*z-index:\s*480/s);
    expect(css).toMatch(/\.mn-backdrop\s*\{[^}]*z-index:\s*520/s);

    // Ensure CSS is unlayered so it overrides TiddlyWiki's unlayered vanilla/snowwhite base themes
    expect(css).not.toContain("@layer");
    expect(css).toContain("width: min(100%, var(--mn-reading-width, 840px))");
  });

  test("renders desktop 3-column Slipstream Layout and custom widgets ($ss.hero, $ss.grid, $ss.card, $ss.prop-pill, $ss.progress)", () => {
    // Open DefaultTiddlers into $:/StoryList as TiddlyWiki startup does
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: "[[Welcome to Slipstream]] [[Knowledge Base]] [[Slipstream UI Primitives]]",
    });
    $tw.wiki.addTiddler({
      title: "$:/info/browser/window/system/main/client/width",
      text: "1440",
    });

    const html = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/Layout"
    );

    expect(html).not.toContain("Filter error");
    expect(html).toContain("mn-app-shell");
    expect(html).toContain("mn-is-desktop");
    expect(html).toContain("mn-topbar");
    expect(html).toContain("mn-workspace-grid");
    expect(html).toContain("mn-panel-left");
    expect(html).toContain("tc-page-controls");
    expect(html).toContain("mn-story-container");
    expect(html).toContain("mn-panel-right");

    // Verify Pinned Shortcuts in LeftNav rendered demo showcase notes
    expect(html).toContain("Welcome");
    expect(html).toContain("Index");
    expect(html).toContain("Components");

    // Verify custom widgets rendered inside the story river
    expect(html).toContain("mn-hero");
    expect(html).toContain("mn-grid");
    expect(html).toContain("mn-card");
    expect(html).toContain("mn-prop-pill");
    expect(html).toContain("mn-progress-track");

    // Verify clean desktop TopBar: center search & right inspector toggle present,
    // but no redundant New Note, settings cog, or mobile search button
    const topBarHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/TopBar"
    );
    expect(topBarHtml).toContain("mn-search-input");
    expect(topBarHtml).toContain("Toggle Right Context Inspector");
    expect(topBarHtml).not.toContain("+ New Note");
    expect(topBarHtml).not.toContain("Open Control Panel");
    expect(topBarHtml).not.toContain("Search notes");

    // Verify LeftNav pinned shortcuts settings button targets Slipstream settings tab in ControlPanel
    const leftNavText = $tw.wiki.getTiddlerText("$:/plugins/mblackman/slipstream/ui/LeftNav");
    expect(leftNavText).toContain("$:/core/ui/ControlPanel/Settings");
    expect(leftNavText).toContain("$:/plugins/mblackman/slipstream/settings");
  });

  test("switches to mobile fade mode with pill strip and bottom bar below 1024px", () => {
    $tw.wiki.addTiddler({
      title: "$:/info/browser/window/system/main/client/width",
      text: "390",
    });
    $tw.wiki.addTiddler({
      title: "$:/state/slipstream/mobile-action-sheet",
      text: "open",
    });

    const html = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/Layout"
    );

    expect(html).toContain("mn-is-mobile");
    expect(html).toContain("tc-page-view-fade");
    expect(html).toContain("mn-mobile-pill-strip");
    expect(html).toContain("mn-mobile-bottombar");
    expect(html).toContain("mn-bottom-sheet");
    expect(html).toContain("mn-backdrop-dismiss");
    expect(html).toContain("mn-bottom-sheet-header");
    // Ensure mobile navigation drawer is collapsed by default and overlay backdrop does not block screen
    expect(html).toContain("mn-left-collapsed");
    expect(html).not.toContain("mn-mobile-drawer-backdrop");

    // When drawer is explicitly opened, backdrop appears
    $tw.wiki.addTiddler({
      title: "$:/state/slipstream/left-panel",
      text: "yes",
    });
    const openHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/Layout"
    );
    expect(openHtml).toContain("mn-left-open");
    expect(openHtml).toContain("mn-mobile-drawer-backdrop");
    $tw.wiki.deleteTiddler("$:/state/slipstream/left-panel");
    $tw.wiki.deleteTiddler("$:/state/slipstream/mobile-action-sheet");

    const closedSheetHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/Layout"
    );
    expect(closedSheetHtml).not.toContain("mn-bottom-sheet");
  });

  test("configures mobile bottom sheet with fixed height and full touch-target action buttons", () => {
    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");
    // Ensure bottom sheet has fixed height (82dvh) so its top edge does not jump when switching tabs
    expect(css).toMatch(/\.mn-bottom-sheet\s*\{[^}]*height:\s*82dvh/s);
    expect(css).toMatch(/\.mn-bottom-sheet\s*\{[^}]*max-height:\s*82dvh/s);

    // Ensure uniform 2-column labeled layout on mobile
    expect(css).toMatch(/\.mn-sheet-action-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/s);
    expect(css).toMatch(/\.mn-sheet-action-item\s*\{[^}]*min-height:\s*48px/s);

    // Ensure hidden reveal spans are suppressed so they do not squish buttons
    expect(css).toMatch(/\.mn-sheet-action-item \[hidden\][^}]*display:\s*none !important/s);

    // Ensure action grid buttons fill entire item container as full clickable touch targets
    expect(css).toMatch(/\.mn-sheet-action-item button\s*\{[^}]*width:\s*100%/s);
    expect(css).toMatch(/\.mn-sheet-action-item button\s*\{[^}]*min-height:\s*48px/s);
    expect(css).toMatch(/\.mn-sheet-action-item button svg\s*\{[^}]*pointer-events:\s*none/s);
    expect(css).toMatch(/\.mn-sheet-action-item button \.tc-btn-text/s);
  });

  test("renders WideViewWrapper cascade for tiddlers tagged Wide or with page-width=wide", () => {
    const wideHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/core/ui/StoryTiddlerTemplate",
      { variables: { currentTiddler: "Knowledge Base" } }
    );
    expect(wideHtml).toContain("mn-wide-view");
  });

  test("registers fade storyview module and suppresses zoom transforms in core.css", () => {
    const views = {};
    $tw.modules.applyMethods("storyview", views);
    expect(typeof views.fade).toBe("function");

    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");
    expect(css).toMatch(/\.mn-is-mobile \.tc-tiddler-frame\s*\{[^}]*transform:\s*none !important;/s);
    expect(css).toContain("mn-tiddler-fading-out");
    expect(css).toContain("mn-tiddler-fading-in");
  });

  test("styles floating drafts indicator as a modern pill on desktop and clears mobile bottom bar", () => {
    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");
    // Ensure drafts container is fixed, centered, and above river content
    expect(css).toMatch(/\.tc-drafts-list\s*\{[^}]*position:\s*fixed/s);
    expect(css).toMatch(/\.tc-drafts-list\s*\{[^}]*left:\s*50%/s);
    expect(css).toMatch(/\.tc-drafts-list\s*\{[^}]*transform:\s*translateX\(-50%\)/s);

    // Ensure draft links have pill radius, minimum touch target, and theme tokens
    expect(css).toMatch(/\.tc-drafts-list a\s*\{[^}]*border-radius:\s*var\(--mn-radius-pill\)/s);
    expect(css).toMatch(/\.tc-drafts-list a\s*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.tc-drafts-list a\s*\{[^}]*background:\s*var\(--mn-bg-surface\)/s);

    // Ensure mobile rule floats above the mobile bottom bar
    expect(css).toMatch(/\.tc-drafts-list\s*\{[^}]*bottom:\s*calc\(var\(--mn-bottombar-height\)/s);
  });

  test("updates desktop open tiddler title when deleting or closing the focused note", () => {
    // Set up StoryList with Note A and Note B, with Note A focused
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: "[[Note A]] [[Note B]]",
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "Note A",
    });
    $tw.wiki.addTiddler({
      title: "$:/info/browser/window/system/main/client/width",
      text: "1440",
    });

    // Helper function to evaluate .active-tiddler in widget context
    const getActiveTiddler = () =>
      $tw.wiki
        .renderText(
          "text/plain",
          "text/vnd.tiddlywiki",
          "\\import [[$:/plugins/mblackman/slipstream/ui/TopBar]]\n<<.active-tiddler>>"
        )
        .trim();

    // Verify .active-tiddler() returns Note A
    expect(getActiveTiddler()).toBe("Note A");

    let topBarHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/TopBar"
    );
    expect(topBarHtml).toContain("Note A");

    // Simulate deleting Note A (Note A is removed from wiki & StoryList, but HistoryList is stale)
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: "[[Note B]]",
    });
    $tw.wiki.deleteTiddler("Note A");

    // .active-tiddler() falls back to the next open note in StoryList (Note B)
    expect(getActiveTiddler()).toBe("Note B");

    topBarHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/TopBar"
    );
    expect(topBarHtml).not.toContain("Note A");
    expect(topBarHtml).toContain("Note B");

    // Simulate closing all tiddlers (empty StoryList)
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: "",
    });
    expect(getActiveTiddler()).toBe("");

    topBarHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/TopBar"
    );
    expect(topBarHtml).not.toContain("mn-breadcrumb-current");
  });

  test("renders tiddler dropdown menu (.tc-drop-down) as a clean vertical list without squished buttons", () => {
    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");

    // Ensure icon button 30px constraint excludes dropdown buttons
    expect(css).toMatch(/\.mn-story-container \.tc-tiddler-controls button:not\(\.tc-drop-down button\)/);

    // Ensure hidden dropdown elements are strictly suppressed
    expect(css).toMatch(/\.tc-drop-down\[hidden\][^}]*display:\s*none !important/s);

    // Ensure .tc-drop-down is flex column with elevated card radius and shadow under .mn-app-shell
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*display:\s*flex/s);
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*flex-direction:\s*column/s);
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*min-width:\s*220px/s);
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*border-radius:\s*var\(--mn-radius-card\)/s);

    // Ensure dropdown buttons have 100% width, full touch target, and inline alignment
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down button,\s*(?:\.mn-app-shell\s+)?\.tc-drop-down a\s*\{[^}]*width:\s*100% !important/s);
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down button,\s*(?:\.mn-app-shell\s+)?\.tc-drop-down a\s*\{[^}]*min-height:\s*32px !important/s);
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down button,\s*(?:\.mn-app-shell\s+)?\.tc-drop-down a\s*\{[^}]*display:\s*flex !important/s);

    // Ensure dropdown button icons and text are properly dimensioned and inline
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down button svg,\s*(?:\.mn-app-shell\s+)?\.tc-drop-down a svg\s*\{[^}]*width:\s*15px !important/s);
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down \.tc-btn-text\s*\{[^}]*display:\s*inline !important/s);

    // Ensure reveal containers inside dropdown expand to full width
    expect(css).toMatch(/(?:\.mn-app-shell\s+)?\.tc-drop-down \.tc-reveal:not\(\[hidden\]\)\s*\{[^}]*display:\s*block/s);

    // Ensure tiddler frame with open dropdown is elevated above sibling tiddler frames
    expect(css).toMatch(/\.tc-tiddler-frame:has\(\.tc-drop-down:not\(\[hidden\]\)\)[^}]*z-index:\s*50/s);
  });

  test("properly formats LeftNav sidebar menus, page controls dropdowns, tools items, and workspace tabs", () => {
    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");

    // Ensure page controls 32px constraint excludes dropdown buttons and SVGs
    expect(css).toMatch(/\.mn-page-controls \.tc-page-controls button:not\(\.tc-drop-down button\)/);
    expect(css).toMatch(/\.mn-page-controls \.tc-page-controls svg:not\(\.tc-drop-down svg\)/);

    // Ensure LeftNav header allows dropdown menus to overflow visibly past the sidebar
    expect(css).toMatch(/\.mn-panel-left\s*\{[^}]*overflow:\s*visible !important/s);
    expect(css).toMatch(/\.mn-panel-left \.mn-panel-left-header\s*\{[^}]*overflow:\s*visible !important/s);
    expect(css).toMatch(/\.mn-panel-left \.mn-panel-left-body\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.mn-panel-left \.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*min-width:\s*240px !important/s);
    expect(css).toMatch(/\.mn-panel-left \.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*max-height:\s*min\(75vh,\s*520px\) !important/s);

    // Ensure dropdown items inside LeftNav have full-width alignment
    expect(css).toMatch(/\.mn-panel-left \.tc-drop-down button[^{]*\{[^}]*width:\s*100% !important/s);

    // Ensure LeftNav header and floating dropdowns are strictly elevated above LeftNav body
    expect(css).toMatch(/\.mn-panel-left \.mn-panel-left-header:has\(\.tc-drop-down:not\(\[hidden\]\)\)[^}]*z-index:\s*100 !important/s);
    expect(css).toMatch(/\.mn-panel-left \.mn-panel-left-body\s*\{[^}]*position:\s*relative;\s*z-index:\s*1;/s);
    expect(css).toMatch(/\.mn-panel-left \.tc-reveal\.tc-popup:not\(\[hidden\]\)[^}]*z-index:\s*1000 !important/s);

    // Ensure Tools tab items are styled as clean horizontal rows
    expect(css).toMatch(/\.mn-sidebar-tabs-section \.tc-sidebar-tools-item\s*\{[^}]*display:\s*flex !important/s);

    // Ensure sidebar navigation tabs wrap properly and auto-size to support arbitrarily many choices without clipping
    expect(css).toMatch(/\.mn-sidebar-tabs-section \.tc-sidebar-tabs-main > \.tc-tab-buttons[^{]*\{[^}]*flex-wrap:\s*wrap !important/s);
    expect(css).toMatch(/\.mn-sidebar-tabs-section \.tc-sidebar-tabs-main > \.tc-tab-buttons button[^{]*\{[^}]*flex:\s*0 1 auto !important/s);
    expect(css).toMatch(/\.mn-sidebar-tabs-section\.mn-tabs-scroll \.tc-sidebar-tabs-main > \.tc-tab-buttons[^{]*\{[^}]*overflow-x:\s*auto !important/s);

    // Ensure sidebar navigation tabs zero out top whitespace so tabs align closely under Navigation heading like Pinned Shortcuts
    expect(css).toMatch(/\.mn-sidebar-tabs-section \.tc-sidebar-tabs-main > \.tc-tab-buttons[^{]*\{[^}]*padding-top:\s*0 !important/s);
    expect(css).toMatch(/\.mn-sidebar-tabs-section \.tc-sidebar-tabs-main > \.tc-tab-buttons[^{]*\{[^}]*margin-top:\s*0\.2rem !important/s);
    expect(css).toMatch(/\.mn-sidebar-tabs-section \.tc-sidebar-lists[^{]*\{[^}]*padding:\s*0 !important/s);
    expect(css).toMatch(/\.mn-sidebar-tabs-section p:empty\s*\{[^}]*display:\s*none !important/s);

    // Verify LeftNav rendered on mobile contains mobile close drawer button and default Navigation heading
    $tw.wiki.addTiddler({
      title: "$:/info/browser/window/system/main/client/width",
      text: "390",
    });
    const leftNavHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/LeftNav"
    );
    expect(leftNavHtml).toContain("mn-mobile-only");
    expect(leftNavHtml).toContain("Close drawer");
    expect(leftNavHtml).toContain("Navigation");

    // Verify custom Open Tiddlers section was removed from LeftNav in favor of built-in Open tab
    expect(leftNavHtml).not.toContain("Open Tiddlers (");

    // Verify Open tab is registered with $:/tags/SideBar and ordered before Recent
    const sidebarTabs = $tw.wiki.filterTiddlers(
      "[all[shadows+tiddlers]tag[$:/tags/SideBar]!has[draft.of]]"
    );
    expect(sidebarTabs[0]).toBe("$:/core/ui/SideBar/Open");
    expect(sidebarTabs).toContain("$:/core/ui/SideBar/Recent");

    // Verify built-in Open tab renders styled open rows with active note pill
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: "[[Welcome to Slipstream]] [[Knowledge Base]]",
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "Welcome to Slipstream",
    });
    const openTabHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/core/ui/SideBar/Open"
    );
    expect(openTabHtml).toContain("tc-sidebar-tab-open-row");
    expect(openTabHtml).toContain("mn-nav-item-active");
    expect(openTabHtml).toContain("Welcome");
    expect(openTabHtml).toContain("✕");
    expect(openTabHtml).toContain("close all");

    // Ensure open-tab.tid does NOT bind history= on its <$list storyview="pop"> widget
    // (which would cause PopStoryView.navigateTo to dispatch tm-scroll on the fixed sidebar and scroll the page to the bottom)
    const openTabTid = fs.readFileSync(path.join(PLUGIN_DIR, "ui/open-tab.tid"), "utf8");
    expect(openTabTid).not.toContain("history=");
  });

  test("enforces Invariant 6: zero un-scoped global selectors in styles/core.css for 100% theme compatibility", () => {
    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");
    // Strip comments
    const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const unscopedSelectors = [];

    function checkSelectorGroup(rawGroup) {
      const group = rawGroup.trim();
      if (!group || group.startsWith("@") || group === ":root") return;
      const individualSelectors = group.split(",").map((s) => s.trim()).filter(Boolean);
      for (const sel of individualSelectors) {
        if (!sel.includes(".mn-") && sel !== ":root") {
          unscopedSelectors.push(sel);
        }
      }
    }

    // Walk top-level and @media nested rule blocks
    const tokens = cleanCss.split(/([{}])/);
    let depth = 0;
    let inMedia = false;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok === "{") {
        const header = (tokens[i - 1] || "").trim();
        if (depth === 0) {
          if (header.startsWith("@media")) {
            inMedia = true;
          } else {
            checkSelectorGroup(header);
          }
        } else if (depth === 1 && inMedia) {
          checkSelectorGroup(header);
        }
        depth++;
      } else if (tok === "}") {
        depth--;
        if (depth === 0) {
          inMedia = false;
        }
      }
    }

    expect(unscopedSelectors).toEqual([]);
  });

  test("extracts document headings in RightInspector Outline tab, excludes numbered lists, normalizes hierarchy depth, and handles empty story river", () => {
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: ["Writing & Typography"],
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "Writing & Typography",
    });
    $tw.wiki.addTiddler({
      title: "$:/state/slipstream/inspector-tab",
      text: "Outline",
    });

    const outlineHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/RightInspector"
    );

    expect(outlineHtml).toContain("Document Outline");
    expect(outlineHtml).toContain("mn-outline-list");
    expect(outlineHtml).toContain("Level 1 Heading: The Foundation");
    expect(outlineHtml).toContain("Level 2 Heading: Formatting Elements");
    expect(outlineHtml).toContain("Level 3 Heading: Quotes &amp; Callouts");
    expect(outlineHtml).toContain("mn-outline-depth-1");
    expect(outlineHtml).toContain("mn-outline-depth-2");
    expect(outlineHtml).toContain("mn-outline-depth-3");

    // Verify Welcome to Slipstream (which starts with !! h2 headings and has # numbered lists)
    // normalizes !! headings to depth 1 and does NOT include # numbered list items!
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: ["Welcome to Slipstream"],
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "Welcome to Slipstream",
    });
    const welcomeOutlineHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/RightInspector"
    );
    expect(welcomeOutlineHtml).toContain("Key Features You Can Test Right Now");
    expect(welcomeOutlineHtml).toContain("Explore the Showcase Notes");
    expect(welcomeOutlineHtml).toContain("mn-outline-depth-1");
    expect(welcomeOutlineHtml).not.toContain("Three-Column Desktop Workspace");
    expect(welcomeOutlineHtml).not.toContain("Inline Object Property Pills");

    // Empty story river renders clean fallback without empty focus card
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: "",
    });
    const emptyInspectorHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/RightInspector"
    );
    expect(emptyInspectorHtml).toContain("Open a note to inspect its backlinks, outline, and fields.");
    expect(emptyInspectorHtml).not.toContain("mn-inspector-focus-card");

    $tw.wiki.deleteTiddler("$:/state/slipstream/inspector-tab");
  });

  test("renders $ss.prop-pill in both static (name/value) and dynamic field modes, and $ss.progress with value attribute", () => {
    const primitivesDocHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/docs/primitives"
    );

    // Static name/value pills render exact values
    expect(primitivesDocHtml).toContain("Status:");
    expect(primitivesDocHtml).toContain("Active");
    expect(primitivesDocHtml).toContain("Priority:");
    expect(primitivesDocHtml).toContain("High");

    // Progress bars with value= attribute compute non-zero percentage
    expect(primitivesDocHtml).toContain("85%");
    expect(primitivesDocHtml).toContain("70%");
    expect(primitivesDocHtml).toContain("92%");
  });

  test("preserves per-tiddler scroll position and scrolls to top when switching notes on mobile", () => {
    const views = {};
    $tw.modules.applyMethods("storyview", views);
    const FadeStoryView = views.fade;
    expect(typeof FadeStoryView).toBe("function");

    // Clear any previous positions
    FadeStoryView.clearSavedPositions();

    // Mock window scroll environment
    let currentScrollY = 0;
    const scrollToCalls = [];
    const origWindow = global.window;
    const origDoc = global.document;
    const origSandboxWindow = $tw.utils.sandbox ? $tw.utils.sandbox.window : undefined;

    const mockWindow = {
      get pageYOffset() { return currentScrollY; },
      scrollTo: jest.fn((opts) => {
        scrollToCalls.push(opts);
        if (typeof opts === "object" && typeof opts.top === "number") {
          currentScrollY = opts.top;
        } else if (typeof opts === "number") {
          currentScrollY = opts;
        }
      }),
      addEventListener: jest.fn(),
    };

    global.window = mockWindow;
    if ($tw.utils.sandbox) {
      $tw.utils.sandbox.window = mockWindow;
    }

    try {
      function createMockNode() {
        const styles = { display: "none" };
        return {
          nodeType: 1,
          style: {
            get display() { return styles.display; },
            set display(v) { styles.display = v; },
            removeProperty: (p) => { delete styles[p]; },
            setProperty: (p, v) => { styles[p] = v; },
          },
          className: "",
        };
      }

      // Create mock DOM nodes for Note A and Note B
      const nodeA = createMockNode();
      const nodeB = createMockNode();

      const listWidget = {
        wiki: $tw.wiki,
        historyTitle: "$:/HistoryList",
        children: [
          {
            parseTreeNode: { itemTitle: "Note A" },
            findFirstDomNode: () => nodeA,
            removeChildDomNodes: jest.fn(),
          },
          {
            parseTreeNode: { itemTitle: "Note B" },
            findFirstDomNode: () => nodeB,
            previousSibling: () => listWidget.children[0],
            removeChildDomNodes: jest.fn(),
          },
        ],
        findListItem: (start, title) => {
          if (title === "Note A") return 0;
          if (title === "Note B") return 1;
          return undefined;
        },
      };

      // Initialize storyview with Note A active
      $tw.wiki.setTiddlerData("$:/HistoryList", [{ title: "Note A" }], { "current-tiddler": "Note A" });

      const storyView = new FadeStoryView(listWidget);
      expect(nodeA.style.display).toBe("block");
      expect(nodeB.style.display).toBe("none");
      expect(storyView.currentTiddlerTitle).toBe("Note A");
      expect(listWidget.history).toEqual([{ title: "Note A" }]);

      // User scrolls Note A down to 500px
      currentScrollY = 500;

      // Switch to Note B (no state saved)
      storyView.navigateTo({ title: "Note B" });

      // Outgoing Note A's position should be saved as 500
      expect(FadeStoryView.getSavedPosition("Note A")).toBe(500);

      // Incoming Note B has no saved state -> scrolls to top (0)
      expect(currentScrollY).toBe(0);
      expect(nodeB.style.display).toBe("block");
      expect(storyView.currentTiddlerTitle).toBe("Note B");

      // User scrolls Note B down to 250px
      currentScrollY = 250;

      // Switch back to Note A -> should restore Note A's position at 500px!
      storyView.navigateTo({ title: "Note A" });
      expect(FadeStoryView.getSavedPosition("Note B")).toBe(250);
      expect(currentScrollY).toBe(500);
      expect(storyView.currentTiddlerTitle).toBe("Note A");

      // Switch back to Note B -> should restore Note B's position at 250px!
      storyView.navigateTo({ title: "Note B" });
      expect(currentScrollY).toBe(250);

      // Tapping active Note B again smoothly scrolls to top (0) and updates saved state
      storyView.navigateTo({ title: "Note B" });
      expect(currentScrollY).toBe(0);
      expect(FadeStoryView.getSavedPosition("Note B")).toBe(0);

      // Closing Note B cleans up its saved state and reveals Note A at Note A's saved position
      storyView.remove(listWidget.children[1]);
      expect(FadeStoryView.getSavedPosition("Note B")).toBeUndefined();
      expect(currentScrollY).toBe(500);

      // Draft tiddler inherits and preserves original tiddler's scroll position
      expect(FadeStoryView.getSavedPosition("Draft of 'Note A'")).toBe(500);
      FadeStoryView.setSavedPosition("Draft of 'Note A'", 620);
      expect(FadeStoryView.getSavedPosition("Note A")).toBe(620);
    } finally {
      global.window = origWindow;
      global.document = origDoc;
      if ($tw.utils.sandbox) {
        $tw.utils.sandbox.window = origSandboxWindow;
      }
      FadeStoryView.clearSavedPositions();
    }
  });

  test("renders Concept 1 contextual mobile bottom bar controls and context sheet", () => {
    // 1. Mobile reading mode
    $tw.wiki.addTiddler({
      title: "$:/info/browser/window/system/main/client/width",
      text: "390",
    });
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: ["Welcome to Slipstream"],
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "Welcome to Slipstream",
    });

    let barHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/MobileBar"
    );

    // Reading mode has 1-tap Edit, Context, New, Search, and More
    expect(barHtml).toContain("Edit");
    expect(barHtml).toContain("Context");
    expect(barHtml).toContain("New");
    expect(barHtml).toContain("Search");
    expect(barHtml).toContain("More");
    expect(barHtml).toContain('title="Edit this note"');
    expect(barHtml).toContain('title="New note"');
    expect(barHtml).toContain('title="Search notes"');

    // 2. Open context sheet
    $tw.wiki.addTiddler({
      title: "$:/state/slipstream/mobile-context-sheet",
      text: "open",
    });
    barHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/MobileBar"
    );
    expect(barHtml).toContain("Note Context");
    expect(barHtml).toContain("mn-sheet-context");
    expect(barHtml).toContain("Active Context Inspector");
    $tw.wiki.deleteTiddler("$:/state/slipstream/mobile-context-sheet");

    // 3. Draft / Edit Mode
    $tw.wiki.addTiddler({
      title: "Draft of 'Welcome to Slipstream'",
      "draft.of": "Welcome to Slipstream",
      "draft.title": "Welcome to Slipstream",
      text: "Draft content...",
    });
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: ["Draft of 'Welcome to Slipstream'"],
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "Draft of 'Welcome to Slipstream'",
    });

    const draftBarHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/MobileBar"
    );

    // Draft mode displays Cancel, Save, and Discard
    expect(draftBarHtml).toContain("Cancel");
    expect(draftBarHtml).toContain("Save");
    expect(draftBarHtml).toContain("Discard");
    expect(draftBarHtml).toContain('title="Cancel changes"');
    expect(draftBarHtml).toContain('title="Save note changes"');
    expect(draftBarHtml).toContain('title="Discard draft"');

    // Cleanup
    $tw.wiki.deleteTiddler("Draft of 'Welcome to Slipstream'");
  });

  test("allows adding, editing, and removing fields in the Context Inspector Fields tab", () => {
    $tw.wiki.addTiddler({
      title: "FieldTestNote",
      "test-status": "active",
      priority: "high",
    });
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: ["FieldTestNote"],
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "FieldTestNote",
    });
    $tw.wiki.addTiddler({
      title: "$:/state/slipstream/inspector-tab",
      text: "Fields",
    });

    const inspectorHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/RightInspector"
    );

    // Verify fields list and existing custom fields
    expect(inspectorHtml).toContain("mn-fields-list");
    expect(inspectorHtml).toContain("mn-field-row");
    expect(inspectorHtml).toContain("test-status");
    expect(inspectorHtml).toContain("priority");
    expect(inspectorHtml).toContain("mn-field-remove-btn");
    expect(inspectorHtml).toContain("mn-field-add-form");
    expect(inspectorHtml).toContain("mn-field-add-btn");
    expect(inspectorHtml).toContain("Add Field");

    // Cleanup
    $tw.wiki.deleteTiddler("FieldTestNote");
    $tw.wiki.deleteTiddler("$:/state/slipstream/inspector-tab");
  });

  test("renders mobile pin/favorite button in TopBar and toggles $:/tags/Pinned", () => {
    $tw.wiki.addTiddler({
      title: "$:/info/browser/window/system/main/client/width",
      text: "390",
    });
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: ["PinTestNote"],
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "PinTestNote",
    });
    $tw.wiki.addTiddler({
      title: "PinTestNote",
      text: "Testing pin button...",
    });

    let topHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/TopBar"
    );

    expect(topHtml).toContain("mn-pin-btn");
    expect(topHtml).toContain("Pin note to shortcuts");
    expect(topHtml).toContain("☆");

    // When tagged $:/tags/Pinned
    $tw.wiki.addTiddler({
      title: "PinTestNote",
      tags: ["$:/tags/Pinned"],
      text: "Testing pin button...",
    });

    topHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/TopBar"
    );

    expect(topHtml).toContain("Unpin note from shortcuts");
    expect(topHtml).toContain("★");

    // Cleanup
    $tw.wiki.deleteTiddler("PinTestNote");
  });

  test("executes note actions and dismisses sheet in mobile options menu (delete, edit, close)", () => {
    // 1. Setup mobile reading mode with open note
    $tw.wiki.addTiddler({
      title: "$:/info/browser/window/system/main/client/width",
      text: "390",
    });
    $tw.wiki.addTiddler({
      title: "MobileActionNote",
      text: "Testing mobile actions...",
    });
    $tw.wiki.addTiddler({
      title: "OtherNote",
      text: "Another note in story...",
    });
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: ["MobileActionNote", "OtherNote"],
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "MobileActionNote",
    });
    $tw.wiki.addTiddler({
      title: "$:/state/slipstream/mobile-action-sheet",
      text: "open",
    });

    const parser = $tw.wiki.parseTiddler("$:/plugins/mblackman/slipstream/ui/Layout");
    const widgetNode = $tw.wiki.makeWidget(parser, {});
    const container = $tw.fakeDocument.createElement("div");
    widgetNode.render(container, null);

    function findButton(node, predicate) {
      if (node.parseTreeNode && node.parseTreeNode.type === "button" && predicate(node)) {
        return node;
      }
      for (const child of node.children) {
        const res = findButton(child, predicate);
        if (res) return res;
      }
      return null;
    }

    // 2. Verify delete button is armed with cancel-delete-tiddler-actions
    const deleteBtn = findButton(
      widgetNode,
      b => b.getAttribute("aria-label") === "Delete this tiddler"
    );
    expect(deleteBtn).not.toBeNull();
    const deleteActions = deleteBtn.getAttribute("actions");
    expect(deleteActions).toBeDefined();
    expect(deleteActions).toContain('tm-delete-tiddler');
    expect(deleteActions).toContain('$:/state/slipstream/mobile-action-sheet');
    expect(deleteActions).toContain('closed');

    // 3. Verify close button closes the open note and dismisses the sheet
    const closeBtn = findButton(
      widgetNode,
      b => b.getAttribute("aria-label") === "close" &&
           b.parentDomNode && b.parentDomNode.className &&
           b.parentDomNode.className.includes("mn-sheet-action-item")
    );
    expect(closeBtn).not.toBeNull();
    closeBtn.dispatchMessage({ preventDefault: () => {}, stopPropagation: () => {} });
    expect($tw.wiki.getTiddlerList("$:/StoryList")).toEqual(["OtherNote"]);
    expect($tw.wiki.getTiddlerText("$:/state/slipstream/mobile-action-sheet")).toBe("closed");

    // Verify the options sheet is not rendered in the DOM when state is closed
    const closedHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/MobileBar"
    );
    expect(closedHtml).not.toContain("mn-bottom-sheet");

    // 4. Verify draft mode suppresses options sheet
    $tw.wiki.addTiddler({
      title: "Draft of 'MobileActionNote'",
      "draft.of": "MobileActionNote",
      text: "Drafting...",
    });
    $tw.wiki.addTiddler({
      title: "$:/StoryList",
      list: ["Draft of 'MobileActionNote'"],
    });
    $tw.wiki.addTiddler({
      title: "$:/HistoryList",
      "current-tiddler": "Draft of 'MobileActionNote'",
    });
    $tw.wiki.addTiddler({
      title: "$:/state/slipstream/mobile-action-sheet",
      text: "open",
    });

    const draftHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/slipstream/ui/MobileBar"
    );
    // Sheet must not be rendered when active note is in draft mode
    expect(draftHtml).not.toContain("mn-bottom-sheet");
    expect(draftHtml).toContain("mn-mobile-nav-btn-save");

    // Cleanup
    $tw.wiki.deleteTiddler("MobileActionNote");
    $tw.wiki.deleteTiddler("OtherNote");
    $tw.wiki.deleteTiddler("Draft of 'MobileActionNote'");
    $tw.wiki.deleteTiddler("$:/state/slipstream/mobile-action-sheet");
  });

  test("constrains wide content and tables with horizontal scrolling and scrollbars inside tiddler frames", () => {
    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");

    // Ensure .tc-tiddler-frame has min-width: 0 to prevent flex containers from expanding beyond bounds
    expect(css).toMatch(/\.mn-app-shell \.mn-story-container \.tc-tiddler-frame\s*\{[^}]*min-width:\s*0/s);

    // Ensure .tc-tiddler-body acts as a horizontal scroll container for any overflowing wide content
    expect(css).toMatch(/\.mn-story-container \.tc-tiddler-body\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/\.mn-story-container \.tc-tiddler-body\s*\{[^}]*max-width:\s*100%/s);
    expect(css).toMatch(/\.mn-story-container \.tc-tiddler-body\s*\{[^}]*overflow-x:\s*auto/s);
    expect(css).toMatch(/\.mn-story-container \.tc-tiddler-body\s*\{[^}]*overflow-wrap:\s*break-word/s);

    // Ensure tables are block scroll containers with width: fit-content, max-width: 100%, and overflow-x: auto
    expect(css).toMatch(/\.tc-tiddler-body table[^{]*\{[^}]*display:\s*block/s);
    expect(css).toMatch(/\.tc-tiddler-body table[^{]*\{[^}]*width:\s*fit-content/s);
    expect(css).toMatch(/\.tc-tiddler-body table[^{]*\{[^}]*max-width:\s*100%/s);
    expect(css).toMatch(/\.tc-tiddler-body table[^{]*\{[^}]*overflow-x:\s*auto/s);
    expect(css).toMatch(/\.tc-tiddler-body table[^{]*\{[^}]*scrollbar-width:\s*thin/s);

    // Ensure prose table rules do not globally target .tc-tiddler-frame table (which would break .tc-edit-fields)
    expect(css).not.toContain(".tc-tiddler-frame table");

    // Ensure code blocks and media are constrained
    expect(css).toMatch(/\.tc-tiddler-body pre\s*\{[^}]*overflow-x:\s*auto/s);
    expect(css).toMatch(/\.tc-tiddler-body pre\s*\{[^}]*max-width:\s*100%/s);
    expect(css).toMatch(/\.tc-tiddler-body (?:img|video|svg|canvas|iframe)[^{]*\{[^}]*max-width:\s*100%/s);

    // Verify rendered wikitext table produces valid HTML within the Slipstream storyview
    $tw.wiki.addTiddler({
      title: "WideTableNote",
      text: "| !Col 1 | !Col 2 | !Col 3 | !Col 4 | !Col 5 | !Col 6 |\n| Value 1 | Value 2 | Value 3 | Value 4 | Value 5 | Value 6 |",
    });

    const rendered = $tw.wiki.renderTiddler("text/html", "WideTableNote");
    expect(rendered).toContain("<table");
    expect(rendered).toContain("Col 1");
    expect(rendered).toContain("Col 6");

    $tw.wiki.deleteTiddler("WideTableNote");
  });
});




