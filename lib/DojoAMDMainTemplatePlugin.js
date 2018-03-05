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

const path = require('path');
const util = require('util');
const commondir = require('commondir');
const Template = require("webpack/lib/Template");
const stringify = require("node-stringify");
const {reg, tap, pluginName, callSyncBail, callSyncWaterfall} = require("./pluginHelper");

const needChunkLoadingCode = chunk => {
	for (const chunkGroup of chunk.groupsIterable) {
		if (chunkGroup.chunks.length > 1) return true;
		if (chunkGroup.getNumberOfChildren() > 0) return true;
	}
	return false;
};

module.exports = class DojoAMDMainTemplatePlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		debugger; //eslint-disable-line
		reg(compiler, {"dojoLoader" : ["Sync", "content", "filename"]});
		tap(compiler, {
			"dojoLoader"         : this.dojoLoader,
			"embeddedDojoLoader" : this.embeddedDojoLoader,
			"compilation"        : (compilation, params) => {
			const context = Object.create(this, {
				compilation:{value: compilation},
				params:{value: params},
				indent:{value:compilation.mainTemplate.indent||require("webpack/lib/Template").indent},
				asString:{value:compilation.mainTemplate.asString||require("webpack/lib/Template").asString}

			});
			tap(compilation, {"beforeChunkAssets" :  this.relativizeAbsoluteAbsMids}, context);
			reg(compilation.mainTemplate, {
				"dojoGlobalRequire"     : ["SyncWaterfall", "source"],
				"dojoRequireExtensions" : ["SyncWaterfall", "source", "chunk", "hash"],
				"renderDojoConfigVars"  : ["SyncWaterfall", "loaderScope", "source", "chunk", "hash"]
			});
			tap(compilation.mainTemplate, {
				"beforeStartup"         : this.requireExtensions,
				"dojoRequireExtensions" : this.dojoRequireExtensions, // plugin specific event
				"renderDojoConfigVars"  : this.renderDojoConfigVars, // plugin specific event
				"hash"                  : this.hash
			}, context);
		}}, this);
	}

	dojoLoader(content, filename) {
		this.dojoLoader = content;
		this.dojoLoaderFilename = filename;
	}

	embeddedDojoLoader(content, filename) {
		this.embeddedLoaderFilename = filename;
		// determine if the embedded loader has the dojo config API
		var scope = callSyncBail(this.compiler, "createEmbeddedLoaderScope", {packages:[{name:"dojo", location:"./dojo"}]}, content, filename);
		this.embeddedLoaderHasConfigApi = !!scope.require.packs;
	}

	requireExtensions(...args) {
		return callSyncWaterfall(this.compilation.mainTemplate, "dojoRequireExtensions", ...args);
	}

	dojoRequireExtensions(source, chunk, ...rest) {
		const {mainTemplate} = this.compilation;
		const runtimeSource = Template.getFunctionContent(require("./DojoAMDMainTemplate.runtime.js").main);
		const buf = [];
		buf.push(runtimeSource);
		buf.push("req.toUrl = toUrl;");
		buf.push("req.toAbsMid = toAbsMid;");
		buf.push("req.absMids = {};");
		buf.push("req.absMidsById = [];");
		buf.push("registerAbsMids({");
		buf.push(callSyncWaterfall(this.compilation.chunkTemplate, "renderAbsMids", "", chunk));
		buf.push("});");
		buf.push("");
		buf.push("req.async = 1;");
		buf.push("(function(){ // Ensure this refers to global scope");
		buf.push((callSyncWaterfall(mainTemplate, "dojoGlobalRequire", "(this||window).require = req;")));
		if(needChunkLoadingCode(chunk)) {
			const jsonpFn = JSON.stringify(mainTemplate.outputOptions.jsonpFunction);
			const globalObject = mainTemplate.outputOptions.globalObject;
			buf.push(this.indent(
				`${globalObject}[${jsonpFn}].registerAbsMids = registerAbsMids;`
			));
		}
		buf.push("})();");
		buf.push("");
		buf.push("// expose the Dojo compatibility functions as a properties of " + mainTemplate.requireFn);
		buf.push("var globalScope = (function(){return this||window;})();");
		buf.push(mainTemplate.requireFn + ".dj = {");
		buf.push(this.indent([
			"r: req,",
			"c: createContextRequire,",
			"m: dojoModuleFromWebpackModule,",
			"h: resolveTernaryHasExpression,",
			"g: globalScope   // Easy access to global scope"
		]));
		buf.push("};");
		buf.push("var loaderScope = {document:globalScope.document};");
		buf.push("loaderScope.global = loaderScope.window = loaderScope;");
		const dojoLoaderModule = this.compilation.modules.find((module) => { return module.rawRequest === this.embeddedLoaderFilename;});
		if (!dojoLoaderModule) {
			throw Error("Can't locate " + this.embeddedLoaderFilename + " in compilation");
		}
		buf.push("globalScope.dojoConfig = globalScope.dojoConfig || {}");
		var loaderScope;
		if (!this.embeddedLoaderHasConfigApi) {
			if (!util.isString(this.options.loaderConfig)) {
				let loaderConfig = this.options.loaderConfig;
				if (typeof loaderConfig === 'function') {
					loaderConfig = loaderConfig(this.options.environment || {});
				}
				loaderScope = callSyncBail(this.compiler, "createDojoLoaderScope", Object.assign({}, loaderConfig), this.dojoLoader, this.dojoLoaderFilename);
			} else {
				throw Error(`The embedded Dojo loader needs the config API in order to support loading the Dojo loader config as a module, \
but the loader specified at ${this.embeddedLoaderFilename} was built without the config API.  Please rebuild the embedded loader with 'dojo-config-api' feature enabled`);
			}
		}
		buf.push(callSyncWaterfall(mainTemplate, "renderDojoConfigVars", loaderScope, "", chunk, ...rest));
		buf.push(`var globalRequireContext = "${this.globalRequireContext || 'null'}"`);
		buf.push("var dojoLoader = " + mainTemplate.requireFn + "(" + JSON.stringify(dojoLoaderModule.id) + ");");
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
		const loaderConfig = callSyncBail(this.compiler, "getDojoConfig");
		if (loaderConfig.has && loaderConfig.has['dojo-undef-api']) {
			buf.push("req.undef = " +  Template.getFunctionContent(require("./DojoAMDMainTemplate.runtime.js").undef));
		}
		return this.asString([
			source,
			`(function() { /* Start ${pluginName} extensions */`,
			this.indent(buf),
			`})(); /* End ${pluginName} extensions */`
		]);
	}

	renderDojoConfigVars(loaderScope) {
		// Defines and assigns the defalutConfig and userConfig vars on the client.
		// If loaderScope is defined, then the embedded Dojo loader does not include the config API and so
		// the post-processed properties exported in the loaderScope should be used to specify the default config
		var defaultConfig = {hasCache:this.getDefaultFeatures()};
		const {mainTemplate} = this.compilation;
		const buf = [];
		// loader config props duplicated in default config when not using config api
		if (util.isString(this.options.loaderConfig)) {
			const dojoLoaderConfig = this.compilation.modules.find((module) => { return module.rawRequest === this.options.loaderConfig;});
			buf.push(`var userConfig = ${mainTemplate.requireFn}(${JSON.stringify(dojoLoaderConfig.id)});`);
			buf.push(`if (typeof userConfig === 'function') {`);
			buf.push(this.indent(`userConfig = userConfig.call(globalScope, ${stringify(this.options.environment || {})});`));
			buf.push("}");
		} else {
			var loaderConfig = this.options.loaderConfig;
			if (typeof loaderConfig === 'function') {
				loaderConfig = loaderConfig(this.options.environment || {});
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
				defaultConfig.hasCache = this.getDefaultFeatures();
			}
			buf.push(`var userConfig = mix(globalScope.dojoConfig, ${stringify(loaderConfig)});`);
		}
		buf.push(`var defaultConfig = ${stringify(defaultConfig)};`);
		return this.asString(buf);
	}

	hash(hash) {
		const {options} = this;
		hash.update("DojoAMDMainTemplate");
		hash.update("10");		// Increment this whenever the template code above changes
		if (util.isString(options.loaderConfig)) {
			hash.update(options.loaderConfig);	// loading the config as a module, so any any changes to the
																					//   content will be detected at the module level
		} else if (typeof options.loaderConfig === 'function') {
			hash.update(stringify(options.loaderConfig(options.environment || {})));
		} else {
			hash.update(stringify(options.loaderConfig));
		}
	}

	getDefaultFeatures() {
		return require("./defaultFeatures");
	}

	/**
	 * Relativize absolute absMids.  Absolute absMids are created when global require is used with relative module ids.
	 * They have the form '$$root$$/<absolute-path>' where '$$root$$' can be changed using the globalContext.varName
	 * option.  So as not to expose absolute paths on the client for security reasons, we determine the closest common
	 * directory for all the absolute absMids and rewrite the absMids in the form '$$root$$/<relative-path>', where the
	 * path is relative to the globalRequireContext path, and the globalRequireContext path is calculated as the globalContext
	 * directory relative to the closest common directory.  For example, if the globalContext path is '/a/b/c/d/e'
	 * and the closest common directory is '/a/b/c', then the globalRequireContext path would be'$$root$$/d/e', and the
	 * modified absMid for the module with absolute absMid '$$root$$/a/b/c/d/f/foo' would be '$$root$$/d/f/foo'.  The
	 * globalRequireContext path is emitted to the client so that runtime global require calls specifying relative module ids
	 * can be resolved on the client.  If at runtime, the client calls global require with the module id '../f/foo',
	 * then the absMid for the module will be computed by resolving the specified module id against the globalRequireContext
	 * path ('$$root$$/d/e'), resulting in '$$root$$/d/f/foo' and the client will locate the module by looking
	 * it up in the table of registered absMids.
	 *
	 * In the event that runtime global require calls attempt to traverse the globalRequireContext parent hierarchy
	 * beyond the level of the closest common directory, the globalContext.numParents option can be specified
	 * to indicate the number of parent directories beyond the closest common directory to include in
	 * the globalRequireContext path.  In the example above, a numParents value of 1 would result in the globalRequireContext
	 * path changing from '$$root$$/d/e' to '$$root$$/c/d/e' and the absMid for the module with absolute path
	 * '/a/b/c/d/f/foo' changing from '$$root$$/d/f/foo' to '$$root$$/c/d/f/foo'.
	 */
	relativizeAbsoluteAbsMids() {
		const relAbsMids = [];
		const relMods = [];
		var rootVarName = this.options.getGlobalContextVarName();
		// Gather the absMids that need to be rewritten, as well as the modules that contain them
		this.compilation.modules.forEach(module => {
			if (module.filterAbsMids) {
				var foundSome = false;
				module.filterAbsMids(absMid => {
					if (absMid.startsWith(rootVarName + "/")) {
						relAbsMids.push(path.dirname(absMid.substring(rootVarName.length + 1)));
						foundSome = true;
					}
					return true;
				});
				if (foundSome) {
					relMods.push(module);
				}
			}
		});
		if (relAbsMids.length) {
			// Determine the closest common directory for all the root relative modules
			var commonRoot = commondir(relAbsMids);
			// Get the global context
			var context = this.options.getGlobalContext(this.compiler);
			// Adjust the closest common directory as specified by config
			for (var i = 0; i < this.options.getGlobalContextNumParents(); i++) {
				commonRoot = path.resolve(commonRoot, '..');
			}
			// Determine the relative path from the adjusted common root to the global context and set it
			// as the build context that gets adorned and emitted to the client.
			var relative = path.relative(commonRoot, context);
			this.globalRequireContext = path.join(rootVarName, relative).replace(/\\/g,'/');
			if (!this.globalRequireContext.endsWith('/')) {
				this.globalRequireContext += '/';
			}
			// Now rewrite the absMids to be relative to the computed build context
			relMods.forEach(module => {
				const toFix = [];
				module.filterAbsMids(absMid => {
					if (absMid.startsWith(rootVarName + "/")) {
						toFix.push(absMid.substring(rootVarName.length + 1));
						return false;
					}
					return true;
				});
				toFix.forEach(absMid => {
					module.addAbsMid(path.normalize(path.join(rootVarName, relative, path.relative(context, absMid))).replace(/\\/g,'/'));
				});
			});
		}
	}
};
