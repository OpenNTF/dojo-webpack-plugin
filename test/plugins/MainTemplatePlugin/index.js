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
const {tap, callSyncWaterfall} = require("webpack-plugin-compat").for("MainTemplatePlugin - tests");
const Template = require("webpack/lib/Template");
const RuntimeGlobals = require('webpack/lib/RuntimeGlobals');
const HelperRuntimeModule = require("webpack/lib/runtime/HelperRuntimeModule");

const fn = RuntimeGlobals.loadScript;

module.exports = class MainTemplatePlugin extends HelperRuntimeModule {
	constructor() {
		super("load script in VM");
	}

	apply(compiler) {
		tap(compiler, {"compilation" : compilation => {
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.loadScript)
				.tap("domino-webpack-plugin", (chunk, set__) => {
					compilation.addRuntimeModule(chunk, this);
					return true;
				});
		}});
	}
	generate() {
		const { compilation } = this;
		const { runtimeTemplate } = compilation;
		return Template.asString([
			"var inProgress = {};",
			`${fn} = ${runtimeTemplate.basicFunction("filename, done, key, chunkId", [
				"if(inProgress[filename]) { inProgress[filename].push(done); return; }",
				"inProgress[filename] = [done];",
				`nodeRequire('fs').readFile(filename, 'utf-8',  ${runtimeTemplate.basicFunction("error, content", [
					"var event = {type: 'load', target:{src: filename}}",
					"if(error) {",
					Template.indent([
						"event.type = 'error'"
					]),
					"} else {",
					Template.indent([
						"var vm = nodeRequire('vm');",
						"var context = vm.createContext(global);",
						"vm.runInContext('(function(nodeRequire, __dirname, __filename, global, window, self) {' + content + '\\n})', context, filename)" +
						".call(global, nodeRequire, nodeRequire('path').dirname(filename), filename, context, context, context);"
					]),
					"}",
					"var doneFns = inProgress[filename];",
					"delete inProgress[filename];",
					`doneFns && doneFns.forEach(${runtimeTemplate.returningFunction(
						"fn(event)",
						"fn"
					)});`
				])});`
			])};`
		]);
	}
};
