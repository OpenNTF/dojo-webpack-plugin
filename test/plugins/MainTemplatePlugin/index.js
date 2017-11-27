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
 	MIT License http://www.opensource.org/licenses/mit-license.php
 	Author Tobias Koppers @sokra
 */

"use strict";
const ConcatSource = require("webpack-sources").ConcatSource;

module.exports = class MainTemplatePlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation) {
			compilation.mainTemplate.plugin("require", function(source) {
				// When running unit tests in node, the scoped require function is node's CommonJs
				// require.  This code, together with the 'render' plugin below, defines a scoped
				// Dojo require variable for each AMD module so that referencing 'require' from
				// within the module will yield the Dojo function.
				return source.replace(/__webpack_require__\);/g, "__webpack_require__, req);");
			});

			compilation.moduleTemplate.plugin("render", function(source, module) {
				var result = source;
				if (module.isAMD) {
					// Define a module scoped 'require' variable for AMD modules that yields the
					// the Dojo require function.
					result = new ConcatSource();
					result.add("var require = arguments[3];");
					result.add(source);
				}
				return result;
			});

			compilation.mainTemplate.plugin("require-ensure", function(__, chunk, hash) {
				const chunkFilename = this.outputOptions.chunkFilename;
				const chunkMaps = chunk.getChunkMaps();
				return this.asString([
					"var installedChunkData = installedChunks[chunkId];",
					"if(installedChunkData === 0) {",
					this.indent([
						"return new Promise(function(resolve) { resolve(); });"
					]),
					"}",
					"",
					"// a Promise means \"currently loading\".",
					"if(installedChunkData) {",
					this.indent([
						"return installedChunkData[2];"
					]),
					"}",
					"",
					"// setup Promise in chunk cache",
					"var promise = new Promise(function(resolve, reject) {",
					this.indent([
						"installedChunkData = installedChunks[chunkId] = [resolve, reject];"
					]),
					"});",
					"installedChunkData[2] = promise;",
					"",
					"// start chunk loading",
					"var filename = __dirname + " + this.applyPluginsWaterfall("asset-path", JSON.stringify(`/${chunkFilename}`), {
						hash: `" + ${this.renderCurrentHashCode(hash)} + "`,
						hashWithLength: (length) => `" + ${this.renderCurrentHashCode(hash, length)} + "`,
						chunk: {
							id: "\" + chunkId + \"",
							hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
							hashWithLength: (length) => {
								const shortChunkHashMap = {};
								Object.keys(chunkMaps.hash).forEach((chunkId) => {
									if(typeof chunkMaps.hash[chunkId] === "string")
										shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
								});
								return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
							},
							name: `" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + "`
						}
					}) + ";",
					"require('fs').readFile(filename, 'utf-8',  function(err, content) {",
					this.indent([
						"if(err) return reject(err);",
						"var chunk = {}, i;",
						"var vm = require('vm');",
						"var context = vm.createContext(global);",
						"vm.runInContext('(function(exports, require, __dirname, __filename, global, window) {' + content + '\\n})', context, filename)" +
						".call(global, chunk, require, require('path').dirname(filename), filename, context, context);"
					]),
					"});",
					"return promise;"
				]);
			});
		});
	}
};
