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

exports.scrollToHeading = function(event, docOverride, winOverride) {
	var doc = docOverride || (typeof document !== "undefined" ? document : null);
	var win = winOverride || (typeof window !== "undefined" ? window : null);
	var paramObj = (event && event.paramObject) ? event.paramObject : {};
	var targetTitle = paramObj.tiddler || "";
	var headingIndex = parseInt(paramObj.index || "0", 10);
	var headingText = (paramObj.heading || "").trim().toLowerCase();
	var parsedOccurrence = paramObj.occurrence !== undefined && paramObj.occurrence !== null && paramObj.occurrence !== ""
		? parseInt(paramObj.occurrence, 10)
		: NaN;

	// Close mobile context sheet if open
	if($tw.wiki.getTiddlerText("$:/state/slipstream/mobile-context-sheet") === "open") {
		$tw.wiki.addTiddler({
			title: "$:/state/slipstream/mobile-context-sheet",
			text: "closed"
		});
	}

	if(!doc || !win) {
		return false;
	}

	// Locate the tiddler frame in the story container
	var frames = doc.querySelectorAll(".mn-story-container .tc-tiddler-frame");
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
	var rawHeadings = body.querySelectorAll("h1, h2, h3, h4, h5, h6");
	if(!rawHeadings || rawHeadings.length === 0) {
		return false;
	}
	var allHeadings = Array.prototype.slice.call(rawHeadings);

	// Exclude headings rendered inside UI widget cards/heroes (.mn-hero, .mn-card)
	// so document outline indices align with actual prose headings
	var docHeadings = allHeadings.filter(function(h) {
		return !h.closest || !h.closest(".mn-hero, .mn-card");
	});
	if(docHeadings.length === 0) {
		docHeadings = allHeadings;
	}

	// Determine which occurrence (0-based) of headingText is being targeted
	var targetOccurrence = !isNaN(parsedOccurrence) && parsedOccurrence >= 0 ? parsedOccurrence : 0;
	if(isNaN(parsedOccurrence) && targetTitle && $tw.wiki && headingIndex > 0 && headingText) {
		var rawTiddlerText = $tw.wiki.getTiddlerText(targetTitle) || "";
		var lines = rawTiddlerText.split(/\r?\n/);
		var hIdx = 0;
		var sameTextCount = 0;
		for(var l = 0; l < lines.length; l++) {
			var trimmedLine = lines[l].trim();
			if(/^!+\s+/.test(trimmedLine)) {
				if(hIdx >= headingIndex) {
					break;
				}
				var cleanedLine = trimmedLine
					.replace(/^!{1,6}\s*/, "")
					.replace(/''|\/\/|`|~~/g, "")
					.trim()
					.toLowerCase();
				if(cleanedLine === headingText) {
					sameTextCount++;
				}
				hIdx++;
			}
		}
		targetOccurrence = sameTextCount;
	}

	function findByOccurrence(list, text, occ) {
		if(!text) return null;
		var exact = [];
		var partial = [];
		for(var j = 0; j < list.length; j++) {
			var hText = (list[j].textContent || "").trim().toLowerCase();
			if(hText === text) {
				exact.push(list[j]);
			} else if(hText.indexOf(text) !== -1 || text.indexOf(hText) !== -1) {
				partial.push(list[j]);
			}
		}
		if(exact.length > 0) {
			return exact[Math.min(occ, exact.length - 1)];
		}
		if(partial.length > 0) {
			return partial[Math.min(occ, partial.length - 1)];
		}
		return null;
	}

	var targetHeading = null;
	// 1. Direct index match on prose headings when text agrees
	if(headingIndex >= 0 && headingIndex < docHeadings.length) {
		var candidate = docHeadings[headingIndex];
		var candText = (candidate.textContent || "").trim().toLowerCase();
		if(!headingText || candText === headingText) {
			targetHeading = candidate;
		}
	}
	// 2. Occurrence-aware text match across prose headings (handles duplicate heading names like "Live Example")
	if(!targetHeading && headingText) {
		targetHeading = findByOccurrence(docHeadings, headingText, targetOccurrence);
	}
	// 3. Direct index match when partial text agrees
	if(!targetHeading && headingIndex >= 0 && headingIndex < docHeadings.length) {
		var candPartial = docHeadings[headingIndex];
		var candPartialText = (candPartial.textContent || "").trim().toLowerCase();
		if(headingText && (candPartialText.indexOf(headingText) !== -1 || headingText.indexOf(candPartialText) !== -1)) {
			targetHeading = candPartial;
		}
	}
	// 4. Fallback to occurrence-aware text match across all headings (including widget headings) or raw index
	if(!targetHeading && headingText) {
		targetHeading = findByOccurrence(allHeadings, headingText, targetOccurrence);
	}
	if(!targetHeading && headingIndex >= 0 && headingIndex < docHeadings.length) {
		targetHeading = docHeadings[headingIndex];
	}
	if(!targetHeading && headingIndex >= 0 && headingIndex < allHeadings.length) {
		targetHeading = allHeadings[headingIndex];
	}
	if(!targetHeading) {
		return false;
	}

	// Compute sticky header offset (topbar + mobile pill strip or pinned tiddler bar if visible)
	var offset = 72;
	var topbar = doc.querySelector(".mn-topbar");
	if(topbar) {
		offset = topbar.getBoundingClientRect().height + 18;
	}
	var pillStrip = doc.querySelector(".mn-mobile-pill-strip");
	if(pillStrip && win.getComputedStyle(pillStrip).display !== "none") {
		offset += pillStrip.getBoundingClientRect().height;
	}
	var pinnedBar = doc.querySelector(".mn-pinned-tiddler-bar");
	if(pinnedBar && win.getComputedStyle(pinnedBar).display !== "none") {
		offset += pinnedBar.getBoundingClientRect().height;
	}

	var rect = targetHeading.getBoundingClientRect();
	var scrollY = win.pageYOffset !== undefined ? win.pageYOffset : (doc.documentElement.scrollTop || 0);
	var top = Math.max(0, rect.top + scrollY - offset);

	try {
		win.scrollTo({ top: top, left: 0, behavior: "smooth" });
	} catch(e) {
		win.scrollTo(0, top);
	}

	// Brief visual highlight on the target heading
	$tw.utils.addClass(targetHeading, "mn-heading-highlight");
	setTimeout(function() {
		$tw.utils.removeClass(targetHeading, "mn-heading-highlight");
	}, 1400);

	return false;
};

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
			return exports.scrollToHeading(event);
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
