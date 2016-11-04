/*
 * (C) Copyright IBM Corp. 2012, 2016 All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
	"dojo/_base/lang", 			// lang
	"dojo/_base/declare",		// declare
	"dijit/layout/ContentPane",	// parent
	"dojo/dom-construct"
], function(lang, declare, ContentPane, dconst){

// module:
//		js/LazyContentPane
// summary:
//		A demo container that sets its contents based on its title.


	return declare("dijit.layout.LazyContentPane", [ContentPane], {
		onShow: function() {
			if (this.get('content') == '') {
				this.set('content', this.onDownloadStart());
				
				var title = this.get('title');
				if (title == 'Calendar') {
					require(['dijit/Calendar'], lang.hitch(this, function(calendar) {
						this.set('content', new calendar({}));
					}));
				} else if (title == 'Color Palette') {
					require(['dijit/ColorPalette'], lang.hitch(this, function(colorPallete) {
						this.set('content', '<div></div>');
						new colorPallete({}, this.containerNode.firstChild);
					}));
				} else if (title == 'Editor') {
					require(['dijit/Editor'], lang.hitch(this, function(editor) {
						dconst.empty(this.domNode);
						(new editor({
							plugins: ["bold","italic","|","cut","copy","paste","|","insertUnorderedList"]
						})).placeAt(this.domNode);
					}));
				} else if (title == 'Chart') {
					// Chained requires for gfx are internal to the gfx module.
					require([
					    'dojox/charting/Chart2D', 
					    'dojox/charting/themes/Wetland', 
					    'dojox/charting/axis2d/Default', 
					    'dojox/charting/plot2d/Default'
					], lang.hitch(this, function(chart, wetland) {
						dconst.empty(this.domNode);
						var node = dconst.place('<div></div>', this.domNode);
						var c = new chart(node);
						c.addPlot("default", {type: "StackedAreas", tension:3})
						  .addAxis("x", {fixLower: "major", fixUpper: "major"})
						  .addAxis("y", {vertical: true, fixLower: "major", fixUpper: "major", min: 0})
						  .setTheme(wetland)
						  .addSeries("Series A", [1, 2, 0.5, 1.5, 1, 2.8, 0.4])
						  .addSeries("Series B", [2.6, 1.8, 2, 1, 1.4, 0.7, 2])
						  .addSeries("Series C", [6.3, 1.8, 3, 0.5, 4.4, 2.7, 2])
						  .render();
					}));
				}
			}
		}
	});
});
