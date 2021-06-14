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
const {Template: {indent, asString}, javascript: {JavascriptModulesPlugin}} = require('webpack');
const {SyncWaterfallHook} = require('tapable');
const {ConcatSource} = require('webpack-sources');
const {getPluginProps} = require("./DojoAMDPlugin");

module.exports = class DojoAMDChunkTemplatePlugin {
	constructor(options) {
		this.options = options;
		this.errors = new Map();
	}

	apply(compiler) {
		this.compiler = compiler;
		compiler.hooks.afterCompile.tap('dojo-webpack-plugin', (compilation) => {
			const err = this.errors.get(compilation);
			if (err) throw(err);
		});
		compiler.hooks.compilation.tap('dojo-webpack-plugin', (compilation, params) => {
			if (!this.options.isSkipCompilation(compilation)) {
				const context = Object.create(this, {
					compilation:{value: compilation},
					params:{value:params}
				});
				const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
				getPluginProps(compiler).hooks.renderAbsMids = new SyncWaterfallHook(['source', 'chunk']);
				hooks.renderChunk.tap("dojo-webpack-plugin", this.render.bind(context));
				hooks.chunkHash.tap("dojo-webpack-plugin", this.hash.bind(context));
				getPluginProps(compiler).hooks.renderAbsMids.tap('dojo-webpack-plugin', this.renderAbsMids.bind(context));
			}
		});
	}

	render(source, renderContext) {
		const chunkLoadingGlobal = JSON.stringify(this.compilation.outputOptions.chunkLoadingGlobal);

		const buf = [];
		buf.push("(function(){");
		buf.push(`var absMids = {`);
		buf.push(getPluginProps(this.compiler).hooks.renderAbsMids.call("", renderContext.chunk));
		buf.push("};");
		buf.push("var globalObj = this||window;");
		buf.push(`var jsonpArray = globalObj[${chunkLoadingGlobal}] = globalObj[${chunkLoadingGlobal}] || [];`);
		buf.push("if (jsonpArray.registerAbsMids) {");
		buf.push("   jsonpArray.registerAbsMids(absMids);");
		buf.push("} else {");
		buf.push("   var absMidsWaiting = jsonpArray.absMidsWaiting = jsonpArray.absMidsWaiting || [];");
		buf.push("   absMidsWaiting.push(absMids);");
		buf.push("}");
		buf.push("})(),");
		return new ConcatSource(asString(buf), source);
	}

	renderAbsMids(source, chunk) {
		const modules = this.compilation.chunkGraph.getChunkModules(chunk);
		const buf = [], renderedAbsMids = {};
		var lastEntry;
		const renderAbsMid = function(absMid, mod) {
			if (!renderedAbsMids.hasOwnProperty(absMid)) {
				if (lastEntry >= 0) {
					buf[lastEntry] += ",";
				}
				buf.push(indent(`${JSON.stringify(absMid)}:${JSON.stringify(this.compilation.chunkGraph.getModuleId(mod))}`));
				lastEntry = buf.length-1;
				renderedAbsMids[absMid] = mod;
			} else if (renderedAbsMids[absMid] !== mod) {
				const error = new Error(`Duplicate absMid (${JSON.stringify(absMid)}) for modules ${JSON.stringify(renderedAbsMids[absMid].request)} and ${JSON.stringify(mod.request)}`);
				if (!this.errors.get(this.compilation)) {
					this.errors.set(this.compilation, error);
				}
			}
		}.bind(this);
		modules.forEach((module) => {
			var rendered = false;
			module.filterAbsMids && module.filterAbsMids(absMid => {
				renderAbsMid(absMid, module);
				return rendered = true;
			});
			if (!rendered && module.rawRequest) {
				buf.push(indent(`// ${JSON.stringify(module.rawRequest)} = ${JSON.stringify(this.compilation.chunkGraph.getModuleId(module))}`));
			}
		});
		return source + asString(buf);
	}

	hash(chunk__, hash) {
		hash.update("DojoAMDChunkTemplate");
		hash.update("5");		// Increment this whenever the template code above changes
	}
};
