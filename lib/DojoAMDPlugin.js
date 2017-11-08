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
const path = require("path");
const util = require("util");
const async = require("async");
const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
const LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
const NormalModuleReplacementPlugin = require("webpack/lib/NormalModuleReplacementPlugin");

const NullFactory = require("webpack/lib/NullFactory");

const DojoAMDRequireDependenciesBlockParserPlugin = require("./DojoAMDRequireDependenciesBlockParserPlugin");
const DojoAMDDefineDependencyParserPlugin = require("./DojoAMDDefineDependencyParserPlugin");
const CJSRequireDependencyParserPlugin = require("./CJSRequireDependencyParserPlugin");
const DojoAMDMainTemplatePlugin = require("./DojoAMDMainTemplatePlugin");
const DojoAMDChunkTemplatePlugin = require("./DojoAMDChunkTemplatePlugin");
const DojoAMDResolverPlugin = require("./DojoAMDResolverPlugin");
const DojoAMDModuleFactoryPlugin = require("./DojoAMDModuleFactoryPlugin");
const DojoLoaderEnsurePlugin = require("./DojoLoaderEnsurePlugin");
const DojoAMDRequireArrayDependency =  require("./DojoAMDRequireArrayDependency");
const dojoLoaderUtils = require("./dojoLoaderUtils");

function getDojoPath(loaderConfig) {
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
module.exports = class DojoAMDPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		var loaderScope;
		const loaderProps = {};
		var embeddedLoader = null;

		// Wrapper for Dojo require since we need to pass require to plugin constructors
		// before the actual require function is available.
		const reqWrapper = function() {
			return reqWrapper.checkInit() && loaderScope.require.apply(this, arguments);
		};
		reqWrapper.checkInit = function() {
			if (!loaderScope.require) {
				throw new Error("Dojo require not yet initialized");
			}
			return true;
		};
		['toAbsMid', 'toUrl', 'has'].forEach((name) => {
			reqWrapper[name] = function() {
				return reqWrapper.checkInit() && loaderScope.require[name].apply(loaderScope.require, arguments);
			};
		});

		compiler.plugin(["run", "watch-run"], (compilation__, callback) => {
			// Load the Dojo loader and get the require function into loaderScope
			let loaderConfig;
			if (util.isString(this.options.loaderConfig)) {
				loaderConfig = require(this.options.loaderConfig);
				if (typeof loaderConfig === 'function') {
					loaderConfig = loaderConfig(this.options.buildEnvironment || this.options.environment || {});
				}
			} else if (typeof this.options.loaderConfig === 'function') {
				loaderConfig = this.options.loaderConfig(this.options.buildEnvironment || this.options.environment || {});
			} else {
				loaderConfig = this.options.loaderConfig;
			}
			loaderConfig.baseUrl = path.resolve(compiler.context, loaderConfig.baseUrl || ".").replace(/\\/g, "/");

			if (!loaderScope) {
				var dojoPath;
				try {
					dojoPath = getDojoPath(loaderConfig);
				} catch (e) {
					return callback(e);
				}
				async.parallel([
					cb => {
						const fs = require("fs");
						loaderProps.filename = path.join(dojoPath, "dojo.js");
						fs.readFile(loaderProps.filename, 'utf-8', (err, content) => {
							if (err) return cb(err);
							loaderProps.content = content;
							loaderScope = dojoLoaderUtils.createLoaderScope(loaderConfig, loaderProps);
							return cb();
						});
					},
					cb => {
						dojoLoaderUtils.createEmbeddedLoader(dojoPath, loaderConfig, this.options, (err, result) => {
							if (!err) {
								embeddedLoader = result;
							}
							cb(err);
						});
					}
				], err => {
					callback(err);
				});
			} else {
				callback();
			}
		});

		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(DojoAMDRequireItemDependency, params.normalModuleFactory);
			compilation.dependencyTemplates.set(DojoAMDRequireItemDependency, new DojoAMDRequireItemDependency.Template());

			compilation.dependencyFactories.set(DojoAMDDefineDependency, new NullFactory());
			compilation.dependencyTemplates.set(DojoAMDDefineDependency, new DojoAMDDefineDependency.Template());

			compilation.dependencyFactories.set(DojoAMDRequireArrayDependency, new NullFactory());
			compilation.dependencyTemplates.set(DojoAMDRequireArrayDependency, new DojoAMDRequireArrayDependency.Template());

			compilation.dependencyFactories.set(LocalModuleDependency, new NullFactory());
			compilation.dependencyTemplates.set(LocalModuleDependency, new LocalModuleDependency.Template());

			compilation.apply(new DojoAMDMainTemplatePlugin(this.options, loaderProps));
			compilation.apply(new DojoAMDChunkTemplatePlugin(this.options));

			params.normalModuleFactory.plugin("parser", (parser) => {
				parser.plugin("expression module", () => {
					if (parser.state.module.isAMD) {
						return true;
					}
				});
			});

			compiler.plugin("make", (compilation__, callback) => {
				dojoLoaderUtils.validateEmbeddedLoader(params, embeddedLoader, loaderScope, (err, embeddedLoaderScope) => {
					if (!err) {
						loaderProps.embeddedLoaderHasConfigApi = !!embeddedLoaderScope.require.packs;
					}
					callback(err);
				});
			});
		});

		compiler.plugin("normal-module-factory", () => {
			compiler.apply(
				new NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!/, data => {
					data.absMidAliases.push(data.absMid);
					data.absMid = data.request = "dojo/selector/lite";
				}),
				new NormalModuleReplacementPlugin(/^dojo\/request\/default!/, data => {
					data.absMidAliases.push(data.absMid);
					data.absMid = data.request = "dojo/request/xhr";
				}),
				new NormalModuleReplacementPlugin(/^dojo\/text!/, data => {
					data.request = data.request.replace(/^dojo\/text!/, "!!raw-loader!");
				}),
				new NormalModuleReplacementPlugin(/^dojo\/query!/, data => {
					var match = /^dojo\/query!(.*)$/.exec(data.request);
					data.request = "dojo/loaderProxy?loader=dojo/query&name=" + match[1] + "!";
				})
			);
		});

		compiler.apply(
			new DojoAMDModuleFactoryPlugin(this.options, reqWrapper),
			new DojoLoaderEnsurePlugin(this.options)
		);

		compiler.plugin("compilation", (__, params) => {
			params.normalModuleFactory.plugin("parser", (parser) => {
				parser.apply(
					new DojoAMDRequireDependenciesBlockParserPlugin(this.options, reqWrapper),
					new DojoAMDDefineDependencyParserPlugin(this.options, reqWrapper),
					new CJSRequireDependencyParserPlugin()
				);
			});
			compiler.resolvers.normal.apply(
				new DojoAMDResolverPlugin(reqWrapper)
			);
		});

		compiler.plugin("get dojo require", () => {
			return loaderScope.require;
		});

		// Copy options to webpack options
		compiler.options.DojoAMDPlugin = this.options;

		// Add resolveLoader config entry
		const resolveLoader = compiler.options.resolveLoader = compiler.options.resolveLoader || {};
		const alias = resolveLoader.alias = resolveLoader.alias || {};
		alias['dojo/i18n'] = path.resolve(__dirname, "..", "loaders", "dojo", "i18n");
		alias['dojo/i18nRootModifier'] = path.resolve(__dirname, "..", "loaders", "dojo", "i18nRootModifier");
		alias['dojo/loaderProxy'] = path.resolve(__dirname, "..", "loaders", "dojo", "loaderProxy");
	}
};
