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
				var nextCurrent = storyList.length > 0 ? storyList[0] : "";
				$tw.wiki.setText("$:/HistoryList", "current-tiddler", null, nextCurrent);
			}
		}
	});
};

})();
