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
const Template = require("webpack/lib/Template");
const stringify = require("node-stringify");
const dojoLoaderUtils = require("./dojoLoaderUtils");

module.exports = class DojoAMDMainTemplatePlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		var dojoLoader;
		var dojoLoaderFilename;
		var embeddedLoaderFilename;
		var embeddedLoaderHasConfigApi;

		compiler.plugin("dojo-loader", (content, filename) => {
			dojoLoader = content;
			dojoLoaderFilename = filename;
		});

		compiler.plugin("embedded-dojo-loader", (content, filename) => {
			embeddedLoaderFilename = filename;
			// determine if the embedded loader has the dojo config API
			var scope = dojoLoaderUtils.createEmbeddedLoaderScope({packages:[{name:"dojo", location:"./dojo"}]}, content, filename);
			embeddedLoaderHasConfigApi = !!scope.require.packs;
		});

		compiler.plugin("compilation", compilation => {
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
				buf.push(compilation.chunkTemplate.applyPluginsWaterfall("render absMids", "", chunk));
				buf.push("});");
				buf.push("");
				buf.push("req.async = 1;");
				buf.push("(function(){ // Ensure this refers to global scope");
				buf.push(this.indent("this.require = req;"));
				if(chunk.chunks.length > 0) {
					var jsonpFn = JSON.stringify(this.outputOptions.jsonpFunction);
					buf.push(this.indent(`this[${jsonpFn}].registerAbsMids = registerAbsMids;`));
				}
				buf.push("})();");
				return this.asString(buf);
			});

			compilation.mainTemplate.plugin("require-extensions", function(source, chunk, hash) {
				return this.applyPluginsWaterfall("dojo-require-extensions", source, options, chunk, hash);
			});

			compilation.mainTemplate.plugin("dojo-require-extensions", function(source, options, chunk, hash) { // eslint-disable-line no-shadow
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
				const dojoLoaderModule = compilation.modules.find((module) => { return module.rawRequest === embeddedLoaderFilename;});
				/* istanbul ignore if */
				if (!dojoLoaderModule) {
					throw Error("Can't locate " + embeddedLoaderFilename + " in compilation");
				}
				buf.push("globalScope.dojoConfig = globalScope.dojoConfig || {}");
				var loaderScope;
				if (!embeddedLoaderHasConfigApi) {
					if (!util.isString(options.loaderConfig)) {
						var loaderConfig = options.loaderConfig;
						if (typeof loaderConfig === 'function') {
							loaderConfig = loaderConfig(options.environment || {});
						}
						loaderScope = dojoLoaderUtils.createLoaderScope(Object.assign({}, loaderConfig), dojoLoader, dojoLoaderFilename);
					} else {
						throw Error(`The embedded Dojo loader needs the config API in order to support loading the Dojo loader config as a module, \
but the loader specified at ${embeddedLoaderFilename} was built without the config API.  Please rebuild the embedded loader with 'dojo-config-api' feature enabled`);
					}
				}
				buf.push(this.applyPluginsWaterfall("render-dojo-config-vars", "", options, loaderScope, chunk, hash));
				buf.push("var dojoLoader = " + this.requireFn + "(" + JSON.stringify(dojoLoaderModule.id) + ");");
				buf.push("dojoLoader.call(loaderScope, userConfig, defaultConfig, loaderScope, loaderScope);");
				if (loaderScope) {
					// loaderProps.baseUrl is set by the loader config renderer if the loader has no config api.
					buf.push("loaderScope.require.baseUrl = " + JSON.stringify(loaderScope.require.baseUrl) + ";");
				}
				buf.push("req.baseUrl = loaderScope.require.baseUrl");
				buf.push("req.has = loaderScope.require.has;");
				buf.push("req.rawConfig = loaderScope.require.rawConfig");
				buf.push("req.on = loaderScope.require.on");
				buf.push("req.signal = loaderScope.require.signal");
				buf.push("");
				return this.asString(buf);
			});

			compilation.mainTemplate.plugin("render-dojo-config-vars", function(source__, options, loaderScope) { // eslint-disable-line no-shadow
				// Defines and assigns the defalutConfig and userConfig vars on the client.
				// If loaderScope is defined, then the embedded Dojo loader does not include the config API and so
				// the post-processed properties exported in the loaderScope should be used to specify the default config
				var defaultConfig = {hasCache:require("./defaultFeatures")};
				const buf = [];
				// loader config props duplicated in default config when not using config api
				if (util.isString(options.loaderConfig)) {
					const dojoLoaderConfig = compilation.modules.find((module) => { return module.rawRequest === options.loaderConfig;});
					buf.push(`var userConfig = ${this.requireFn}(${JSON.stringify(dojoLoaderConfig.id)});`);
					buf.push(`if (typeof userConfig === 'function') {`);
					buf.push(this.indent(`userConfig = userConfig.call(globalScope, ${stringify(options.environment || {})});`));
					buf.push("}");
				} else {
					var loaderConfig = options.loaderConfig;
					if (typeof loaderConfig === 'function') {
						loaderConfig = loaderConfig(options.environment || {});
					}
					if (loaderScope) {
						// make a working copy of the config for us to modify
						loaderConfig = Object.assign({}, loaderConfig);

						// Items to copy from the require object to the default config
						["paths", "pathsMapProg", "packs", "aliases", "mapProgs",  "cacheBust"].forEach(prop => {
							defaultConfig[prop] = loaderScope.require[prop];
						});
						["modules", "cache"].forEach(prop => {
							defaultConfig[prop] = {};
						});
						// Remove packages defined by the loader default config
						["dojo", "dijit", "dojox", "tests", "doh", "build", "demos"].forEach(prop => {
							if (!loaderConfig.packages || !loaderConfig.packages.find(pack => {return pack.name === prop;})) delete defaultConfig.packs[prop];
						});
						// Remove duplicated/redundant items from the user config since they are not needed by Dojo.
						["paths", "packages", "aliases", "maps", "cacheBust"].forEach(prop => {
							delete loaderConfig[prop];
						});
						defaultConfig.hasCache = require("./defaultFeatures");
					}
					buf.push(`var userConfig = Object.assign(globalScope.dojoConfig, ${stringify(loaderConfig)});`);
				}
				buf.push(`var defaultConfig = ${stringify(defaultConfig)};`);
				return this.asString(buf);
			});

			compilation.mainTemplate.plugin("hash", function(hash) {
				hash.update("DojoAMDMainTemplate");
				hash.update("9");		// Increment this whenever the template code above changes
				if (util.isString(options.loaderConfig)) {
					hash.update(options.loaderConfig);	// loading the config as a module, so any any changes to the
					                                    //   content will be detected at the module level
				} else if (typeof options.loaderConfig === 'function') {
					hash.update(stringify(options.loaderConfig(options.environment || {})));
				} else {
					hash.update(stringify(options.loaderConfig));
				}
			});
		});
	}
};
