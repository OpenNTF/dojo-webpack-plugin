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

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * ATTENTION!!! If you make changes to this file that affect the generated code,
 * be sure to update the hash generation function at the end of the file.
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */ 

var Template = require("webpack/lib/Template");
var ConcatSource = require("webpack-core/lib/ConcatSource");

function DojoAMDChunkTemplatePlugin(options) {
	this.options = options;
}

module.exports = DojoAMDChunkTemplatePlugin;

DojoAMDChunkTemplatePlugin.prototype.apply = function(compilation, params) {
	var options = this.options;
	compilation.chunkTemplate.plugin("render", function(source, chunk) {
		var jsonpFunction = this.outputOptions.jsonpFunction || Template.toIdentifier("webpackJsonp" + (this.outputOptions.library || ""));
		var lastEntry = 0;
		var buf = [];
		buf.push(jsonpFunction + ".registerAbsMids({");
		chunk.modules.forEach(function(module) {
			if (module.absMid) {
				if (lastEntry) {
					buf[lastEntry] += ",";
				}
				buf.push("\t'" + module.absMid + "':" + JSON.stringify(module.id));
				lastEntry = buf.length-1;
				if (module.absMidAliases) {
					module.absMidAliases.forEach(function(alias) {
						buf[lastEntry] += ",";
						buf.push("\t'" + alias + "':" + JSON.stringify(module.id));
						lastEntry = buf.length-1;
					});
				}
			} else {
				buf.push("\t// " + module.rawRequest + " = " + JSON.stringify(module.id));
			}
		});
		buf.push("});");
		buf.push("");
		var replacementSource = new ConcatSource();
		replacementSource.add(this.asString(buf));
		replacementSource.add(source);
		return replacementSource;
	});

	compilation.chunkTemplate.plugin("hash", function(hash) {
		  hash.update("DojoAMDChunkTemplate");
		  hash.update("1");		// Increment this whenever the template code above changes
	});
}