/*\
title: $:/plugins/mblackman/slipstream/startup/sync-history.js
type: application/javascript
module-type: startup

Synchronize $:/HistoryList!!current-tiddler when the focused note is deleted or closed.

\*/
(function(){

"use strict";

exports.name = "slipstream-sync-history";
exports.after = ["story"];
exports.synchronous = true;

exports.startup = function() {
	$tw.wiki.addEventListener("change", function(changes) {
		if(changes["$:/StoryList"]) {
			var storyList = $tw.wiki.getTiddlerList("$:/StoryList");
			var historyTid = $tw.wiki.getTiddler("$:/HistoryList");
			var current = historyTid ? (historyTid.fields["current-tiddler"] || "") : "";
			if(current && storyList.indexOf(current) === -1) {
				var nextCurrent = "";
				// 1. If current was a non-draft and its draft is in StoryList, transition to draft
				var draftTitle = "Draft of '" + current + "'";
				if(storyList.indexOf(draftTitle) !== -1) {
					nextCurrent = draftTitle;
				} else if(current.indexOf("Draft of '") === 0) {
					// 2. If current was a draft that was just saved/canceled, transition to original note
					var origTitle = current.substring(10, current.length - 1);
					if(storyList.indexOf(origTitle) !== -1) {
						nextCurrent = origTitle;
					}
				}
				if(!nextCurrent) {
					nextCurrent = storyList.length > 0 ? storyList[0] : "";
				}
				$tw.wiki.setText("$:/HistoryList", "current-tiddler", null, nextCurrent);
			} else if(current) {
				// If current is still in StoryList, check if a draft of current was newly opened
				var activeDraft = "Draft of '" + current + "'";
				if(storyList.indexOf(activeDraft) !== -1) {
					$tw.wiki.setText("$:/HistoryList", "current-tiddler", null, activeDraft);
				}
			}
		}
	});

	if($tw.browser && $tw.rootWidget) {
		$tw.rootWidget.addEventListener("tm-slipstream-scroll-heading", function(event) {
			var paramObj = event.paramObject || {};
			var targetTitle = paramObj.tiddler || "";
			var headingIndex = parseInt(paramObj.index || "0", 10);
			var headingText = (paramObj.heading || "").trim().toLowerCase();

			// Close mobile context sheet if open
			if($tw.wiki.getTiddlerText("$:/state/slipstream/mobile-context-sheet") === "open") {
				$tw.wiki.addTiddler({
					title: "$:/state/slipstream/mobile-context-sheet",
					text: "closed"
				});
			}

			if(typeof document === "undefined" || typeof window === "undefined") {
				return false;
			}

			// Locate the tiddler frame in the story container
			var frames = document.querySelectorAll(".mn-story-container .tc-tiddler-frame");
			var targetFrame = null;
			for(var i = 0; i < frames.length; i++) {
				var frame = frames[i];
				if(frame.getAttribute("data-tiddler-title") === targetTitle) {
					targetFrame = frame;
					break;
				}
			}
			if(!targetFrame && frames.length > 0) {
				targetFrame = frames[0];
			}
			if(!targetFrame) {
				return false;
			}

			var body = targetFrame.querySelector(".tc-tiddler-body") || targetFrame;
			var headings = body.querySelectorAll("h1, h2, h3, h4, h5, h6");
			if(!headings || headings.length === 0) {
				return false;
			}

			// Match by text first (with occurrence awareness), or fall back to index
			var targetHeading = null;
			if(headingIndex >= 0 && headingIndex < headings.length) {
				var candidate = headings[headingIndex];
				var candText = (candidate.textContent || "").trim().toLowerCase();
				if(!headingText || candText === headingText || candText.indexOf(headingText) !== -1 || headingText.indexOf(candText) !== -1) {
					targetHeading = candidate;
				}
			}
			if(!targetHeading && headingText) {
				for(var j = 0; j < headings.length; j++) {
					var hText = (headings[j].textContent || "").trim().toLowerCase();
					if(hText === headingText || hText.indexOf(headingText) !== -1 || headingText.indexOf(hText) !== -1) {
						targetHeading = headings[j];
						break;
					}
				}
			}
			if(!targetHeading && headingIndex >= 0 && headingIndex < headings.length) {
				targetHeading = headings[headingIndex];
			}
			if(!targetHeading) {
				return false;
			}

			// Compute sticky header offset (topbar + mobile pill strip or pinned tiddler bar if visible)
			var offset = 72;
			var topbar = document.querySelector(".mn-topbar");
			if(topbar) {
				offset = topbar.getBoundingClientRect().height + 18;
			}
			var pillStrip = document.querySelector(".mn-mobile-pill-strip");
			if(pillStrip && window.getComputedStyle(pillStrip).display !== "none") {
				offset += pillStrip.getBoundingClientRect().height;
			}
			var pinnedBar = document.querySelector(".mn-pinned-tiddler-bar");
			if(pinnedBar && window.getComputedStyle(pinnedBar).display !== "none") {
				offset += pinnedBar.getBoundingClientRect().height;
			}

			var rect = targetHeading.getBoundingClientRect();
			var scrollY = window.pageYOffset !== undefined ? window.pageYOffset : (document.documentElement.scrollTop || 0);
			var top = Math.max(0, rect.top + scrollY - offset);

			try {
				window.scrollTo({ top: top, left: 0, behavior: "smooth" });
			} catch(e) {
				window.scrollTo(0, top);
			}

			// Brief visual highlight on the target heading
			$tw.utils.addClass(targetHeading, "mn-heading-highlight");
			setTimeout(function() {
				$tw.utils.removeClass(targetHeading, "mn-heading-highlight");
			}, 1400);

			return false;
		});

		// Global Search & Quick Switcher Shortcut Listener (Cmd/Ctrl+K or Ctrl/Cmd+Shift+F)
		if(typeof document !== "undefined" && typeof window !== "undefined") {
			document.addEventListener("keydown", function(event) {
				var isCmdOrCtrl = event.metaKey || event.ctrlKey;
				var keyLower = (event.key || "").toLowerCase();
				var isCmdK = isCmdOrCtrl && !event.shiftKey && !event.altKey && keyLower === "k";
				var isShiftF = isCmdOrCtrl && event.shiftKey && !event.altKey && keyLower === "f";
				if(!isCmdK && !isShiftF) {
					return;
				}
				var appShell = document.querySelector(".mn-app-shell");
				if(!appShell) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();

				var isMobile = appShell.classList.contains("mn-is-mobile");
				if(isMobile) {
					$tw.wiki.addTiddler({
						title: "$:/state/slipstream/mobile-search",
						text: "open"
					});
				}
				$tw.wiki.addTiddler({
					title: "$:/state/slipstream/search-open",
					text: "yes"
				});
				setTimeout(function() {
					var input = appShell.querySelector(".mn-mobile-search-input") || appShell.querySelector(".mn-topbar-center .mn-search-input");
					if(input && typeof input.focus === "function") {
						input.focus();
						if(typeof input.select === "function") {
							input.select();
						}
					}
				}, 20);
			});
		}
	}
};

})();
