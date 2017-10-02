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
 /*global __webpack_require__: false, loaderScope:false, req:false, installedModules:false */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * ATTENTION!!! If you make changes to this file that affect the generated code,
 * be sure to update the hash generation function at the end of the file.
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

const util = require('util');
const ConcatSource = require("webpack-sources").ConcatSource;

module.exports = class DojoAMDMainTemplatePlugin {
	constructor(options) {
		this.options = options;
	}
	apply(compilation) {
		const options = this.options;
		function toUrl(name, referenceModule) {
			return loaderScope.require.toUrl(name, referenceModule);
		}

		function toAbsMid(name, referenceModule) {
			return loaderScope.require.toAbsMid(name, referenceModule);
		}

		function createContextRequire(moduleId) {
			if (typeof(moduleId) === "number") { // Number.isInteger does not work in IE
				moduleId = req.absMidsById[moduleId];
			}
			if (!moduleId) return req;
			var result = function(a1, a2, a3) {
				return contextRequire(a1, a2, a3, moduleId, req);
			};
			for (var p in req) {
				if (req.hasOwnProperty(p)) {
					result[p] = req[p];
				}
			}
			result.toUrl = function(name) {
				return toUrl(name, moduleId ? {mid: moduleId} : null);
			};
			result.toAbsMid = function(name) {
				return toAbsMid(name, moduleId ? {mid: moduleId} : null);
			};
			return result;
		}

		function registerAbsMids(absMids) {
			for (var s in absMids) {
				req.absMids[s] = absMids[s];
				req.absMidsById[absMids[s]] = s;
			}

		}

		function resolveTernaryHasExpression(expr) {
			// Expects an expression of the form supported by dojo/has.js loader, except that module identifiers are
			// integers corresponding to webpack module ids.  Returns a module reference if evaluation of the expression
			// using the currently defined features returns a module id, or else undefined.

			var has = req("dojo/has");
			var id = has.normalize(expr, function(arg){return arg;});
			return id && __webpack_require__(id) || undefined;
		}

		function findModule(mid, referenceModule, noInstall) {
			var isRelative = mid.charAt(0) === '.';
			if(/(^\/)|(\:)|(^[^!]*\.js$)/.test(mid) || (isRelative && !referenceModule)){
				throw new Error('Unsupported URL: ' + mid);
			}
			mid = mid.split("!").map(function(segment) {
				return toAbsMid(segment, referenceModule ? {mid: referenceModule} : null);
			}).join("!");
			var result;
			if (mid in req.absMids && __webpack_require__.m[req.absMids[mid]]) {
				if (noInstall) {
					const module = installedModules[req.absMids[mid]];
					result = module && module.l && module.exports;
				} else {
					result = __webpack_require__(req.absMids[mid]);
				}
			}
			if (!result) {
				throw new Error('Module not found: ' + mid);
			}
			return result;
		}

		function dojoModuleFromWebpackModule(webpackModule) {
			var dojoModule = {};
			Object.keys(webpackModule).forEach(key => {
				dojoModule[key] = webpackModule[key];
			});
			dojoModule.i = req.absMidsById[webpackModule.i] || webpackModule.i;
			return dojoModule;
		}

		function contextRequire(a1, a2, a3__, referenceModule, req) {
			var type = ({}.toString).call(a1);
			if (type === '[object String]') {
				return findModule(a1, referenceModule, true);
			} else if (type === '[object Object]') {
				throw new Error('Require config is not supported by WebPack');
			}
			if (type === '[object Array]') {
				var modules = [], callback = a2;
				a1.forEach(function(mid) {
					modules.push(findModule(mid, referenceModule));
				});
				callback.apply(this, modules);
				return req;
			} else {
				throw new Error('Unsupported require call');
			}
		}

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
			buf.push(source);
			buf.push("");
			buf.push("// Dojo loader compatibility functions");
			buf.push(toUrl.toString());
			buf.push(toAbsMid.toString());
			buf.push("");
			buf.push(createContextRequire.toString());
			buf.push("// dojo require function");
			buf.push("var req = function(config, dependencies, callback) {");
			buf.push(this.indent("return contextRequire(config, dependencies, callback, 0, req);"));
			buf.push("};");
			buf.push("");
			buf.push(findModule.toString());
			buf.push("");
			buf.push(contextRequire.toString());
			buf.push("");
			buf.push(dojoModuleFromWebpackModule.toString());
			buf.push("");
			buf.push(registerAbsMids.toString());
			buf.push(resolveTernaryHasExpression.toString());
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
			buf.push("dojoLoader.call(loaderScope, loaderConfig, {hasCache:" + JSON.stringify(require("./defaultFeatures")) + "});");
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
