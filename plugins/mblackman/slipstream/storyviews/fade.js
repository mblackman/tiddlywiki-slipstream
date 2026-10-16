/*\
title: $:/plugins/mblackman/slipstream/storyviews/fade.js
type: application/javascript
module-type: storyview

Smooth single-tiddler cross-fade story river view for mobile and compact viewports.

\*/
(function(){

"use strict";

var easing = "cubic-bezier(0.4, 0, 0.2, 1)";

var FadeStoryView = function(listWidget) {
	var self = this;
	this.listWidget = listWidget;

	// Determine active tiddler from history list, or first tiddler in story
	var history = this.listWidget.wiki.getTiddlerDataCached(this.listWidget.historyTitle, []),
		targetTiddler;
	if(history && history.length > 0) {
		targetTiddler = history[history.length - 1].title;
	}

	// Make single-tiddler presentation: display only active tiddler, hide others
	$tw.utils.each(this.listWidget.children, function(itemWidget, index) {
		var domNode = itemWidget.findFirstDomNode();
		if(!(domNode instanceof Element)) {
			return;
		}
		if((targetTiddler && targetTiddler !== itemWidget.parseTreeNode.itemTitle) || (!targetTiddler && index)) {
			domNode.style.display = "none";
		} else {
			self.currentTiddlerDomNode = domNode;
			domNode.style.display = "block";
		}
		$tw.utils.addClass(domNode, "mn-storyview-fade-tiddler");
	});
};

FadeStoryView.prototype.navigateTo = function(historyInfo) {
	var duration = $tw.utils.getAnimationDuration();
	if(typeof duration !== "number" || duration <= 0) {
		duration = 220;
	}

	var listElementIndex = this.listWidget.findListItem(0, historyInfo.title);
	if(listElementIndex === undefined) {
		return;
	}

	var listItemWidget = this.listWidget.children[listElementIndex],
		targetElement = listItemWidget.findFirstDomNode();

	if(!targetElement || targetElement.nodeType === Node.TEXT_NODE) {
		return;
	}

	// If already currently displayed, scroll viewport to top smoothly
	if(targetElement === this.currentTiddlerDomNode && targetElement.style.display !== "none") {
		if(typeof window !== "undefined" && window.scrollTo) {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
		return;
	}

	var self = this,
		prevCurrentTiddler = this.currentTiddlerDomNode;
	this.currentTiddlerDomNode = targetElement;

	$tw.utils.addClass(targetElement, "mn-storyview-fade-tiddler");

	// Instant scroll back to top of document when switching to a different note
	if(typeof window !== "undefined" && window.scrollTo) {
		window.scrollTo({ top: 0, behavior: "instant" });
	}

	if(prevCurrentTiddler && prevCurrentTiddler !== targetElement && prevCurrentTiddler.style.display !== "none") {
		// Outgoing tiddler: fixed in place via mn-tiddler-fading-out class, fades opacity 1 -> 0
		$tw.utils.addClass(prevCurrentTiddler, "mn-tiddler-fading-out");
		$tw.utils.setStyle(prevCurrentTiddler, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "0"}
		]);

		// Incoming tiddler: starts display block at opacity 0, fades opacity 0 -> 1
		$tw.utils.setStyle(targetElement, [
			{display: "block"},
			{transition: "none"},
			{opacity: "0"}
		]);
		$tw.utils.forceLayout(targetElement);
		$tw.utils.addClass(targetElement, "mn-tiddler-fading-in");

		$tw.utils.setStyle(targetElement, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "1"}
		]);

		setTimeout(function() {
			if(self.currentTiddlerDomNode !== prevCurrentTiddler) {
				prevCurrentTiddler.style.display = "none";
				$tw.utils.removeClass(prevCurrentTiddler, "mn-tiddler-fading-out");
				$tw.utils.removeStyles(prevCurrentTiddler, ["transition", "opacity"]);
			}
			$tw.utils.removeClass(targetElement, "mn-tiddler-fading-in");
			$tw.utils.removeStyles(targetElement, ["transition", "opacity"]);
		}, duration);
	} else {
		// First appearance or no visible previous tiddler
		$tw.utils.setStyle(targetElement, [
			{display: "block"},
			{transition: "none"},
			{opacity: "0"}
		]);
		$tw.utils.forceLayout(targetElement);
		$tw.utils.addClass(targetElement, "mn-tiddler-fading-in");

		$tw.utils.setStyle(targetElement, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "1"}
		]);

		setTimeout(function() {
			$tw.utils.removeClass(targetElement, "mn-tiddler-fading-in");
			$tw.utils.removeStyles(targetElement, ["transition", "opacity"]);
		}, duration);
	}
};

FadeStoryView.prototype.insert = function(widget) {
	var targetElement = widget.findFirstDomNode();
	if(!targetElement || targetElement.nodeType === Node.TEXT_NODE) {
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
		duration = $tw.utils.getAnimationDuration(),
		removeElement = function() {
			widget.removeChildDomNodes();
		};

	if(typeof duration !== "number" || duration <= 0) {
		duration = 220;
	}

	if(!targetElement || targetElement.nodeType === Node.TEXT_NODE) {
		removeElement();
		return;
	}

	// If already hidden, remove immediately without animation
	if(targetElement.style.display === "none") {
		removeElement();
		return;
	}

	// Reveal adjacent tiddler in story river
	var toWidget = widget.previousSibling() || widget.nextSibling();
	var toWidgetDomNode = toWidget && toWidget.findFirstDomNode();

	if(toWidgetDomNode && toWidgetDomNode.nodeType !== Node.TEXT_NODE) {
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

		setTimeout(function() {
			$tw.utils.removeClass(toWidgetDomNode, "mn-tiddler-fading-in");
			$tw.utils.removeStyles(toWidgetDomNode, ["transition", "opacity"]);
			removeElement();
		}, duration);
	} else {
		// Single tiddler remaining
		$tw.utils.setStyle(targetElement, [
			{transition: "opacity " + duration + "ms " + easing},
			{opacity: "0"}
		]);
		setTimeout(removeElement, duration);
	}
	return true;
};

exports.fade = FadeStoryView;
exports["slipstream-fade"] = FadeStoryView;

})();
