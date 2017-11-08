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
const stringify = require("node-stringify");
const dojoLoaderUtils = require("./dojoLoaderUtils");

RegExp.prototype.toJSON = RegExp.prototype.toString;

module.exports = class DojoAMDMainTemplatePlugin {
	constructor(options, loaderProps) {
		this.options = options;
		this.loaderProps = loaderProps;
	}
	apply(compilation) {
		const options = this.options;
		const loaderProps = this.loaderProps;

		// For unit testing only
		compilation.mainTemplate.plugin("require", function(source) {
			/* istanbul ignore else  */
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
			var modules = chunk.getModules ? chunk.getModules() : /* istanbul ignore next  */ chunk.modules;
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
				/* istanbul ignore else  */
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
			/* istanbul ignore if */
			if (!dojoLoaderModule) {
				throw Error("Can't locate " + options.loader + " in compilation");
			}
			buf.push("globalScope.dojoConfig = globalScope.dojoConfig || {}");
			var defaultConfig = {hasCache:require("./defaultFeatures")};
			var s = "var loaderConfig = ";
			if (util.isString(options.loaderConfig)) {
				if (!loaderProps.embeddedLoaderHasConfigApi) {
					throw Error(`The embedded Dojo loader needs the config API in order to support loading the Dojo loader config as a module, \
but the loader specified at ${options.loader} was built without the config API.  Please rebuild the embedded loader with 'dojo-config-api' feature enabled`);
				}
				const dojoLoaderConfig = compilation.modules.find((module) => { return module.rawRequest === options.loaderConfig;});
				s += this.requireFn + "(" + JSON.stringify(dojoLoaderConfig.id) + ");";
				s += "if (typeof loaderConfig === 'function') loaderConfig = loaderConfig.call(globalScope, " + JSON.stringify(options.environment || {}) + ");";
			} else {
				var loaderConfig;
				if (typeof options.loaderConfig === 'function') {
					loaderConfig = options.loaderConfig(options.environment || {});
				} else {
					loaderConfig = options.loaderConfig;
				}
				var baseUrl;
				if (!loaderProps.embeddedLoaderHasConfigApi) {
					var loaderScope = dojoLoaderUtils.createLoaderScope(Object.assign({}, loaderConfig), loaderProps);
					baseUrl = loaderScope.require.baseUrl;
					// Items to copy from the require object to the default config
					["paths", "pathsMapProg", "packs", "aliases", "mapProgs",  "cacheBust"].forEach(prop => {
						defaultConfig[prop] = loaderScope.require[prop];
					});
					["modules", "cache"].forEach(prop => {
						defaultConfig[prop] = {};
					});
					// Remove packages defined by the loader default config
					["dojo", "dijit", "dojox", "tests", "doh", "build", "demos"].forEach(prop => {
						if (!loaderConfig[prop]) delete defaultConfig.packs[prop];
					});
					// Remove redundant items from the user config
					["paths", "packages", "maps", "aliases", "cacheBust"].forEach(prop => {
						delete loaderConfig[prop];
					});
					defaultConfig.hasCache = require("./defaultFeatures");
				}
				s += "Object.assign(globalScope.dojoConfig, " + stringify(loaderConfig) + ");";
			}
			buf.push(s);
			buf.push("var defaultConfig = " + stringify(defaultConfig) + ";");
			buf.push("var dojoLoader = " + this.requireFn + "(" + JSON.stringify(dojoLoaderModule.id) + ");");
			buf.push("dojoLoader.call(loaderScope, loaderConfig, defaultConfig, loaderScope, loaderScope);");
			if (baseUrl) {
				buf.push("loaderScope.require.baseUrl = " + JSON.stringify(baseUrl) + ";");
			}
			buf.push("req.baseUrl = loaderScope.require.baseUrl");
			buf.push("req.has = loaderScope.require.has;");
			buf.push("req.rawConfig = loaderScope.require.rawConfig");
			buf.push("req.on = loaderScope.require.on");
			buf.push("req.signal = loaderScope.require.signal");
			buf.push("");
			return this.asString(buf);
		});

		compilation.mainTemplate.plugin("hash", function(hash) {
			hash.update("DojoAMDMainTemplate");
			hash.update("6");		// Increment this whenever the template code above changes
			if (util.isString(options.loaderConfig)) {
				hash.update(options.loaderConfig);
			} else if (typeof options.loaderConfig === 'function') {
				hash.update(stringify(options.loaderConfig(options.environment || {})));
			} else {
				hash.update(stringify(options.loaderConfig));
			}
		});
	}
};
