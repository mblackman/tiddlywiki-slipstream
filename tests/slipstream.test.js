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
  });

  test("registers all expected shadow tiddlers", () => {
    const expectedShadows = [
      "$:/plugins/mblackman/slipstream/readme",
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
      list: "[[Welcome to Slipstream]] [[Journal Dashboard]] [[Project Dashboard]]",
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

    // Verify Pinned Shortcuts in LeftNav rendered demo dashboards
    expect(html).toContain("Welcome");
    expect(html).toContain("Journal");
    expect(html).toContain("Projects");
    expect(html).toContain("Media");

    // Verify custom widgets rendered inside the story river
    expect(html).toContain("mn-hero");
    expect(html).toContain("mn-grid");
    expect(html).toContain("mn-card");
    expect(html).toContain("mn-prop-pill");
    expect(html).toContain("mn-progress-track");
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
      { variables: { currentTiddler: "Journal Dashboard" } }
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
});
