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
	var prefersReducedMotion = typeof win.matchMedia === "function" && win.matchMedia("(prefers-reduced-motion: reduce)").matches;

	try {
		win.scrollTo({ top: top, left: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
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

exports.resolveNextActiveTiddler = function(wiki, closedTitle, storyList, previousStoryList) {
	wiki = wiki || $tw.wiki;
	storyList = storyList || wiki.getTiddlerList("$:/StoryList");
	if(!storyList || storyList.length === 0) {
		return "";
	}
	if(closedTitle) {
		// 1. If closedTitle was a non-draft and its draft is in StoryList, transition to draft
		var draftTitle = "Draft of '" + closedTitle + "'";
		if(storyList.indexOf(draftTitle) !== -1) {
			return draftTitle;
		}
		// 2. If closedTitle was a draft that was just saved/canceled, transition to original note
		if(closedTitle.indexOf("Draft of '") === 0) {
			var origTitle = closedTitle.substring(10, closedTitle.length - 1);
			if(storyList.indexOf(origTitle) !== -1) {
				return origTitle;
			}
		}
	}

	var closeTargetMode = (wiki.getTiddlerText("$:/config/slipstream/close-tiddler-target", "previous") || "previous").trim();

	// 3. When configured to return to previously opened note ("previous"), walk backwards through $:/HistoryList
	if(closeTargetMode !== "story") {
		var closedBaseTitle = (closedTitle && closedTitle.indexOf("Draft of '") === 0)
			? closedTitle.substring(10, closedTitle.length - 1)
			: closedTitle;
		var historyList = wiki.getTiddlerDataCached("$:/HistoryList", []);
		if(Array.isArray(historyList)) {
			for(var i = historyList.length - 1; i >= 0; i--) {
				var entryTitle = historyList[i] && historyList[i].title;
				if(!entryTitle || entryTitle === closedTitle || entryTitle === closedBaseTitle) {
					continue;
				}
				if(storyList.indexOf(entryTitle) !== -1) {
					return entryTitle;
				}
				// If history entry was a draft whose saved note is now in StoryList (or vice-versa)
				if(entryTitle.indexOf("Draft of '") === 0) {
					var entryOrig = entryTitle.substring(10, entryTitle.length - 1);
					if(entryOrig !== closedTitle && entryOrig !== closedBaseTitle && storyList.indexOf(entryOrig) !== -1) {
						return entryOrig;
					}
				} else {
					var entryDraft = "Draft of '" + entryTitle + "'";
					if(entryDraft !== closedTitle && storyList.indexOf(entryDraft) !== -1) {
						return entryDraft;
					}
				}
			}
		}
	}

	// 4. Fallback or "story" mode: adjacent note in StoryList (or first open note)
	if(closeTargetMode === "story" && closedTitle && Array.isArray(previousStoryList)) {
		var oldIdx = previousStoryList.indexOf(closedTitle);
		if(oldIdx !== -1) {
			// Prefer the previous sibling in the story river (matching FadeStoryView.remove), or next sibling
			for(var p = oldIdx - 1; p >= 0; p--) {
				if(storyList.indexOf(previousStoryList[p]) !== -1) {
					return previousStoryList[p];
				}
			}
			for(var n = oldIdx + 1; n < previousStoryList.length; n++) {
				if(storyList.indexOf(previousStoryList[n]) !== -1) {
					return previousStoryList[n];
				}
			}
		}
	}

	return storyList[0];
};

exports.popClosedFromHistory = function(historyData, closedTitle, nextCurrent) {
	if(!Array.isArray(historyData)) {
		return nextCurrent ? [{ title: nextCurrent }] : [];
	}
	var closedBaseTitle = (closedTitle && closedTitle.indexOf("Draft of '") === 0)
		? closedTitle.substring(10, closedTitle.length - 1)
		: closedTitle;
	var closedDraftTitle = closedBaseTitle ? ("Draft of '" + closedBaseTitle + "'") : "";
	var trimmed = historyData.slice();
	// Pop trailing entries matching the closed tiddler (and its draft/base counterpart)
	// so the stack naturally unwinds back to the previously opened note
	while(trimmed.length > 0) {
		var topTitle = trimmed[trimmed.length - 1] && trimmed[trimmed.length - 1].title;
		if(topTitle === closedTitle || (closedBaseTitle && topTitle === closedBaseTitle) || (closedDraftTitle && topTitle === closedDraftTitle)) {
			trimmed.pop();
		} else {
			break;
		}
	}
	if(nextCurrent) {
		var newTop = trimmed.length > 0 ? (trimmed[trimmed.length - 1] && trimmed[trimmed.length - 1].title) : "";
		if(newTop !== nextCurrent) {
			trimmed.push({ title: nextCurrent });
		}
	}
	return trimmed;
};

exports.startup = function() {
	var lastStoryList = $tw.wiki.getTiddlerList("$:/StoryList");

	$tw.wiki.addEventListener("change", function(changes) {
		if(changes["$:/StoryList"]) {
			var prevStoryList = lastStoryList;
			var storyList = $tw.wiki.getTiddlerList("$:/StoryList");
			lastStoryList = storyList;
			var historyTid = $tw.wiki.getTiddler("$:/HistoryList");
			var current = historyTid ? (historyTid.fields["current-tiddler"] || "") : "";
			if(current && storyList.indexOf(current) === -1) {
				var nextCurrent = exports.resolveNextActiveTiddler($tw.wiki, current, storyList, prevStoryList);
				var isDraftTransition = (nextCurrent === "Draft of '" + current + "'") ||
					(current.indexOf("Draft of '") === 0 && nextCurrent === current.substring(10, current.length - 1));
				var closeTargetMode = ($tw.wiki.getTiddlerText("$:/config/slipstream/close-tiddler-target", "previous") || "previous").trim();
				if(!isDraftTransition && closeTargetMode !== "story") {
					var historyData = $tw.wiki.getTiddlerData("$:/HistoryList", []);
					var updatedHistory = exports.popClosedFromHistory(historyData, current, nextCurrent);
					$tw.wiki.setTiddlerData("$:/HistoryList", updatedHistory, { "current-tiddler": nextCurrent });
				} else {
					$tw.wiki.setText("$:/HistoryList", "current-tiddler", null, nextCurrent);
				}
			} else if(current) {
				// If current is still in StoryList, check if a draft of current was newly opened
				var activeDraft = "Draft of '" + current + "'";
				if(storyList.indexOf(activeDraft) !== -1) {
					$tw.wiki.setText("$:/HistoryList", "current-tiddler", null, activeDraft);
				} else {
					// Clean up any closed non-active tiddlers from $:/HistoryList so closing a later tiddler won't try to return to a closed one
					var existingHistory = $tw.wiki.getTiddlerDataCached("$:/HistoryList", []);
					if(Array.isArray(existingHistory) && existingHistory.length > 0) {
						var filteredHistory = existingHistory.filter(function(item) {
							var t = item && item.title;
							if(!t) return false;
							if(storyList.indexOf(t) !== -1) return true;
							if(t.indexOf("Draft of '") === 0) {
								return storyList.indexOf(t.substring(10, t.length - 1)) !== -1;
							}
							return storyList.indexOf("Draft of '" + t + "'") !== -1;
						});
						if(filteredHistory.length !== existingHistory.length) {
							$tw.wiki.setTiddlerData("$:/HistoryList", filteredHistory, { "current-tiddler": current });
						}
					}
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
			document.addEventListener("focusin", function(event) {
				var target = event && event.target;
				if(target && target.classList && target.classList.contains("mn-field-input-name") && !target.getAttribute("list")) {
					target.setAttribute("list", "mn-existing-fields-list");
				}
			});
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
