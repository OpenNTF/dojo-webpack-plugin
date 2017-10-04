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

const util = require('util');
const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("webpack/lib/Template");

module.exports = class DojoAMDMainTemplatePlugin {
	constructor(options) {
		this.options = options;
	}
	apply(compilation) {
		const options = this.options;

		// For unit testing only
		compilation.mainTemplate.plugin("require", function(source) {
			if (compilation.options.target === "async-node") {
				// When running unit tests in node, the scoped require function is node's CommonJs
				// require.  This code, together with the 'render' plugin below, defines a scoped
				// Dojo require variable for each AMD module so that referencing 'require' from
				// within the module will yield the Dojo function.
				source = source.replace(/__webpack_require__\);/g, "__webpack_require__, req);");
			}
			return source;
		});

		// For unit testing only
		compilation.moduleTemplate.plugin("render", function(source, module) {
			var result = source;
			if (module.isAMD && compilation.options.target === "async-node") {
				// Define a module scoped 'require' variable for AMD modules that yields the
				// the Dojo require function.
				result = new ConcatSource();
				result.add("var require = arguments[3];");
				result.add(source);
			}
			return result;
		});

		compilation.mainTemplate.plugin("bootstrap", function(source, chunk) {
			const buf = [];
			const runtimeSource = Template.getFunctionContent(require("./DojoAMDMainTemplate.runtime.js"));
			buf.push(source);
			buf.push(runtimeSource);
			buf.push("req.toUrl = toUrl;");
			buf.push("req.toAbsMid = toAbsMid;");
			buf.push("req.absMids = {};");
			buf.push("req.absMidsById = [];");
			buf.push("registerAbsMids({");
			var lastEntry = 0;
			var modules = chunk.getModules ? chunk.getModules() : chunk.modules;
			modules.forEach(function(module) {
				if (module.absMid) {
					if (lastEntry) {
						buf[lastEntry] += ",";
					}
					buf.push("\t\"" + module.absMid.replace("\"", "\\\"") + "\":" + JSON.stringify(module.id));
					lastEntry = buf.length-1;
					if (module.absMidAliases) {
						module.absMidAliases.forEach(function(alias) {
							buf[lastEntry] += ",";
							buf.push("\t\"" + alias.replace("\"", "\\\"") + "\":" + JSON.stringify(module.id));
							lastEntry = buf.length-1;
						});
					}
				} else {
					buf.push("\t// " + module.rawRequest + " = " + JSON.stringify(module.id));
				}
			});
			buf.push("});");
			buf.push("");
			buf.push("req.async = 1;");
			buf.push("(function(){ // Ensure this refers to global scope");
			buf.push(this.indent("this.require = req;"));
			if(chunk.chunks.length > 0) {
				var jsonpFn = JSON.stringify(this.outputOptions.jsonpFunction);
				if (compilation.options.target === "async-node") {
					// For unit tests, the jsonp function is not defined by default
					buf.push(this.indent(`this[${jsonpFn}] = this[${jsonpFn}] || {}`));
				}
				buf.push(this.indent(`this[${jsonpFn}].registerAbsMids = registerAbsMids;`));
			}
			buf.push("})();");
			return this.asString(buf);
		});

		compilation.mainTemplate.plugin("require-extensions", function(source) {
			const buf = [];
			buf.push(source);
			buf.push("");
			buf.push("// expose the Dojo compatibility functions as a properties of " + this.requireFn);
			buf.push(this.requireFn + ".dj = {");
			buf.push("\tc: createContextRequire,");
			buf.push("\tm: dojoModuleFromWebpackModule,");
			buf.push("\th: resolveTernaryHasExpression,");
			buf.push("\tg: (function(){return this;})()   // Easy access to global scope");
			buf.push("};");
			buf.push("var globalScope = (function(){return this;})();");
			buf.push("var loaderScope = {document:globalScope.document};");
			buf.push("loaderScope.global = loaderScope.window = loaderScope;");
			const dojoLoaderModule = compilation.modules.find((module) => { return module.rawRequest === options.loader;});
			if (!dojoLoaderModule) {
				throw Error("Can't locate " + options.loader + " in compilation");
			}
			buf.push("globalScope.dojoConfig = globalScope.dojoConfig || {}");
			var s = "var loaderConfig = ";
			if (util.isString(options.loaderConfig)) {
				const dojoLoaderConfig = compilation.modules.find((module) => { return module.rawRequest === options.loaderConfig;});
				s += this.requireFn + "(" + JSON.stringify(dojoLoaderConfig.id) + ");";
				s += "if (typeof loaderConfig === 'function') loaderConfig = loaderConfig.call(globalScope, " + JSON.stringify(options.environment || {}) + ");";
			} else {
				s += "Object.assign(globalScope.dojoConfig, " + JSON.stringify(options.loaderConfig) + ");";
			}
			buf.push(s);
			buf.push("if (!loaderConfig.has) loaderConfig.has = {};");
			buf.push("if (!('webpack' in loaderConfig.has)) loaderConfig.has.webpack = true;");
			buf.push("var dojoLoader = " + this.requireFn + "(" + JSON.stringify(dojoLoaderModule.id) + ");");
			buf.push("dojoLoader.call(loaderScope, loaderConfig, {hasCache:" + JSON.stringify(require("./defaultFeatures")) + "}, loaderScope, loaderScope);");
			buf.push("req.has = loaderScope.require.has;");
			buf.push("req.rawConfig = loaderScope.require.rawConfig");
			buf.push("");
			return this.asString(buf);
		});

		compilation.mainTemplate.plugin("hash", function(hash) {
			hash.update("DojoAMDMainTemplate");
			hash.update("6");		// Increment this whenever the template code above changes
			if (!util.isString(options.loaderConfig)) {
				hash.update(JSON.stringify(options.loaderConfig));
			}
		});
	}
};
