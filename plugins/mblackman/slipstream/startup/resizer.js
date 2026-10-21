/*\
title: $:/plugins/mblackman/slipstream/startup/resizer.js
type: application/javascript
module-type: startup

Desktop sidebar resizer controller for Slipstream layout.
Supports mouse/pointer drag resizing, double-click to reset, and keyboard arrow keys.
Persists widths per-browser/device in localStorage and $:/state/slipstream/ to prevent syncing across different screens.

\*/
(function(){

"use strict";

exports.name = "slipstream-resizer";
exports.before = ["render"];
exports.after = ["story"];
exports.synchronous = true;

function getStorageItem(key) {
	try {
		if(typeof window !== "undefined" && window.localStorage) {
			return window.localStorage.getItem(key);
		}
	} catch(e) {}
	return null;
}

function setStorageItem(key, val) {
	try {
		if(typeof window !== "undefined" && window.localStorage) {
			window.localStorage.setItem(key, val);
		}
	} catch(e) {}
}

function removeStorageItem(key) {
	try {
		if(typeof window !== "undefined" && window.localStorage) {
			window.localStorage.removeItem(key);
		}
	} catch(e) {}
}

function clampWidth(width, windowWidth, otherSidebarWidth) {
	var winW = windowWidth || (typeof window !== "undefined" ? window.innerWidth : 1440);
	var minWidth = 180;
	var maxWidth = Math.min(650, Math.floor(winW * 0.42));
	if(typeof otherSidebarWidth === "number" && otherSidebarWidth > 0) {
		var minCenterWidth = 380;
		maxWidth = Math.min(maxWidth, winW - otherSidebarWidth - minCenterWidth);
	}
	maxWidth = Math.max(minWidth, maxWidth);
	return Math.max(minWidth, Math.min(maxWidth, Math.round(width)));
}

function parseValidWidth(raw) {
	if(!raw) return null;
	var cleaned = String(raw).trim().replace(/p?x?$/i, "");
	if(!/^\d+(\.\d+)?$/.test(cleaned)) return null;
	var val = Math.round(parseFloat(cleaned));
	if(isNaN(val) || val < 180 || val > 650) return null;
	return val;
}

function getConfiguredWidth(side, wiki) {
	var targetWiki = wiki || (typeof $tw !== "undefined" && $tw.wiki ? $tw.wiki : (typeof globalThis !== "undefined" && globalThis.$tw && globalThis.$tw.wiki ? globalThis.$tw.wiki : null));
	var stateTitle = "$:/state/slipstream/" + side + "-width";
	var configTitle = "$:/config/slipstream/" + side + "-width";
	if(targetWiki) {
		var stateVal = parseValidWidth(targetWiki.getTiddlerText(stateTitle));
		if(stateVal !== null) return stateVal;
		var configVal = parseValidWidth(targetWiki.getTiddlerText(configTitle));
		if(configVal !== null) return configVal;
	}
	var storageVal = parseValidWidth(getStorageItem("slipstream-" + side + "-width"));
	if(storageVal !== null) return storageVal;
	return 272;
}

function getSidebarWidth(side, wiki) {
	var configured = getConfiguredWidth(side, wiki);
	if(configured !== 272) return configured;
	if(typeof document !== "undefined") {
		var appShell = document.querySelector(".mn-app-shell");
		if(appShell) {
			var inlineVal = parseValidWidth(appShell.style.getPropertyValue("--mn-" + side + "-width"));
			if(inlineVal !== null) return inlineVal;
			try {
				if(typeof window !== "undefined") {
					var computed = parseValidWidth(window.getComputedStyle(appShell).getPropertyValue("--mn-" + side + "-width"));
					if(computed !== null) return computed;
				}
			} catch(e) {}
		}
	}
	return 272;
}

function applyDomWidth(side, widthPx) {
	if(typeof document === "undefined") return;
	var appShell = document.querySelector(".mn-app-shell");
	if(appShell) {
		appShell.style.setProperty("--mn-" + side + "-width", widthPx + "px");
		var resizer = appShell.querySelector(".mn-resizer-" + side);
		if(resizer) {
			resizer.setAttribute("aria-valuenow", String(widthPx));
		}
	}
}

function saveWidth(side, widthStr, wiki) {
	var targetWiki = wiki || (typeof $tw !== "undefined" && $tw.wiki ? $tw.wiki : (typeof globalThis !== "undefined" && globalThis.$tw && globalThis.$tw.wiki ? globalThis.$tw.wiki : null));
	var validPx = parseValidWidth(widthStr);
	var normalized = validPx !== null ? (validPx + "px") : "272px";
	if(targetWiki) {
		targetWiki.setText("$:/state/slipstream/" + side + "-width", "text", null, normalized);
	}
	setStorageItem("slipstream-" + side + "-width", normalized);
}

function resetWidth(side, wiki) {
	var targetWiki = wiki || (typeof $tw !== "undefined" && $tw.wiki ? $tw.wiki : (typeof globalThis !== "undefined" && globalThis.$tw && globalThis.$tw.wiki ? globalThis.$tw.wiki : null));
	var fallbackPx = targetWiki ? (parseValidWidth(targetWiki.getTiddlerText("$:/config/slipstream/" + side + "-width")) || 272) : 272;
	applyDomWidth(side, fallbackPx);
	saveWidth(side, fallbackPx + "px", targetWiki);
}

function initResizer() {
	if(typeof document === "undefined" || typeof window === "undefined") {
		return;
	}

	var activeResizer = null;
	var startX = 0;
	var isDragging = false;

	function isMobile() {
		var appShell = document.querySelector(".mn-app-shell");
		if(appShell && appShell.classList.contains("mn-is-mobile")) {
			return true;
		}
		var widthTid = (typeof $tw !== "undefined" && $tw.wiki) ? $tw.wiki.getTiddlerText("$:/info/browser/window/system/main/client/width") : "";
		var bpTid = (typeof $tw !== "undefined" && $tw.wiki) ? $tw.wiki.getTiddlerText("$:/config/slipstream/mobile-breakpoint") : "";
		var bp = parseInt(bpTid || "1024", 10);
		if(widthTid) {
			var w = parseInt(widthTid, 10);
			if(!isNaN(w) && w < bp) return true;
		}
		return window.innerWidth < bp;
	}

	function getOtherOpenSidebarWidth(appShell, side) {
		var otherSide = side === "left" ? "right" : "left";
		if(appShell && !appShell.classList.contains("mn-" + otherSide + "-collapsed")) {
			return getSidebarWidth(otherSide);
		}
		return 0;
	}

	function onPointerDown(event) {
		if(event.button !== 0) return; // Only primary mouse button
		if(activeResizer) return; // Already active

		var resizer = event.target ? event.target.closest(".mn-resizer") : null;
		if(!resizer) return;

		var appShell = document.querySelector(".mn-app-shell");
		if(!appShell || isMobile()) return;

		var side = resizer.getAttribute("data-side");
		if(!side || (side !== "left" && side !== "right")) return;

		// If this sidebar is collapsed, ignore drag
		if(appShell.classList.contains("mn-" + side + "-collapsed")) return;

		// Double-click resets to default 272px
		if(event.detail === 2) {
			event.preventDefault();
			resetWidth(side);
			return;
		}

		event.preventDefault();

		activeResizer = resizer;
		startX = event.clientX;
		isDragging = false;

		var appRect = appShell.getBoundingClientRect();
		var otherWidth = getOtherOpenSidebarWidth(appShell, side);

		resizer.classList.add("mn-active");
		appShell.classList.add("mn-is-resizing");

		function onPointerMove(moveEvent) {
			var dx = moveEvent.clientX - startX;
			if(Math.abs(dx) > 1) {
				isDragging = true;
			}

			var rawWidth;
			if(side === "left") {
				rawWidth = moveEvent.clientX - appRect.left;
			} else {
				rawWidth = appRect.right - moveEvent.clientX;
			}

			var clampedWidth = clampWidth(rawWidth, window.innerWidth, otherWidth);
			applyDomWidth(side, clampedWidth);
		}

		function onPointerUp(upEvent) {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
			window.removeEventListener("mousemove", onPointerMove);
			window.removeEventListener("mouseup", onPointerUp);

			if(resizer.releasePointerCapture && upEvent.pointerId !== undefined) {
				try {
					resizer.releasePointerCapture(upEvent.pointerId);
				} catch(e) {}
			}

			resizer.classList.remove("mn-active");
			appShell.classList.remove("mn-is-resizing");

			if(isDragging) {
				var finalWidth = parseInt(appShell.style.getPropertyValue("--mn-" + side + "-width"), 10);
				if(finalWidth && !isNaN(finalWidth)) {
					saveWidth(side, finalWidth + "px");
				}
			}

			activeResizer = null;
		}

		if(resizer.setPointerCapture && event.pointerId !== undefined) {
			try {
				resizer.setPointerCapture(event.pointerId);
			} catch(e) {}
		}

		if(window.PointerEvent) {
			window.addEventListener("pointermove", onPointerMove);
			window.addEventListener("pointerup", onPointerUp);
			window.addEventListener("pointercancel", onPointerUp);
		} else {
			window.addEventListener("mousemove", onPointerMove);
			window.addEventListener("mouseup", onPointerUp);
		}
	}

	function onDblClick(event) {
		var resizer = event.target ? event.target.closest(".mn-resizer") : null;
		if(!resizer) return;
		var side = resizer.getAttribute("data-side");
		if(side && !isMobile()) {
			event.preventDefault();
			resetWidth(side);
		}
	}

	function onKeyDown(event) {
		var resizer = event.target ? event.target.closest(".mn-resizer") : null;
		if(!resizer) return;

		var side = resizer.getAttribute("data-side");
		if(!side || isMobile()) return;

		var appShell = document.querySelector(".mn-app-shell");
		if(appShell && appShell.classList.contains("mn-" + side + "-collapsed")) return;

		var step = event.shiftKey ? 25 : 10;
		var current = getSidebarWidth(side);
		var newWidth = null;

		if(event.key === "ArrowLeft") {
			// ArrowLeft: shrink left sidebar, widen right sidebar
			newWidth = side === "left" ? current - step : current + step;
		} else if(event.key === "ArrowRight") {
			// ArrowRight: widen left sidebar, shrink right sidebar
			newWidth = side === "left" ? current + step : current - step;
		} else if(event.key === "Home" || event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			resetWidth(side);
			return;
		}

		if(newWidth !== null) {
			event.preventDefault();
			var otherWidth = getOtherOpenSidebarWidth(appShell, side);
			var clampedWidth = clampWidth(newWidth, window.innerWidth, otherWidth);
			applyDomWidth(side, clampedWidth);
			saveWidth(side, clampedWidth + "px");
		}
	}

	if(window.PointerEvent) {
		document.addEventListener("pointerdown", onPointerDown);
	} else {
		document.addEventListener("mousedown", onPointerDown);
	}
	document.addEventListener("dblclick", onDblClick);
	document.addEventListener("keydown", onKeyDown);
}

exports.clampWidth = clampWidth;
exports.parseValidWidth = parseValidWidth;
exports.getConfiguredWidth = getConfiguredWidth;
exports.getSidebarWidth = getSidebarWidth;
exports.saveWidth = saveWidth;
exports.resetWidth = resetWidth;
exports.getStorageItem = getStorageItem;
exports.setStorageItem = setStorageItem;
exports.removeStorageItem = removeStorageItem;

exports.startup = function() {
	var wiki = typeof $tw !== "undefined" && $tw.wiki ? $tw.wiki : null;
	if(wiki) {
		// Restore device-local sidebar widths from localStorage into $:/state/slipstream/ before initial render
		var localLeft = parseValidWidth(getStorageItem("slipstream-left-width"));
		var localRight = parseValidWidth(getStorageItem("slipstream-right-width"));
		if(localLeft !== null) {
			wiki.setText("$:/state/slipstream/left-width", "text", null, localLeft + "px");
		}
		if(localRight !== null) {
			wiki.setText("$:/state/slipstream/right-width", "text", null, localRight + "px");
		}

		// Keep localStorage and live DOM in sync if user changes or resets $:/state/slipstream/*-width (e.g. Settings tab)
		wiki.addEventListener("change", function(changes) {
			if(changes["$:/state/slipstream/left-width"] || changes["$:/config/slipstream/left-width"]) {
				if(changes["$:/state/slipstream/left-width"]) {
					var rawL = wiki.getTiddlerText("$:/state/slipstream/left-width");
					var validL = parseValidWidth(rawL);
					if(validL !== null) {
						setStorageItem("slipstream-left-width", validL + "px");
					} else if(!rawL || !rawL.trim()) {
						removeStorageItem("slipstream-left-width");
					}
				}
				applyDomWidth("left", getConfiguredWidth("left", wiki));
			}
			if(changes["$:/state/slipstream/right-width"] || changes["$:/config/slipstream/right-width"]) {
				if(changes["$:/state/slipstream/right-width"]) {
					var rawR = wiki.getTiddlerText("$:/state/slipstream/right-width");
					var validR = parseValidWidth(rawR);
					if(validR !== null) {
						setStorageItem("slipstream-right-width", validR + "px");
					} else if(!rawR || !rawR.trim()) {
						removeStorageItem("slipstream-right-width");
					}
				}
				applyDomWidth("right", getConfiguredWidth("right", wiki));
			}
		});
	}

	if(typeof $tw !== "undefined" && $tw.browser) {
		initResizer();
	}
};

})();
