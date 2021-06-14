/*
 * (C) Copyright HCL Technologies Ltd. 2018, 2019
 * (C) Copyright IBM Corp. 2017 All Rights Reserved.
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
const util = require('util');
const path = require('path');
const fs = require('fs');
const vm = require("vm");
const {SyncBailHook} = require('tapable');
const {Template} = require("webpack");
const {pluginName, getPluginProps} = require("./DojoAMDPlugin");
const loaderMainModulePatch = require("../runtime/DojoLoaderNonLocalMainPatch.runtime");
const CommonJsRequireDependency = require("webpack/lib/dependencies/CommonJsRequireDependency");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const BasicEvaluatedExpression = require("webpack/lib/javascript/BasicEvaluatedExpression");
const buildLoader = require("../buildDojo/buildapi");

const embeddedLoaderFilenameExpression = "__embedded_dojo_loader__";

module.exports = class DojoLoaderPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		this.pluginProps = getPluginProps(compiler);
		Object.defineProperties(this.pluginProps, {
			'dojoRequire': {
				enumerable: true,
				configurable: true,
				get: () => this.loaderScope.require
			},
			'dojoLoader': {
				enumerable: true,
				configurable: true,
				get: () => this.dojoLoader
			},
			'dojoLoaderFilename': {
				enumerable: true,
				configurable: true,
				get: () => this.dojoLoaderFilename
			},
			'embeddedLoader': {
				enumerable: true,
				configurable: true,
				get: () => this.embeddedLoader
			},
			'embeddedLoaderFilename': {
				enumerable: true,
				configurable: true,
				get: () => this.embeddedLoaderFilename
			},
			'embeddedLoaderHasConfigApi': {
				enumerable: true,
				configurable: true,
				get: () => this.embeddedLoaderHasConfigApi
			}
		});
		this.pluginProps.hooks.getDojoConfig = new SyncBailHook();
		this.pluginProps.hooks.createDojoLoaderScope = new SyncBailHook(["loaderConfig", "loader", "filename"]);
		this.pluginProps.hooks.createEmbeddedLoaderScope = new SyncBailHook(["userConfig", "embeddedLoader", "filename"]);
		this.pluginProps.hooks.getDojoConfig.tap(pluginName, this.getBuildLoaderConfig.bind(this));
		this.pluginProps.hooks.createDojoLoaderScope.tap(pluginName, this.createLoaderScope.bind(this));
		this.pluginProps.hooks.createEmbeddedLoaderScope.tap(pluginName, this.createEmbeddedLoaderScope.bind(this));
		compiler.hooks.run.tapAsync(pluginName, this.run1.bind(this));
		compiler.hooks.run.tapAsync(pluginName, this.run2.bind(this));
		compiler.hooks.watchRun.tapAsync(pluginName, this.run1.bind(this));
		compiler.hooks.watchRun.tapAsync(pluginName, this.run2.bind(this));
		compiler.hooks.compilation.tap(pluginName, (compilation, params) => {
			if (!this.options.isSkipCompilation(compilation)) {
				let context = Object.create(this, {
					compilation:{value: compilation},
					params:{value: params}
				});
				compilation.hooks.succeedModule.tap(pluginName, this.addDojoDeps.bind(context));
				compilation.hooks.afterOptimizeChunks.tap(pluginName, this.afterOptimizeChunks.bind(context));
				// Support for the __embedded_dojo_loader__ webpack variable.  This allows applications (and unit tests)
				// to require the embedded loader module with require(__embedded_dojo_loader__);
				params.normalModuleFactory.hooks.parser.for('javascript/auto').tap(pluginName, parser => {
					context = Object.create(context, {parser: {value: parser}});
					parser.hooks.expression.for(embeddedLoaderFilenameExpression).tap(pluginName, this.expressionLoader.bind(context));
					parser.hooks.evaluateTypeof.for(embeddedLoaderFilenameExpression).tap(pluginName, this.evaluateTypeofLoader.bind(context));
					parser.hooks.evaluateIdentifier.for(embeddedLoaderFilenameExpression).tap(pluginName, this.evaluateIdentifierLoader.bind(context));
				});
			}
		});
	}

	getDojoPath(loaderConfig) {
		var dojoPath;
		if (!loaderConfig.packages || !loaderConfig.packages.some((pkg) => {
			if (pkg.name === "dojo") {
				return dojoPath = path.resolve(loaderConfig.baseUrl, pkg.location);
			}
		})) {
			return path.join(require.resolve("dojo/dojo.js"), "..");
		}
		return dojoPath;
	}

	getOrCreateEmbeddedLoader(dojoPath, loaderConfig, options, callback) {
		var dojoLoaderPath;
		if (options.loader) {
			try {
				 dojoLoaderPath = require.resolve(options.loader);
				 fs.readFile(dojoLoaderPath, "utf-8", (err, content) => {
					 return callback(err, content);
				 });
			} catch (error) {
				return callback(error);
			}
		} else {
			if (!options.noConsole) {
				console.log("Dojo loader not specified in options.  Building the loader...");
			}
			const tmp = require("tmp");
			// create temporary directory to hold output
			tmp.dir({unsafeCleanup: true}, (err, tempDir) => {
				if (err) {
					return callback(err);
				}
				const featureOverrides = {};
				if (!util.isString(options.loaderConfig)) {
					// If config is not a module, then honor the 'dojo-config-api' has feature if specified
					if (loaderConfig.has && ('dojo-config-api' in loaderConfig.has) && !loaderConfig.has['dojo-config-api']) {
						featureOverrides['dojo-config-api'] = 0;
					}
				}
				buildLoader({
					dojoPath: path.resolve(loaderConfig.baseUrl, dojoPath, "./dojo"), 	// path to dojo.js
					releaseDir: tempDir,	// target location
					has: featureOverrides,
					noConsole: options.noConsole
				}).then(() => {
					options.loader = path.join(tempDir, "dojo/dojo.js");
					dojoLoaderPath = require.resolve(path.join(options.loader));
					fs.readFile(dojoLoaderPath, "utf-8", (err, content) => { // eslint-disable-line no-shadow
						callback(err, content);
					});
				}).catch(err => { // eslint-disable-line no-shadow
					callback(err);
				});
			});
		}
	}

	createLoaderScope(loaderConfig, loader, filename) {
		const loaderScope = {};
		loaderScope.global = loaderScope.window = loaderScope;
		loaderScope.dojoConfig = Object.assign({}, loaderConfig);
		loaderScope.dojoConfig.has = Object.assign({}, this.getDefaultFeaturesForEmbeddedLoader(), loaderScope.dojoConfig.has, {"dojo-config-api":1, "dojo-publish-privates":1});
		var context = vm.createContext(loaderScope);
		const patch = "(function(loaderScope){" + Template.getFunctionContent(loaderMainModulePatch) + "})(global);";
		vm.runInContext('(function(global, window) {' + loader + patch + '});', context, filename).call(context, context);
		return loaderScope;
	}

	createEmbeddedLoaderScope(userConfig, embeddedLoader, filename) {
		const loaderScope = {};
		const defaultConfig = {hasCache:{}, modules:{}};
		loaderScope.global = loaderScope.window = loaderScope;
		var context = vm.createContext(loaderScope);
		vm.runInContext("var module = {};" + embeddedLoader, context, filename).call(context, userConfig, defaultConfig, context, context);
		return loaderScope;
	}

	getBuildLoaderConfig() {
		var loaderConfig = this.options.loaderConfig;
		if (util.isString(loaderConfig)) {
			loaderConfig = require(loaderConfig);
		}
		if (typeof loaderConfig === 'function') {
			loaderConfig = loaderConfig(this.options.buildEnvironment || this.options.environment || {});
		}
		loaderConfig.baseUrl = path.resolve(this.compiler.context, loaderConfig.baseUrl || ".").replace(/\\/g, "/");
		return loaderConfig;
	}

	run1(__, callback) {
		// Load the Dojo loader and get the require function into loaderScope
		var loaderConfig = this.pluginProps.hooks.getDojoConfig.call();
		var dojoPath;
		try {
			dojoPath = this.getDojoPath(loaderConfig);
		} catch (e) {
			return callback(e);
		}
		this.dojoLoaderFilename = path.join(dojoPath, "dojo.js");
		fs.readFile(this.dojoLoaderFilename, 'utf-8', (err, content) => {
			this.dojoLoader = content;
			if (err) return callback(err);
			//callSync(this.compiler, "dojo-loader", content, filename);
			this.loaderScope = this.pluginProps.hooks.createDojoLoaderScope.call(loaderConfig, content, this.dojoLoaderFilename);
			return callback();
		});
	}

	run2(__, callback) {
		// Load the Dojo loader and get the require function into loaderScope
		var loaderConfig = this.pluginProps.hooks.getDojoConfig.call();
		var dojoPath;
		try {
			dojoPath = this.getDojoPath(loaderConfig);
		} catch (e) {
			return callback(e);
		}
		this.getOrCreateEmbeddedLoader(dojoPath, loaderConfig, this.options, (err, content) => {
			// options.loader specifies path to the embedded loader (set by createEmbeddedLoader if created)
			if (!err) {
				var scope = this.createEmbeddedLoaderScope({packages:[{name:"dojo", location:"./dojo"}]}, content, this.options.loader);
				this.embeddedLoader = content;
				this.embeddedLoaderFilename = this.options.loader;
				this.embeddedLoaderHasConfigApi = !!scope.require.packs;
			}
			callback(err);
		});
	}

	addDojoDeps(module) {
		const {options} = this;
		if (!this.compilation.moduleGraph.getIssuer(module)) {
			// No issuer generally means an entry module, so add a Dojo loader dependency.  It doesn't
			// hurt to add extra dependencies because the Dojo loader module will be removed from chunks
			// that don't need it in the 'after-optimize-chunks' handler below.
			var loaderDep = new CommonJsRequireDependency(options.loader);
			loaderDep.loc = {
				start: {line: -1, column: 0},
				end: {line: -1, column: 0},
				index: -2
			};
			module.addDependency(loaderDep);
			if (util.isString(options.loaderConfig)) {
				var configDep = new CommonJsRequireDependency(options.loaderConfig);
				configDep.loc = {
					start: {line: -1, column: 0},
					end: {line: -1, column: 0},
					index: -1
				};
				module.addDependency(configDep);
			}
		}
	}

	afterOptimizeChunks(chunks) {
		// Get the loader and loader config
		const {options, compilation} = this;
		const loaderModule = Array.from(compilation.modules).find((module) => { return module.rawRequest === options.loader;});
		const configModule = util.isString(options.loaderConfig) &&
								Array.from(compilation.modules).find((module) => { return module.rawRequest === options.loaderConfig;});

		// Ensure that the Dojo loader, and optionally the loader config, are included
		// only in the entry chunks that contain the webpack runtime.
		chunks.forEach((chunk) => {
			if (chunk.hasRuntime()) {
				if (!loaderModule) {
					throw Error("Can't locate " + options.loader + " in compilation");
				}
				if (util.isString(options.loaderConfig) && !configModule) {
					throw Error("Can't locate " + options.loaderConfig + " in compilation");
				}
				if (!this.compilation.chunkGraph.isModuleInChunk(loaderModule, chunk)) {
					this.compilation.chunkGraph.connectChunkAndModule(chunk, loaderModule);
				}
				if (configModule && !this.compilation.chunkGraph.isModuleInChunk(configModule, chunk)) {
					this.compilation.chunkGraph.connectChunkAndModule(chunk, configModule);
				}
			} else if (loaderModule) {
				if (this.compilation.chunkGraph.isModuleInChunk(loaderModule, chunk)) {
					this.compilation.chunkGraph.disconnectChunkAndModule(chunk, loaderModule);
				}
				if (configModule && this.compilation.chunkGraph.isModuleInChunk(configModule, chunk)) {
					this.compilation.chunkGraph.disconnectChunkAndModule(chunk, configModule);
				}
			}
		});
	}

	expressionLoader(expr) {
		// change __embedded_dojo_loader__ expressions in the source to the filename value as a string.
		const {parser} = this;
		const fn = parser.hooks.evaluateIdentifier.for(embeddedLoaderFilenameExpression).call(expr).string.replace(/\\/g, "\\\\");
		const dep = new ConstDependency("\"" + fn + "\"", expr.range);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
		return true;
	}

	evaluateTypeofLoader(expr) {
		// implement typeof operator for the expression
		var result = new BasicEvaluatedExpression().setString("string");
		if (expr) {
			result.setRange(expr.range);
		}
		return result;
	}

	evaluateIdentifierLoader(expr) {
		var result = new BasicEvaluatedExpression().setString(this.embeddedLoaderFilename);
		if (expr) {
			result.setRange(expr.range);
		}
		return result;
	}

	getDefaultFeaturesForEmbeddedLoader() {
		return require("../buildDojo/loaderDefaultFeatures");
	}
};
