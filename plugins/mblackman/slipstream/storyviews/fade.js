/*\
title: $:/plugins/mblackman/slipstream/storyviews/fade.js
type: application/javascript
module-type: storyview

Smooth single-tiddler cross-fade story river view for mobile and compact viewports.

\*/
(function(){

"use strict";

// Standard Apple Fluid Decelerate curve for crisp, snappy mobile navigation
var easing = "cubic-bezier(0.16, 1, 0.3, 1)";
var scrollPositionsByTitle = Object.create(null);
var isNavigating = false;
var navigationTimer = null;
var activeStoryView = null;

// Modern mobile note apps (Obsidian, Apple Notes, Bear, Craft) use 120-150ms for note transitions
function getAnimationDuration(wiki) {
	if(typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		return 0;
	}
	var animDuration = $tw.utils.getAnimationDuration();
	if(typeof animDuration === "number" && animDuration === 0) {
		return 0;
	}
	if(wiki) {
		var custom = parseInt(wiki.getTiddlerText("$:/config/slipstream/mobile-animation-duration", ""), 10);
		if(!isNaN(custom) && custom >= 0) {
			return custom;
		}
	}
	return 130;
}

function isElement(node) {
	if(!node) {
		return false;
	}
	if(typeof Element !== "undefined") {
		return node instanceof Element;
	}
	return node.nodeType !== 3;
}

function isTextNode(node) {
	if(!node) {
		return false;
	}
	if(typeof Node !== "undefined") {
		return node.nodeType === Node.TEXT_NODE;
	}
	return node.nodeType === 3;
}

if(typeof history !== "undefined" && "scrollRestoration" in history) {
	try {
		history.scrollRestoration = "manual";
	} catch(e) {}
}

function getScrollTop() {
	if(typeof window === "undefined") {
		return 0;
	}
	if(window.pageYOffset !== undefined) {
		return window.pageYOffset;
	}
	if(typeof document !== "undefined") {
		if(document.documentElement && typeof document.documentElement.scrollTop === "number") {
			return document.documentElement.scrollTop;
		}
		if(document.body && typeof document.body.scrollTop === "number") {
			return document.body.scrollTop;
		}
	}
	return 0;
}

function scrollToPosition(top, smooth) {
	if(typeof window === "undefined") {
		return;
	}
	if(typeof $tw !== "undefined" && $tw.pageScroller && typeof $tw.pageScroller.cancelScroll === "function") {
		$tw.pageScroller.cancelScroll(window);
	}
	top = Math.max(0, top || 0);
	var behavior = smooth ? "smooth" : "auto";
	try {
		window.scrollTo({ top: top, left: 0, behavior: behavior });
	} catch(e) {
		try {
			window.scrollTo(0, top);
		} catch(e2) {}
	}
	if(!smooth && typeof document !== "undefined") {
		if(document.documentElement && typeof document.documentElement.scrollTop === "number") {
			document.documentElement.scrollTop = top;
		}
		if(document.body && typeof document.body.scrollTop === "number") {
			document.body.scrollTop = top;
		}
	}
}

function getSavedPosition(title) {
	if(!title) {
		return undefined;
	}
	if(typeof scrollPositionsByTitle[title] === "number") {
		return scrollPositionsByTitle[title];
	}
	// Check if this is a draft of an existing tiddler
	if(title.indexOf("Draft of '") === 0) {
		var orig = title.substring(10, title.length - 1);
		if(typeof scrollPositionsByTitle[orig] === "number") {
			return scrollPositionsByTitle[orig];
		}
	}
	return undefined;
}

function setSavedPosition(title, pos) {
	if(!title) {
		return;
	}
	pos = Math.max(0, pos || 0);
	scrollPositionsByTitle[title] = pos;
	if(title.indexOf("Draft of '") === 0) {
		var orig = title.substring(10, title.length - 1);
		scrollPositionsByTitle[orig] = pos;
	}
}

function pruneScrollPositions(listWidget) {
	if(!listWidget || !listWidget.children) {
		return;
	}
	var openTitles = {};
	$tw.utils.each(listWidget.children, function(child) {
		var title = child.parseTreeNode && child.parseTreeNode.itemTitle;
		if(title) {
			openTitles[title] = true;
		}
	});
	for(var title in scrollPositionsByTitle) {
		if(!openTitles[title]) {
			delete scrollPositionsByTitle[title];
		}
	}
}

// Track active tiddler scroll position continuously on window scroll
if(typeof window !== "undefined") {
	window.addEventListener("scroll", function() {
		if(isNavigating || !activeStoryView || !activeStoryView.currentTiddlerTitle) {
			return;
		}
		setSavedPosition(activeStoryView.currentTiddlerTitle, getScrollTop());
	}, { passive: true });
}

var FadeStoryView = function(listWidget) {
	var self = this;
	this.listWidget = listWidget;
	activeStoryView = this;

	// Determine active tiddler from history list, or first tiddler in story
	var history = this.listWidget.wiki.getTiddlerDataCached(this.listWidget.historyTitle, []),
		targetTiddler;
	if(Array.isArray(history)) {
		this.listWidget.history = history.slice();
		if(history.length > 0) {
			targetTiddler = history[history.length - 1].title;
		}
	}

	// Make single-tiddler presentation: display only active tiddler, hide others
	$tw.utils.each(this.listWidget.children, function(itemWidget, index) {
		var domNode = itemWidget.findFirstDomNode();
		if(!isElement(domNode)) {
			return;
		}
		var itemTitle = itemWidget.parseTreeNode ? itemWidget.parseTreeNode.itemTitle : null;
		if((targetTiddler && targetTiddler !== itemTitle) || (!targetTiddler && index)) {
			domNode.style.display = "none";
		} else {
			self.currentTiddlerDomNode = domNode;
			self.currentTiddlerTitle = itemTitle;
			domNode.style.display = "block";
		}
		$tw.utils.addClass(domNode, "mn-storyview-fade-tiddler");
	});

	if(!this.currentTiddlerTitle && this.listWidget.children.length > 0) {
		var firstChild = this.listWidget.children[0];
		this.currentTiddlerTitle = firstChild.parseTreeNode ? firstChild.parseTreeNode.itemTitle : null;
		this.currentTiddlerDomNode = firstChild.findFirstDomNode();
	}

	pruneScrollPositions(this.listWidget);
};

FadeStoryView.prototype.navigateTo = function(historyInfo) {
	var duration = getAnimationDuration(this.listWidget.wiki);

	var targetTitle = historyInfo.title;
	var listElementIndex = this.listWidget.findListItem(0, targetTitle);
	if(listElementIndex === undefined) {
		return;
	}

	var listItemWidget = this.listWidget.children[listElementIndex],
		targetElement = listItemWidget.findFirstDomNode();

	if(!targetElement || isTextNode(targetElement)) {
		return;
	}

	// If already currently displayed, scroll viewport to top smoothly and reset saved state to 0
	if(targetElement === this.currentTiddlerDomNode && targetElement.style.display !== "none") {
		setSavedPosition(targetTitle, 0);
		scrollToPosition(0, true);
		return;
	}

	// Clear any pending navigation settling timer from rapid switching
	if(navigationTimer) {
		clearTimeout(navigationTimer);
		navigationTimer = null;
	}

	// 1. Save scroll position of the outgoing tiddler before navigating away
	if(this.currentTiddlerTitle) {
		setSavedPosition(this.currentTiddlerTitle, getScrollTop());
	}

	// 2. Determine target scroll position: keep saved place, or go to top (0) if no state saved
	var savedPos = getSavedPosition(targetTitle);
	var targetScroll = (typeof savedPos === "number") ? savedPos : 0;

	var self = this,
		prevCurrentTiddler = this.currentTiddlerDomNode;

	this.currentTiddlerDomNode = targetElement;
	this.currentTiddlerTitle = targetTitle;
	activeStoryView = this;

	$tw.utils.addClass(targetElement, "mn-storyview-fade-tiddler");

	// Mark navigation in progress so scroll listeners do not record intermediate positions
	isNavigating = true;

	if(duration <= 0) {
		if(prevCurrentTiddler && prevCurrentTiddler !== targetElement) {
			prevCurrentTiddler.style.display = "none";
		}
		targetElement.style.display = "block";
		targetElement.style.opacity = "1";
		scrollToPosition(targetScroll, false);
		isNavigating = false;
		return;
	}

	if(prevCurrentTiddler && prevCurrentTiddler !== targetElement && prevCurrentTiddler.style.display !== "none") {
		// Clean swap:
		// 1. Make incoming tiddler display block at opacity 0 first so story river height never collapses
		$tw.utils.setStyle(targetElement, [
			{display: "block"},
			{transition: "none"},
			{opacity: "0"}
		]);

		// 2. Hide outgoing tiddler immediately to prevent muddy text ghosting
		prevCurrentTiddler.style.display = "none";

		// 3. Force reflow on targetElement so it is measured in document layout
		$tw.utils.forceLayout(targetElement);
		$tw.utils.addClass(targetElement, "mn-tiddler-fading-in");

		// 4. Immediately restore target scroll position
		scrollToPosition(targetScroll, false);

		// 5. Start quick fade-in transition
		$tw.utils.setStyle(targetElement, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "1"}
		]);

		// 6. Re-affirm target scroll position on next animation frame and microtask
		if(typeof requestAnimationFrame !== "undefined") {
			requestAnimationFrame(function() {
				scrollToPosition(targetScroll, false);
			});
		}
		setTimeout(function() {
			scrollToPosition(targetScroll, false);
		}, 40);

		// 7. Complete visual transition
		setTimeout(function() {
			$tw.utils.removeClass(targetElement, "mn-tiddler-fading-in");
			$tw.utils.removeStyles(targetElement, ["transition", "opacity"]);
			scrollToPosition(targetScroll, false);
		}, duration);

		// 8. Maintain navigation lock until browser touch momentum and layout reflow fully settle
		navigationTimer = setTimeout(function() {
			scrollToPosition(targetScroll, false);
			isNavigating = false;
			navigationTimer = null;
		}, Math.max(duration + 180, 320));
	} else {
		// First appearance or no visible previous tiddler
		$tw.utils.setStyle(targetElement, [
			{display: "block"},
			{transition: "none"},
			{opacity: "0"}
		]);
		$tw.utils.forceLayout(targetElement);
		$tw.utils.addClass(targetElement, "mn-tiddler-fading-in");

		scrollToPosition(targetScroll, false);

		$tw.utils.setStyle(targetElement, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "1"}
		]);

		if(typeof requestAnimationFrame !== "undefined") {
			requestAnimationFrame(function() {
				scrollToPosition(targetScroll, false);
			});
		}
		setTimeout(function() {
			scrollToPosition(targetScroll, false);
		}, 40);

		setTimeout(function() {
			$tw.utils.removeClass(targetElement, "mn-tiddler-fading-in");
			$tw.utils.removeStyles(targetElement, ["transition", "opacity"]);
			scrollToPosition(targetScroll, false);
		}, duration);

		navigationTimer = setTimeout(function() {
			scrollToPosition(targetScroll, false);
			isNavigating = false;
			navigationTimer = null;
		}, Math.max(duration + 180, 320));
	}
};

