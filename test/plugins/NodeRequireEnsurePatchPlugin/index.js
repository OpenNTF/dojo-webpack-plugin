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
/*
 * Patch webpack's require ensure in Node to work around https://github.com/nodejs/node/issues/14757.
 * We do this by calling vm.runInContext, specifying the current global context, rather than calling
 * vm.runInThisContext.  We need to do this because global variables set by the caller before
 * calling vm.runInThisContext will not be available to the callee.  This patch can be removed
 * whenever https://github.com/nodejs/node/issues/14757 is fixed.
 */
"use strict";

module.exports = class NodeRequireEnsurePatchPlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation) {
			compilation.mainTemplate.plugin("require-ensure", function(__, chunk, hash) {
				const chunkFilename = this.outputOptions.chunkFilename;
				const chunkMaps = chunk.getChunkMaps();
				const insertMoreModules = [
					"var moreModules = chunk.modules, chunkIds = chunk.ids;",
					"for(var moduleId in moreModules) {",
					this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
					"}"
				];
				return this.asString([
					"// \"0\" is the signal for \"already loaded\"",
					"if(installedChunks[chunkId] === 0)",
					this.indent([
						"return Promise.resolve();"
					]),
					"// array of [resolve, reject, promise] means \"currently loading\"",
					"if(installedChunks[chunkId])",
					this.indent([
						"return installedChunks[chunkId][2];"
					]),
					"// load the chunk and return promise to it",
					"var promise = new Promise(function(resolve, reject) {",
					this.indent([
						"installedChunks[chunkId] = [resolve, reject];",
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
							"var chunk = {};",
							"var vm = require('vm')",
							"vm.runInContext('(function(exports, require, __dirname, __filename, global) {' + content + '\\n})', vm.createContext(global), filename)" +
							".call(global, chunk, require, require('path').dirname(filename), filename, global);"
						].concat(insertMoreModules).concat([
							"var callbacks = [];",
							"for(var i = 0; i < chunkIds.length; i++) {",
							this.indent([
								"if(installedChunks[chunkIds[i]])",
								this.indent([
									"callbacks = callbacks.concat(installedChunks[chunkIds[i]][0]);"
								]),
								"installedChunks[chunkIds[i]] = 0;"
							]),
							"}",
							"for(i = 0; i < callbacks.length; i++)",
							this.indent("callbacks[i]();")
						])),
						"});"
					]),
					"});",
					"return installedChunks[chunkId][2] = promise;"
				]);
			});
		});
	}
};
