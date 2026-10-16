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
      "templates/wide-body.tid",
      "widgets/ui-primitives.tid",
      "styles/core.css",
    ];

    for (const relPath of uiFiles) {
      const content = fs.readFileSync(path.join(PLUGIN_DIR, relPath), "utf8");
      expect(content).not.toMatch(/Journal Dashboard|Project Dashboard|Media Hub/);
    }
  });

  test("enforces Theme Invariant 2 & 3: native v5.4.0 --tpc-* / --tp-* variables and strict z-index hierarchy", () => {
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
  });

  test("configures mobile bottom sheet with fixed height and full touch-target action buttons", () => {
    const css = fs.readFileSync(path.join(PLUGIN_DIR, "styles/core.css"), "utf8");
    // Ensure bottom sheet has fixed height (82dvh) so its top edge does not jump when switching tabs
    expect(css).toMatch(/\.mn-bottom-sheet\s*\{[^}]*height:\s*82dvh/s);
    expect(css).toMatch(/\.mn-bottom-sheet\s*\{[^}]*max-height:\s*82dvh/s);

    // Ensure uniform 4-column grid layout on mobile
    expect(css).toMatch(/\.mn-sheet-action-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/s);
    expect(css).toMatch(/\.mn-sheet-action-item\s*\{[^}]*height:\s*48px/s);

    // Ensure hidden reveal spans are suppressed so they do not squish buttons
    expect(css).toMatch(/\.mn-sheet-action-item \[hidden\][^}]*display:\s*none !important/s);

    // Ensure action grid buttons fill entire item container as full clickable touch targets
    expect(css).toMatch(/\.mn-sheet-action-item button\s*\{[^}]*width:\s*100%/s);
    expect(css).toMatch(/\.mn-sheet-action-item button\s*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.mn-sheet-action-item button svg\s*\{[^}]*pointer-events:\s*none/s);
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

    // Ensure .tc-drop-down is flex column with elevated card radius and shadow
    expect(css).toMatch(/\.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*display:\s*flex/s);
    expect(css).toMatch(/\.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*flex-direction:\s*column/s);
    expect(css).toMatch(/\.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*min-width:\s*220px/s);
    expect(css).toMatch(/\.tc-drop-down:not\(\[hidden\]\)\s*\{[^}]*border-radius:\s*var\(--mn-radius-card\)/s);

    // Ensure dropdown buttons have 100% width, full touch target, and inline alignment
    expect(css).toMatch(/\.tc-drop-down button,\s*\.tc-drop-down a\s*\{[^}]*width:\s*100% !important/s);
    expect(css).toMatch(/\.tc-drop-down button,\s*\.tc-drop-down a\s*\{[^}]*min-height:\s*32px !important/s);
    expect(css).toMatch(/\.tc-drop-down button,\s*\.tc-drop-down a\s*\{[^}]*display:\s*flex !important/s);

    // Ensure dropdown button icons and text are properly dimensioned and inline
    expect(css).toMatch(/\.tc-drop-down button svg,\s*\.tc-drop-down a svg\s*\{[^}]*width:\s*15px !important/s);
    expect(css).toMatch(/\.tc-drop-down \.tc-btn-text\s*\{[^}]*display:\s*inline !important/s);

    // Ensure reveal containers inside dropdown expand to full width
    expect(css).toMatch(/\.tc-drop-down \.tc-reveal:not\(\[hidden\]\)\s*\{[^}]*display:\s*block/s);

    // Ensure tiddler frame with open dropdown is elevated above sibling tiddler frames
    expect(css).toMatch(/\.tc-tiddler-frame:has\(\.tc-drop-down:not\(\[hidden\]\)\)[^}]*z-index:\s*50/s);
  });
});

