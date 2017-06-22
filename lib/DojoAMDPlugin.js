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
var path = require("path");
var util = require("util");
var mixin = require('node-mixin');
var DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
var DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
var LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
var NormalModuleReplacementPlugin = require("webpack/lib/NormalModuleReplacementPlugin");

var NullFactory = require("webpack/lib/NullFactory");

var DojoAMDRequireDependenciesBlockParserPlugin = require("./DojoAMDRequireDependenciesBlockParserPlugin");
var DojoAMDDefineDependencyParserPlugin = require("./DojoAMDDefineDependencyParserPlugin");
var DojoAMDMainTemplatePlugin = require("./DojoAMDMainTemplatePlugin");
var DojoAMDChunkTemplatePlugin = require("./DojoAMDChunkTemplatePlugin");
var DojoAMDResolverPlugin = require("./DojoAMDResolverPlugin");
var DojoAMDModuleFactoryPlugin = require("./DojoAMDModuleFactoryPlugin");

function DojoAMDPlugin(options) {
	this.options = options;
}
module.exports = DojoAMDPlugin;

DojoAMDPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	var loaderScope = {};

	// Wrapper for Dojo require since we need to pass require to plugin constructors
	// before the actual require function is available.
	var reqWrapper = function() {
		return reqWrapper.checkInit() && loaderScope.require.apply(this, arguments);
	};
	reqWrapper.checkInit = function() {
		if (!loaderScope.require) {
			throw new Error("Dojo require not yet initialized");
		}
		return true;
	};
	['toAbsMid', 'toUrl', 'has'].forEach(function(name) {
		reqWrapper[name] = function() {
			return reqWrapper.checkInit() && loaderScope.require[name].apply(loaderScope.require, arguments);
		};
	});

	compiler.plugin(["run", "watch-run"], function(compilation__, callback) {
		// Load the Dojo loader and get the require function into loaderScope
		var loaderConfig = util.isString(options.loaderConfig) ? require(options.loaderConfig) : options.loaderConfig;
		var nodeConfig = mixin({}, loaderConfig);
		nodeConfig.baseUrl = path.resolve(compiler.context, nodeConfig.baseUrl || ".").replace(/\\/g, "/");

		if (!loaderScope.require) {
			getDojoLoader(options, nodeConfig, function(err, dojoLoader) {
				if (!err) {
					dojoLoader.call(loaderScope, nodeConfig, {hasCache:{'dojo-config-api':1, 'dojo-inject-api':1, 'host-node':0, 'dom':0, 'dojo-sniff':0}});
				} else {
					console.error(err);
				}
				callback(err);
			});
		} else {
			callback();
		}
	});

	compiler.parser.plugin("expression module", function() {
		if (this.state.module.isAMD) {
			return true;
		}
	});

	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(DojoAMDRequireItemDependency, params.normalModuleFactory);
		compilation.dependencyTemplates.set(DojoAMDRequireItemDependency, new DojoAMDRequireItemDependency.Template());

		compilation.dependencyFactories.set(DojoAMDDefineDependency, new NullFactory());
		compilation.dependencyTemplates.set(DojoAMDDefineDependency, new DojoAMDDefineDependency.Template());

		compilation.dependencyFactories.set(LocalModuleDependency, new NullFactory());
		compilation.dependencyTemplates.set(LocalModuleDependency, new LocalModuleDependency.Template());

		compilation.apply(new DojoAMDMainTemplatePlugin(options));
		compilation.apply(new DojoAMDChunkTemplatePlugin(options));
	});

	compiler.plugin("normal-module-factory", function() {
		compiler.apply(
			new NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!/, function(data) {
				data.absMidAliases.push(data.absMid);
				data.absMid = data.request = "dojo/selector/lite";
			}),
			new NormalModuleReplacementPlugin(/^dojo\/request\/default!/, function(data) {
				data.absMidAliases.push(data.absMid);
				data.absMid = data.request = "dojo/request/xhr";
			}),
			new NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
				data.request = data.request.replace(/^dojo\/text!/, "!!raw!");
			})
		);
	});

	compiler.apply(
		new DojoAMDModuleFactoryPlugin(options, reqWrapper)
	);

	compiler.parser.apply(
		new DojoAMDRequireDependenciesBlockParserPlugin(options, reqWrapper),
		new DojoAMDDefineDependencyParserPlugin(options, reqWrapper)
	);

	compiler.resolvers.normal.apply(
		new DojoAMDResolverPlugin("normal", reqWrapper)
	);

	compiler.plugin("get dojo require", function() {
		return loaderScope.require;
	});

	// Copy options to webpack options
	compiler.options.DojoAMDPlugin = mixin(compiler.options.dojoOptions || {}, options);

	// Add resolveLoader config entry
	var resolveLoader = compiler.options.resolveLoader = compiler.options.resolveLoader || {};
	var root = resolveLoader.root = resolveLoader.root || [];
	root = resolveLoader.root = Array.isArray(root) ? root : [root];
	root.push(path.join(__dirname, "..", "loaders"));

	function getDojoLoader(options__, nodeConfig, callback) {
		var dojoLoader;
		if (options.loader) {
			dojoLoader = require(options.loader);
			callback(null, dojoLoader);
		} else {
			console.log("Dojo loader not specified in options.  Building the loader...");
			var execFile = require("child_process").execFile;
			var tmp = require("tmp");
			var dojoPath;
			if (!nodeConfig.packages.some(function(pkg) {
				if (pkg.name === "dojo") return (dojoPath = pkg.location);
			})) {
				return callback(new Error("dojo package not defined in loader config"));
			}
			// create temporary directory to hold output
			tmp.dir({unsafeCleanup: true}, function(err, tempDir) {
				if (err) {
					callback(err);
				}
				execFile(
					"node", // the executable to run
					[	// The arguments
						path.resolve(nodeConfig.baseUrl, dojoPath, "./dojo"), 	// path to dojo.js
						"load=build",
						"--profile",
						path.join(__dirname, "../buildDojo/loader.profile.js"), // the build profile
						"--release",
						"--releaseDir",
						tempDir	// target location
					], function(error, stdout, stderr) {
						if (error) {
							console.log(stderr.toString());
							callback(error);
						} else {
							console.log(stdout.toString());
							options.loader = path.join(tempDir, "dojo/dojo.js");
							dojoLoader = require(path.join(options.loader));
							callback(null, dojoLoader);
						}
					}
				);
			});
		}
	}
};
