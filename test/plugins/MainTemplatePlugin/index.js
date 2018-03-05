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
const {tap} = require("../../../lib/pluginHelper");
const Template = require("webpack/lib/Template");

module.exports = class MainTemplatePlugin {
	apply(compiler) {
		tap(compiler, {"compilation" : compilation => {

			tap(compilation.mainTemplate, {"requireEnsure": function(__, chunk, hash) {
				const indent = this.indent || Template.indent;
				const asString = this.asString || Template.asString;
				const chunkFilename = this.outputOptions.chunkFilename;
				const chunkMaps = chunk.getChunkMaps();
				return asString([
					"var installedChunkData = installedChunks[chunkId];",
					"if(installedChunkData === 0) {",
					indent([
						"return new Promise(function(resolve) { resolve(); });"
					]),
					"}",
					"",
					"// a Promise means \"currently loading\".",
					"if(installedChunkData) {",
					indent([
						"return installedChunkData[2];"
					]),
					"}",
					"",
					"// setup Promise in chunk cache",
					"var promise = new Promise(function(resolve, reject) {",
					indent([
						"installedChunkData = installedChunks[chunkId] = [resolve, reject];"
					]),
					"});",
					"installedChunkData[2] = promise;",
					"",
					"// start chunk loading",
					"var filename = __dirname + " + this.hooks.assetPath.call(JSON.stringify(`/${chunkFilename}`), {
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
					indent([
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
			}}, compilation.mainTemplate);
		}});
	}
};
