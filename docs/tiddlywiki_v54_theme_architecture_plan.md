# TiddlyWiki v5.4+ Custom Theme & Layout Architecture Plan

This blueprint defines a complete architecture and implementation plan for a custom [TiddlyWiki v5.4.0+](https://tiddlywiki.com/static/Release%25205.4.0.html) theme and [Alternative Page Layout](https://tiddlywiki.com/static/Alternative%2520page%2520layouts.html) (`$:/plugins/mblackman/modern-notebook`). It evolves the minimalist foundation of Nicolas Petton's [Notebook Theme](https://tiddlywiki.com/static/%2522Notebook%2520theme%2522%2520by%2520Nicolas%2520Petton.html) into a three-zone desktop workspace inspired by [Capacities](https://capacities.io/), [Craft](https://www.craft.do/), and [Obsidian](https://obsidian.md/), paired with a single-tiddler mobile `zoomin` experience and dedicated view cascades for your **Journal Dashboard**, **Project Dashboard**, and **Media Search Widget** ([tiddlywiki-media-importer](https://github.com/mblackman/tiddlywiki-media-importer/actions/runs/28805698963)).

## 1. Plugin & Namespace Architecture Enforces Clean State Encapsulation

Following the conventions in standard TiddlyWiki plugin development best practices, package the theme as a hybrid layout plugin rather than a CSS-only theme so that custom page templates, cascades, and global custom widgets load together as shadow tiddlers.

| Tiddler / Namespace Path | System Tag / Type | Architectural Role |
| :--- | :--- | :--- |
| `$:/plugins/mblackman/modern-notebook/plugin.info` | `application/json` | Declares `core-version: ">=5.4.0"`, metadata, and exposed settings tabs |
| `$:/plugins/mblackman/modern-notebook/ui/Layout` | `$:/tags/Layout` | Root 3-column desktop and mobile `zoomin` page shell (`<$navigator>` + `<$messagecatcher>`) |
| `$:/plugins/mblackman/modern-notebook/styles/core.css` | `$:/tags/Stylesheet` (`text/css`) | Pure vanilla CSS using [Release 5.4.0](https://tiddlywiki.com/static/Release%25205.4.0.html) `--tpc-*` and `--tp-*` variables ([Writing Stylesheets in Vanilla CSS](https://tiddlywiki.com/static/Writing%2520stylesheets%2520in%2520vanilla%2520CSS.html)) |
| `$:/plugins/mblackman/modern-notebook/widgets/ui-primitives` | `$:/tags/Global` | Reusable `\widget`, `\procedure`, and `\function` definitions ([Custom Widgets](https://tiddlywiki.com/static/Custom%2520Widgets.html)) |
| `$:/plugins/mblackman/modern-notebook/ui/LeftNav` | Transcluded in Layout | Left navigation rail with dashboard shortcuts, open tiddler switcher, and tag tree |
| `$:/plugins/mblackman/modern-notebook/ui/RightInspector` | Transcluded in Layout | Right context panel bound to `{$:/HistoryList!!current-tiddler}` (backlinks, fields, [Timelord](https://github.com/tiddly-gittly/TiddlyWiki-CPL/pull/247) history) |
| `$:/plugins/mblackman/modern-notebook/ui/MobileBar` | Transcluded in Layout | Thumb-zone bottom bar, open-tiddler pill switcher, and zoomed tiddler action sheet |
| `$:/plugins/mblackman/modern-notebook/cascades/*` | `$:/tags/ViewTemplateBodyFilter` | Cascade filter rules routing Journal, Project, and Media tiddlers to custom templates ([Customising TiddlyWiki's User Interface](https://tiddlywiki.com/static/Customising%2520TiddlyWiki%2527s%2520user%2520interface.html)) |
| `$:/plugins/mblackman/modern-notebook/settings` | `$:/tags/ControlPanel/SettingsTab` | Centralized theme settings UI with one-click shadow default reset |
| `$:/state/modern-notebook/*` | Local client state | Persists panel collapse states, active inspector tab, and mobile drawer toggles ([StateMechanism](https://tiddlywiki.com/static/StateMechanism.html)) |
| `$:/temp/volatile/modern-notebook/*` | Volatile search state | Automatically throttles refresh (400ms) for live media and command searches |

## 2. Three-Zone Desktop Shell Balances Focused Reading with Persistent Context

On desktop viewports (`>= 1024px`), the layout uses CSS Grid (`grid-template-columns: auto minmax(0, 1fr) auto`) so the central story river remains centered at an ergonomic reading measure (`68ch–75ch`) while flanking panels collapse or expand smoothly without overlapping content.

### Desktop PageTemplate (`$:/plugins/mblackman/modern-notebook/ui/Layout`)

```html
\whitespace trim
\import [subfilter{$:/core/config/GlobalImportFilter}]

\function .active-storyview()
[{$:/info/browser/window/system/main/client/width}compare:number:lt[1024]then[zoomin]else[classic]]
\end

\function .container-classes()
tc-page-container mn-app-shell
[{$:/state/modern-notebook/left-panel}match[no]then[mn-left-collapsed]else[mn-left-open]]
[{$:/state/modern-notebook/right-panel}match[no]then[mn-right-collapsed]else[mn-right-open]]
[{$:/info/browser/window/system/main/client/width}compare:number:lt[1024]then[mn-is-mobile]else[mn-is-desktop]]
+[join[ ]]
\end

<$navigator
	story="$:/StoryList"
	history="$:/HistoryList"
	openLinkFromInsideRiver={{$:/config/Navigation/openLinkFromInsideRiver}}
	openLinkFromOutsideRiver={{$:/config/Navigation/openLinkFromOutsideRiver}}
	relinkOnRename={{$:/config/RelinkOnRename}}
>
	<$dropzone enable=<<tv-enable-drag-and-drop>>>
		<div class=<<.container-classes>>>
			<!-- Top Sticky Command & Breadcrumb Header -->
			<header class="mn-topbar tc-adjust-top-of-scroll">
				{{$:plugins/mblackman/modern-notebook/ui/TopBar}}
			</header>

			<!-- 3-Column Workspace Grid -->
			<div class="mn-workspace-grid">
				<!-- Left Navigation Panel -->
				<aside class="mn-panel-left">
					{{$:/plugins/mblackman/modern-notebook/ui/LeftNav}}
				</aside>

				<!-- Centered Story River -->
				<main class="mn-story-container">
					<$list
						filter="[list[$:/StoryList]]"
						history="$:/HistoryList"
						template={{$:/config/ui/ViewTemplate}}
						editTemplate={{$:/config/ui/EditTemplate}}
						storyview=<<.active-storyview>>
						emptyMessage={{$:/config/EmptyStoryMessage}}
					/>
				</main>

				<!-- Right Context & Inspector Panel (Desktop Only) -->
				<%if [{$:/info/browser/window/system/main/client/width}compare:number:gteq[1024]] %>
					<aside class="mn-panel-right">
						{{$:/plugins/mblackman/modern-notebook/ui/RightInspector}}
					</aside>
				<%endif%>
			</div>

			<!-- Mobile Bottom Navigation & Zoomed Tiddler Options Sheet -->
			<%if [{$:/info/browser/window/system/main/client/width}compare:number:lt[1024]] %>
				{{$:/plugins/mblackman/modern-notebook/ui/MobileBar}}
			<%endif%>
		</div>
	</$dropzone>
</$navigator>
```

### Right Context Inspector (`$:/plugins/mblackman/modern-notebook/ui/RightInspector`)

Instead of appending heavy backlink lists and field tables to the bottom of every open tiddler in the story river, the Right Context Inspector binds to `$:/HistoryList!!current-tiddler` ([HistoryMechanism](https://tiddlywiki.com/static/HistoryMechanism.html)). Whenever you click a link or focus a tiddler, the right panel updates to show:

- **Outline & TOC Tab**: Renders `<<toc {{$:/HistoryList!!current-tiddler}}>>` for quick section jumping inside long notes.
- **Backlinks & References Tab**: Lists `[all[tiddlers]backlinks[]]` and `[all[tiddlers]transcludes[]]` for the active tiddler using `<$mn.card>` previews.
- **Properties & Fields Tab**: Embeds inline field editors via [Customizing EditTemplate Field Rendering](https://tiddlywiki.com/static/Customizing%2520EditTemplate%2520field%2520rendering.html) so you can update tags, status, or media metadata without entering full edit mode.
- **Revision History Tab**: Hooks directly into your [Timelord](https://github.com/tiddly-gittly/TiddlyWiki-CPL/pull/247) revision history view for the active tiddler.

## 3. Mobile Single-Tiddler (`Zoomin`) UX Solves Switching and Toolbar Access

Using the `zoomin` storyview ([ListWidget](https://tiddlywiki.com/static/ListWidget.html)) on mobile (`< 1024px`) keeps the viewport focused on a single active tiddler, eliminating endless vertical scrolling. To make switching between open tiddlers and accessing zoomed tiddler actions effortless with one thumb, pair `zoomin` with three mobile-specific components in `$:/plugins/mblackman/modern-notebook/ui/MobileBar`:

1. **Horizontal Open-Tiddler Pill Strip (Top or Above Bottom Bar)**: Displays all tiddlers currently in `$:/StoryList` as swipeable horizontal chips. The active tiddler (`{$:/HistoryList!!current-tiddler}`) is highlighted, tapping any chip dispatches `<$action-navigate $to=<<currentTiddler>>/>` to zoom straight to it, and each chip includes a `×` button (`tm-close-tiddler`).
2. **Fixed Bottom Thumb Bar (`56px` + Safe-Area Inset)**: Contains 5 ergonomic touch targets (`min-height: 44px`):
   - **Menu Drawer Toggle**: Opens the Left Navigation slide-over sheet (Dashboards, Tags, Bookmarks).
   - **Quick Search / Command Trigger**: Opens the search modal bound to `$:/temp/volatile/modern-notebook/search`.
   - **Quick Capture (`+`)**: Creates a new note or daily journal entry immediately.
   - **Open Tiddlers Switcher Badge**: Shows the count of open tiddlers (`${ [list[$:/StoryList]count[]] }$`) and opens a full card-stack switcher sheet.
   - **Zoomed Tiddler Actions (`•••`)**: Opens the slide-up **Tiddler Options Bottom Sheet** for the currently zoomed tiddler.
3. **Zoomed Tiddler Options Bottom Sheet**: On mobile, hide the cramped header `.tc-tiddler-controls` row via CSS and move all tiddler-level actions into a slide-up sheet bound to `tiddler={{$:/HistoryList!!current-tiddler}}`:

```html
\whitespace trim
<%if [{$:/state/modern-notebook/mobile-action-sheet}match[open]] %>
	<div class="mn-backdrop">
		<$button set="$:/state/modern-notebook/mobile-action-sheet" setTo="closed" class="mn-backdrop-dismiss" aria-label="Close actions"/>
		<section class="mn-bottom-sheet">
			<$tiddler tiddler={{$:/HistoryList!!current-tiddler}}>
				<header class="mn-sheet-header">
					<span class="mn-sheet-title"><$view field="caption"><$view field="title"/></$view></span>
					<$button set="$:/state/modern-notebook/mobile-action-sheet" setTo="closed" class="tc-btn-invisible">✕</$button>
				</header>

				<!-- Primary Tiddler ViewToolbar Actions Rendered as Touch Grid -->
				<div class="mn-sheet-action-grid">
					<$list filter="[all[shadows+tiddlers]tag[$:/tags/ViewToolbar]!has[draft.of]]" variable="toolbarItem">
						<$list filter="[<toolbarItem>! evaluate-visibility[hidden]]">
							<div class="mn-sheet-action-item" data-action=<<toolbarItem>>>
								<$transclude $tiddler=<<toolbarItem>>/>
							</div>
						</$list>
					</$list>
				</div>

				<!-- Inline Quick Context (Tags & Fields for Current Zoomed Tiddler) -->
				<div class="mn-sheet-context">
					<$transclude $tiddler="$:/core/ui/ViewTemplate/tags"/>
					<$transclude $tiddler="$:/plugins/mblackman/modern-notebook/ui/RightInspector"/>
				</div>
			</$tiddler>
		</section>
	</div>
<%endif%>
```

## 4. Vanilla CSS Architecture Uses TiddlyWiki 5.4.0 Core Variables

With [Writing Stylesheets in Vanilla CSS](https://tiddlywiki.com/static/Writing%2520stylesheets%2520in%2520vanilla%2520CSS.html) introduced in [Release 5.4.0](https://tiddlywiki.com/static/Release%25205.4.0.html), your theme stylesheet can be a pure `text/css` tiddler that references [`--tpc-*` CSS Variables](https://tiddlywiki.com/static/--tpc-%252A%2520CSS%2520Variables.html) for palette colors and `--tp-*` variables ([`--tp-tiddler-width`](https://tiddlywiki.com/static/--tp-tiddler-width%2520CSS%2520Variable.html), [`--tp-body-font-size`](https://tiddlywiki.com/static/--tp-body-font-size%2520CSS%2520Variable.html), [`--tp-animation-duration`](https://tiddlywiki.com/static/--tp-animation-duration%2520CSS%2520Variable.html)) for metrics.

```css
@layer tokens, layout, tiddler, utilities, mobile;

@layer tokens {
	:root {
		--mn-bg-app: var(--tp-color-page-background, #f8fafc);
		--mn-bg-surface: var(--tp-color-background, #ffffff);
		--mn-bg-elevated: color-mix(in srgb, var(--tp-color-background) 92%, var(--tp-color-foreground) 8%);
		--mn-border-subtle: color-mix(in srgb, var(--tp-color-foreground) 12%, transparent);
		--mn-text-main: var(--tp-color-foreground, #0f172a);
		--mn-text-muted: var(--tp-color-muted-foreground, #64748b);
		--mn-accent: var(--tp-color-primary, #3b82f6);
		--mn-left-width: 260px;
		--mn-right-width: 320px;
		--mn-reading-width: var(--tp-tiddler-width, 72ch);
		--mn-dashboard-width: 1180px;
		--mn-radius-card: 12px;
		--mn-radius-pill: 9999px;
	}
}

@layer layout {
	.mn-app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		background: var(--mn-bg-app);
		color: var(--mn-text-main);
	}

	.mn-topbar {
		position: sticky;
		top: 0;
		z-index: 300;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		background: color-mix(in srgb, var(--mn-bg-surface) 85%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--mn-border-subtle);
	}

	.mn-workspace-grid {
		display: grid;
		grid-template-columns: var(--mn-left-width) minmax(0, 1fr) var(--mn-right-width);
		flex: 1;
		align-items: start;
	}

	.mn-left-collapsed .mn-workspace-grid {
		grid-template-columns: 0px minmax(0, 1fr) var(--mn-right-width);
	}

	.mn-right-collapsed .mn-workspace-grid {
		grid-template-columns: var(--mn-left-width) minmax(0, 1fr) 0px;
	}

	.mn-left-collapsed.mn-right-collapsed .mn-workspace-grid {
		grid-template-columns: 0px minmax(0, 1fr) 0px;
	}

	.mn-panel-left,
	.mn-panel-right {
		position: sticky;
		top: 48px;
		height: calc(100dvh - 48px);
		overflow-y: auto;
		background: var(--mn-bg-surface);
		border-inline: 1px solid var(--mn-border-subtle);
		transition: width var(--tp-animation-duration, 200ms) ease;
	}

	.mn-story-container {
		padding: 2rem 1.5rem 5rem;
		width: 100%;
	}
}

@layer tiddler {
	/* Default Centered Reading Column for Standard Notes */
	.mn-story-container .tc-tiddler-frame {
		max-width: var(--mn-reading-width);
		margin: 0 auto 1.5rem;
		padding: 2rem 2.5rem;
		background: var(--mn-bg-surface);
		border: 1px solid var(--mn-border-subtle);
		border-radius: var(--mn-radius-card);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	/* Auto-Expand Wide Container for Dashboards & Media Hub */
	.mn-story-container .tc-tiddler-frame:has(.mn-wide-view),
	.mn-story-container .tc-tiddler-frame[data-tiddler-title*="Dashboard"] {
		max-width: var(--mn-dashboard-width);
	}
}

@layer mobile {
	@media (max-width: 1023px) {
		.mn-workspace-grid {
			grid-template-columns: minmax(0, 1fr) !important;
		}

		.mn-story-container {
			padding: 0.75rem 0.75rem 5.5rem;
		}

		.mn-story-container .tc-tiddler-frame {
			padding: 1.25rem 1rem;
			margin-bottom: 0;
			border-radius: 10px;
		}

		/* Hide top-right toolbar clutter on mobile; accessed via Bottom Action Sheet */
		.mn-story-container .tc-tiddler-controls {
			display: none;
		}
	}
}
```

## 5. Custom Cascades & Widgets Power Your Three Priority Utilities

Using [Release 5.3.0](https://tiddlywiki.com/static/Release%25205.3.0.html) `\widget`, `\procedure`, and `\function` primitives alongside [Release 5.4.0](https://tiddlywiki.com/static/Release%25205.4.0.html) dynamic parameter calls (`<<proc param={{!!field}}>>`) and `:let` filter runs, register three ViewTemplate Body Cascade rules (`$:/tags/ViewTemplateBodyFilter`) so your dashboards and media search widget automatically render with modern, full-width layouts while standard notes stay in the `72ch` centered reading column.

| Utility View | Cascade Trigger Condition | Layout Width | Key UI/UX Features |
| :--- | :--- | :--- | :--- |
| **Journal Dashboard** | `[tag[JournalDashboard]]` or `[title[Journal Dashboard]]` | Wide (`1180px` on desktop, single-column feed on mobile) | "Today" quick-capture hero card, 14-day activity strip, calendar/tag filter bar, and inline expandable journal stream |
| **Project Dashboard** | `[tag[ProjectDashboard]]` or `[title[Project Dashboard]]` | Wide (`1180px` multi-column board on desktop, swipeable status tabs on mobile) | Status-grouped project cards (`Active`, `Next Up`, `On Hold`), task completion progress bars, and overdue task badges |
| **Media Search Widget Hub** | `[tag[MediaDashboard]]` or tiddlers containing your media search widget | Wide (`1180px` responsive poster grid) | Sticky volatile search bar (`$:/temp/volatile/`), media type filter pills, `2:3` cover-art card grid, and inline rating/status pills |

### A. Reusable Theme Primitives (`$:/plugins/mblackman/modern-notebook/widgets/ui-primitives`)

Tag this tiddler with `$:/tags/Global` so all custom widgets and functions are available across your templates and dashboards:

```html
\whitespace trim

<!-- Custom Card Widget with Header, Body, and Footer Slots -->
\widget $mn.card(class:"", badge:"", accent:"")
<article class={{{ [[mn-card]] [<class>] +[join[ ]] }}} style={{{ [<accent>!is[blank]addprefix[--mn-card-accent:]addsuffix[;]] }}}>
	<header class="mn-card-header">
		<div class="mn-card-title-group">
			<$slot $name="header">
				<$link to=<<currentTiddler>> class="mn-card-title">
					<$view field="caption"><$view field="title"/></$view>
				</$link>
			</$slot>
		</div>
		<%if [<badge>!is[blank]] %>
			<span class="mn-badge"><$text text=<<badge>>/></span>
		<%endif%>
	</header>
	<div class="mn-card-body">
		<$slot $name="ts-raw"/>
	</div>
	<footer class="mn-card-footer">
		<$slot $name="footer"/>
	</footer>
</article>
\end $mn.card

<!-- Inline Property Pill Widget for Rapid Field Viewing/Editing -->
\widget $mn.prop-pill(field:"status", label:"", values:"")
<div class="mn-prop-pill">
	<span class="mn-prop-label"><$text text={{{ [<label>!is[blank]else<field>] }}}/></span>
	<%if [<values>!is[blank]] %>
		<$select field=<<field>> class="mn-prop-select">
			<$list filter="[enlist<values>]" variable="opt">
				<option value=<<opt>>><$text text=<<opt>>/></option>
			</$list>
		</$select>
	<%else%>
		<span class="mn-prop-value"><$view field=<<field>>/></span>
	<%endif%>
</div>
\end $mn.prop-pill
```

### B. Journal Dashboard Template (`$:/plugins/mblackman/modern-notebook/templates/journal-dashboard`)

This template uses CSS `.mn-wide-view` to break out of the `72ch` reading width on desktop, pairing a top quick-entry bar with a two-column split (Recent Journal Stream + On This Day / Monthly Archive):

```html
\whitespace trim

\function .today-title() [<now "YYYY-0MM-0DD">]

<div class="mn-wide-view mn-journal-dashboard">
	<!-- Top Hero Bar: Open or Create Today's Journal -->
	<section class="mn-dashboard-hero">
		<div class="mn-hero-info">
			<h2 class="mn-hero-heading">Daily Journal</h2>
			<p class="mn-hero-subtitle"><$text text=<<now "DDD, MMM DD, YYYY">>/></p>
		</div>
		<div class="mn-hero-actions">
			<%if [.today-title[]is[tiddler]] %>
				<$button to=<<.today-title>> class="mn-btn-primary">
					Open Today's Entry (<$text text=<<.today-title>>/>)
				</$button>
			<%else%>
				<$button class="mn-btn-primary">
					<$action-sendmessage
						$message="tm-new-tiddler"
						title=<<.today-title>>
						tags="Journal"
						journal-date=<<now "YYYY0MM0DD">>
					/>
					+ Start Today's Journal
				</$button>
			<%endif%>
		</div>
	</section>

	<!-- Filter & Search Bar Bound to Volatile Temp Tiddler -->
	<section class="mn-filter-bar">
		<$edit-text
			tiddler="$:/temp/volatile/modern-notebook/journal-search"
			field="text"
			tag="input"
			type="search"
			placeholder="Filter journal entries by keyword or mood..."
			class="mn-search-input"
		/>
	</section>

	<!-- Journal Stream Grid -->
	<div class="mn-journal-stream">
		<$list filter="[all[tiddlers]tag[Journal]!has[draft.of]search{$:/temp/volatile/modern-notebook/journal-search}!sort[created]limit[15]]">
			<$mn.card badge={{!!mood}}>
				<$fill $name="header">
					<$link to=<<currentTiddler>> class="mn-journal-entry-title">
						<$view field="title"/>
					</$link>
					<span class="mn-timestamp"><$view field="created" format="relativedate"/></span>
				</$fill>
				<div class="mn-journal-excerpt">
					<$transclude mode="block"/>
				</div>
				<$fill $name="footer">
					<$transclude $tiddler="$:/core/ui/ViewTemplate/tags"/>
				</$fill>
			</$mn.card>
		</$list>
	</div>
</div>
```

### C. Project Dashboard Template (`$:/plugins/mblackman/modern-notebook/templates/project-dashboard`)

Uses TiddlyWiki 5.3/5.4 `\function` operators and substituted attributes (`` style=`width: ${ [...] }$%;` ``) to compute live task completion percentages for each project tagged `Project`:

```html
\whitespace trim

\function .project.total-tasks(proj) [all[tiddlers]tag<proj>tag[Task]count[]]
\function .project.done-tasks(proj) [all[tiddlers]tag<proj>tag[Task]tag[Done]count[]]
\function .project.pct(proj)
[.project.total-tasks<proj>match[0]then[0]]
~[.project.done-tasks<proj>multiply[100]divide<.project.total-tasks<proj>>round[]]
\end

<div class="mn-wide-view mn-project-dashboard">
	<!-- Status Filter Tabs (Works as Columns on Desktop, Tabs on Mobile) -->
	<header class="mn-dashboard-header">
		<div class="mn-status-pills">
			<$list filter="All Active [[Next Up]] [[On Hold]] Completed" variable="statusTab">
				<$button
					set="$:/state/modern-notebook/project-status-filter"
					setTo=<<statusTab>>
					selectedClass="mn-pill-active"
					class="mn-pill-btn"
				>
					<$text text=<<statusTab>>/>
				</$button>
			</$list>
		</div>
		<$button class="mn-btn-primary">
			<$action-sendmessage $message="tm-new-tiddler" tags="Project" status="Active"/>
			+ New Project
		</$button>
	</header>

	<!-- Responsive Project Cards Grid -->
	<div class="mn-project-grid">
		<$let activeFilter={{{ [{$:/state/modern-notebook/project-status-filter}!is[blank]else[Active]] }}}>
			<$list filter="[all[tiddlers]tag[Project]!has[draft.of]] :filter[<activeFilter>match[All]or{!!status}match<activeFilter>] +[sort[priority]]">
				<$mn.card badge={{!!status}} accent={{!!color}}>
					<$fill $name="header">
						<$link to=<<currentTiddler>> class="mn-project-title">
							<$view field="caption"><$view field="title"/></$view>
						</$link>
					</$fill>

					<!-- Inline Status & Priority Controls -->
					<div class="mn-project-props">
						<$mn.prop-pill field="status" label="Status" values="Active [[Next Up]] [[On Hold]] Completed"/>
						<$mn.prop-pill field="priority" label="Priority" values="P0 P1 P2 P3"/>
					</div>

					<!-- Dynamic Task Progress Bar Using v5.3+ Substituted Attributes -->
					<div class="mn-progress-wrapper">
						<div class="mn-progress-labels">
							<span>Tasks: <$text text={{{ [.project.done-tasks<currentTiddler>] }}}/> / <$text text={{{ [.project.total-tasks<currentTiddler>] }}}/></span>
							<span><$text text={{{ [.project.pct<currentTiddler>] }}}/>%</span>
						</div>
						<div class="mn-progress-track">
							<div class="mn-progress-fill" style=`width: ${ [.project.pct<currentTiddler>] }$%;`/>
						</div>
					</div>

					<!-- Next Open Tasks Inside Project -->
					<ul class="mn-project-task-list">
						<$list filter="[all[tiddlers]tag<currentTiddler>tag[Task]!tag[Done]limit[3]]" variable="taskItem">
							<li>
								<$checkbox tiddler=<<taskItem>> tag="Done">
									<$link to=<<taskItem>>><$text text=<<taskItem>>/></$link>
								</$checkbox>
							</li>
						</$list>
					</ul>
				</$mn.card>
			</$list>
		</$let>
	</div>
</div>
```

### D. Media Search Widget & Library Hub (`$:/plugins/mblackman/modern-notebook/templates/media-hub`)

Designed around your [tiddlywiki-media-importer](https://github.com/mblackman/tiddlywiki-media-importer/actions/runs/28805698963) workflow, this template wraps your custom media search/importer widget in a collapsible top utility drawer while presenting your imported media tiddlers in a [Capacities](https://capacities.io/)-style poster gallery grid:

```html
\whitespace trim

<div class="mn-wide-view mn-media-hub">
	<!-- Top Search & Importer Action Bar -->
	<header class="mn-media-toolbar">
		<div class="mn-media-search-box">
			<$edit-text
				tiddler="$:/temp/volatile/modern-notebook/media-filter"
				field="text"
				tag="input"
				type="search"
				placeholder="Search library by title, creator, genre, or platform..."
				class="mn-search-input"
			/>
		</div>
		<div class="mn-media-type-pills">
			<$list filter="All Book Manga Game Anime Movie" variable="mediaType">
				<$button
					set="$:/state/modern-notebook/media-type-filter"
					setTo=<<mediaType>>
					selectedClass="mn-pill-active"
					class="mn-pill-btn"
				>
					<$text text=<<mediaType>>/>
				</$button>
			</$list>
		</div>
		<$button
			set="$:/state/modern-notebook/media-importer-drawer"
			setTo={{{ [{$:/state/modern-notebook/media-importer-drawer}match[open]then[closed]else[open]] }}}
			class="mn-btn-primary"
		>
			+ Import / Search External Media
		</$button>
	</header>

	<!-- Collapsible Drawer Housing Your Custom Media Search Widget -->
	<%if [{$:/state/modern-notebook/media-importer-drawer}match[open]] %>
		<section class="mn-media-importer-panel">
			<!-- Transclude or invoke your existing Media Search Widget here -->
			<$transclude $tiddler="$:/plugins/mblackman/media-importer/ui/SearchWidget" mode="block"/>
		</section>
	<%endif%>

	<!-- Responsive 2:3 Poster Card Grid -->
	<div class="mn-media-poster-grid">
		<$let selectedType={{{ [{$:/state/modern-notebook/media-type-filter}!is[blank]else[All]] }}}>
			<$list filter="[all[tiddlers]tag[Media]!has[draft.of]search{$:/temp/volatile/modern-notebook/media-filter}] :filter[<selectedType>match[All]or{!!media-type}match<selectedType>] +[!sort[modified]limit[48]]">
				<article class="mn-media-card">
					<$link to=<<currentTiddler>> class="mn-media-cover-link">
						<%if [{!!cover-url}!is[blank]] %>
							<img src={{!!cover-url}} alt={{!!title}} class="mn-media-cover" loading="lazy"/>
						<%else%>
							<div class="mn-media-cover-placeholder"><$view field="media-type"/></div>
						<%endif%>
						<span class="mn-media-status-badge" data-status={{!!status}}><$view field="status"/></span>
					</$link>
					<div class="mn-media-meta">
						<$link to=<<currentTiddler>> class="mn-media-title">
							<$view field="caption"><$view field="title"/></$view>
						</$link>
						<div class="mn-media-submeta">
							<span><$view field="creator"/></span>
							<%if [{!!rating}!is[blank]] %>
								<span class="mn-media-rating">★ <$view field="rating"/></span>
							<%endif%>
						</div>
					</div>
				</article>
			</$list>
		</$let>
	</div>
</div>
```

## 6. Step-by-Step Build & Verification Roadmap

1. **Milestone 1 — Scaffold the Layout & Token Layer**:
   - Create the plugin folder (`plugins/mblackman/modern-notebook`) in your `Modern.TiddlyDev` or Node.js wiki environment ([Using TiddlyWiki on Node.js](https://tiddlywiki.com/static/Using%2520TiddlyWiki%2520on%2520Node.js.html)).
   - Add `styles/core.css` (`type: text/css`, tagged `$:/tags/Stylesheet`) using `--tpc-*` and `--tp-*` variables ([Writing Stylesheets in Vanilla CSS](https://tiddlywiki.com/static/Writing%2520stylesheets%2520in%2520vanilla%2520CSS.html)).
   - Clone `$:/core/ui/PageTemplate` into `ui/Layout`, tag it `$:/tags/Layout`, and test switching via `Ctrl+Shift+L` ([Alternative Page Layouts](https://tiddlywiki.com/static/Alternative%2520page%2520layouts.html)).
2. **Milestone 2 — Build the Flanking Desktop Panels & Mobile `Zoomin` Bar**:
   - Implement `ui/LeftNav` (pinned dashboard links + open story list) and `ui/RightInspector` bound to `{$:/HistoryList!!current-tiddler}` ([HistoryMechanism](https://tiddlywiki.com/static/HistoryMechanism.html)).
   - Wire `.active-storyview()` to `$:/info/browser/window/system/main/client/width` ([InfoMechanism](https://tiddlywiki.com/static/InfoMechanism.html)) so viewports `< 1024px` switch to `zoomin` and render `ui/MobileBar` + the slide-up Tiddler Action Sheet.
3. **Milestone 3 — Register Cascades for Your Three Core Utilities**:
   - Create `widgets/ui-primitives` (`$:/tags/Global`) with `<$mn.card>` and `<$mn.prop-pill>` ([Custom Widgets](https://tiddlywiki.com/static/Custom%2520Widgets.html)).
   - Add `$:/tags/ViewTemplateBodyFilter` cascade tiddlers for `JournalDashboard`, `ProjectDashboard`, and `MediaDashboard`, plus an inline property header (`$:/tags/ViewTemplate`) for individual `Project` and `Media` tiddlers.
4. **Milestone 4 — Settings Tab & Performance Audit**:
   - Add `settings.tid` tagged `$:/tags/ControlPanel/SettingsTab` to expose custom reading width, panel default states, and mobile breakpoint toggles.
   - Verify that all search inputs write to `$:/temp/volatile/` ([RefreshThrottling](https://tiddlywiki.com/static/RefreshThrottling.html)) and that all dashboard filters lead with indexed `[all[tiddlers]tag[...]]` operators ([Performance](https://tiddlywiki.com/static/Performance.html)).