FadeStoryView.prototype.insert = function(widget) {
	var targetElement = widget.findFirstDomNode();
	if(!targetElement || isTextNode(targetElement)) {
		return;
	}
	$tw.utils.addClass(targetElement, "mn-storyview-fade-tiddler");
	// Tiddler starts hidden; navigateTo will animate it in immediately upon navigation
	$tw.utils.setStyle(targetElement, [
		{display: "none"}
	]);
};

FadeStoryView.prototype.remove = function(widget) {
	var targetElement = widget.findFirstDomNode(),
		duration = getAnimationDuration(this.listWidget.wiki),
		closedTitle = widget.parseTreeNode ? widget.parseTreeNode.itemTitle : null,
		removeElement = function() {
			widget.removeChildDomNodes();
		};

	if(closedTitle) {
		delete scrollPositionsByTitle[closedTitle];
	}

	if(navigationTimer) {
		clearTimeout(navigationTimer);
		navigationTimer = null;
	}

	if(!targetElement || isTextNode(targetElement)) {
		removeElement();
		return;
	}

	// If already hidden or animations disabled, remove immediately without animation
	if(targetElement.style.display === "none" || duration <= 0) {
		removeElement();
		return;
	}

	// Reveal target tiddler when closing the active tiddler:
	// In "previous" mode (default), prefer the most recently visited open tiddler from history;
	// in "story" mode (or if no history match exists), reveal the adjacent tiddler in the story river.
	var toWidget = null;
	var wiki = this.listWidget.wiki;
	var closeTargetMode = wiki ? (wiki.getTiddlerText("$:/config/slipstream/close-tiddler-target", "previous") || "previous").trim() : "previous";
	if(closeTargetMode !== "story" && wiki && this.listWidget.historyTitle) {
		var closedBaseTitle = (closedTitle && closedTitle.indexOf("Draft of '") === 0)
			? closedTitle.substring(10, closedTitle.length - 1)
			: closedTitle;
		var historyList = wiki.getTiddlerDataCached(this.listWidget.historyTitle, []);
		if(Array.isArray(historyList)) {
			for(var h = historyList.length - 1; h >= 0; h--) {
				var hTitle = historyList[h] && historyList[h].title;
				if(!hTitle || hTitle === closedTitle || hTitle === closedBaseTitle) {
					continue;
				}
				var candidateIdx = this.listWidget.findListItem(0, hTitle);
				if(candidateIdx === undefined) {
					if(hTitle.indexOf("Draft of '") === 0) {
						var origTitle = hTitle.substring(10, hTitle.length - 1);
						if(origTitle !== closedTitle && origTitle !== closedBaseTitle) {
							candidateIdx = this.listWidget.findListItem(0, origTitle);
						}
					} else {
						var draftTitle = "Draft of '" + hTitle + "'";
						if(draftTitle !== closedTitle) {
							candidateIdx = this.listWidget.findListItem(0, draftTitle);
						}
					}
				}
				if(candidateIdx !== undefined && this.listWidget.children[candidateIdx] !== widget) {
					toWidget = this.listWidget.children[candidateIdx];
					break;
				}
			}
		}
	}
	if(!toWidget) {
		toWidget = widget.previousSibling() || widget.nextSibling();
	}
	var toWidgetDomNode = toWidget && toWidget.findFirstDomNode();
	var toWidgetTitle = toWidget && toWidget.parseTreeNode ? toWidget.parseTreeNode.itemTitle : null;

	if(toWidgetDomNode && !isTextNode(toWidgetDomNode)) {
		$tw.utils.addClass(toWidgetDomNode, "mn-storyview-fade-tiddler");
		$tw.utils.addClass(targetElement, "mn-tiddler-fading-out");

		$tw.utils.setStyle(toWidgetDomNode, [
			{display: "block"},
			{transition: "none"},
			{opacity: "0"}
		]);
		$tw.utils.forceLayout(toWidgetDomNode);
		$tw.utils.addClass(toWidgetDomNode, "mn-tiddler-fading-in");

		$tw.utils.setStyle(toWidgetDomNode, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "1"}
		]);
		$tw.utils.setStyle(targetElement, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "0"}
		]);

		this.currentTiddlerDomNode = toWidgetDomNode;
		this.currentTiddlerTitle = toWidgetTitle;
		activeStoryView = this;

		var savedPos = getSavedPosition(toWidgetTitle);
		var toScroll = (typeof savedPos === "number") ? savedPos : 0;

		isNavigating = true;
		scrollToPosition(toScroll, false);
		if(typeof requestAnimationFrame !== "undefined") {
			requestAnimationFrame(function() {
				scrollToPosition(toScroll, false);
			});
		}
		setTimeout(function() {
			scrollToPosition(toScroll, false);
		}, 40);

		setTimeout(function() {
			$tw.utils.removeClass(toWidgetDomNode, "mn-tiddler-fading-in");
			$tw.utils.removeStyles(toWidgetDomNode, ["transition", "opacity"]);
			removeElement();
			scrollToPosition(toScroll, false);
		}, duration);

		navigationTimer = setTimeout(function() {
			scrollToPosition(toScroll, false);
			isNavigating = false;
			navigationTimer = null;
		}, Math.max(duration + 180, 320));
	} else {
		// Single tiddler remaining
		this.currentTiddlerDomNode = null;
		this.currentTiddlerTitle = null;
		$tw.utils.setStyle(targetElement, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "0"}
		]);
		setTimeout(function() {
			removeElement();
			scrollToPosition(0, false);
		}, duration);
	}
	return true;
};

FadeStoryView.getScrollTop = getScrollTop;
FadeStoryView.getSavedPosition = getSavedPosition;
FadeStoryView.setSavedPosition = setSavedPosition;
FadeStoryView.clearSavedPositions = function() {
	if(navigationTimer) {
		clearTimeout(navigationTimer);
		navigationTimer = null;
	}
	isNavigating = false;
	scrollPositionsByTitle = Object.create(null);
};

exports.fade = FadeStoryView;
exports["slipstream-fade"] = FadeStoryView;

})();
