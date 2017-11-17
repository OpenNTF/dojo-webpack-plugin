/*
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
const CommonJsRequireDependency = require("webpack/lib/dependencies/CommonJsRequireDependency");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const BasicEvaluatedExpression = require("webpack/lib/BasicEvaluatedExpression");
const dojoLoaderUtils = require("./dojoLoaderUtils");

const embeddedLoaderFilenameExpression = "__embedded_dojo_loader__";

function containsModule(chunk, module) {
	if (chunk.containsModule) {
		return chunk.containsModule(module);
	} else {
		return chunk.modules.indexOf(module) !== -1;
	}
}

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

function getOrCreateEmbeddedLoader(dojoPath, loaderConfig, options, callback) {
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
		const execFile = require("child_process").execFile;
		const tmp = require("tmp");
		// create temporary directory to hold output
		tmp.dir({unsafeCleanup: true}, (err, tempDir) => {
			/* istanbul ignore if */
			if (err) {
				callback(err);
			}
			const featureOverrides = {};
			if (!util.isString(options.loaderConfig)) {
				// If config is not a module, then honor the 'dojo-config-api' has feature if specified
				if (loaderConfig.has && ('dojo-config-api' in loaderConfig.has) && !loaderConfig.has['dojo-config-api']) {
					featureOverrides['dojo-config-api'] = 0;
				}
			}
			execFile(
				"node", // the executable to run
				[	// The arguments
					path.resolve(__dirname, "../buildDojo", "buildRunner.js"),
					"load=build",
					"--dojoPath",
					path.resolve(loaderConfig.baseUrl, dojoPath, "./dojo"), 	// path to dojo.js
					"--profile",
					path.join(__dirname, "../buildDojo/loader.profile.js"), // the build profile
					"--release",
					"--releaseDir",
					tempDir,	// target location
					"--has",
					JSON.stringify(featureOverrides)
				], (error, stdout, stderr) => {
					/* istanbul ignore if */
					if (error) {
						console.error(stderr.toString());
						callback(error);
					} else {
						if (!options.noConsole) {
							console.log(stdout.toString());
						}
						options.loader = path.join(tempDir, "dojo/dojo.js");
						dojoLoaderPath = require.resolve(path.join(options.loader));
						fs.readFile(dojoLoaderPath, "utf-8", (err, content) => { // eslint-disable-line no-shadow
							callback(err, content);
						});
					}
				}
			);
		});
	}
}

function validateEmbeddedLoader(params, embeddedLoader, filename, callback) {
	// Vefiry that embedded loader version and dojo version are the same
	params.normalModuleFactory.create({
		dependencies: [{request: "dojo/package.json"}]
	}, (err, pkgModule) => {
		if (!err) {
			 const dojoVersion = require(pkgModule.request).version;
			 const scope = dojoLoaderUtils.createEmbeddedLoaderScope({}, embeddedLoader, filename);
			 if (dojoVersion !== scope.loaderVersion) {
				 err = new Error(
`Dojo loader version does not match the version of Dojo.
Loader version = ${scope.loaderVersion}.
Dojo version = ${dojoVersion}.
You may need to rebuild the Dojo loader.
Refer to https://github.com/OpenNTF/dojo-webpack-plugin/blob/master/README.md#building-the-dojo-loader`);
			 }
			 return callback(err, scope);
		}
		callback();
	});
}

function getBuildLoaderConfig(options, compiler) {
	var loaderConfig = options.loaderConfig;
	if (util.isString(loaderConfig)) {
		loaderConfig = require(loaderConfig);
	}
	if (typeof loaderConfig === 'function') {
		loaderConfig = loaderConfig(options.buildEnvironment || options.environment || {});
	}
	loaderConfig.baseUrl = path.resolve(compiler.context, loaderConfig.baseUrl || ".").replace(/\\/g, "/");
	return loaderConfig;
}


module.exports = class DojoLoaderPlugin {
	constructor(options) {
		this.options = options;
	}
	apply(compiler) {
		var loaderScope;
		var embeddedLoader;
		var embeddedLoaderFilename;

		compiler.plugin(["run", "watch-run"], (compilation__, callback) => {
			// Load the Dojo loader and get the require function into loaderScope
			var loaderConfig = getBuildLoaderConfig(this.options, compiler);
			/* istanbul ignore else */
			if (!loaderScope) {
				var dojoPath;
				try {
					dojoPath = getDojoPath(loaderConfig);
				} catch (e) {
					/* istanbul ignore next */
					return callback(e);
				}
				var filename = path.join(dojoPath, "dojo.js");
				fs.readFile(filename, 'utf-8', (err, content) => {
					if (err) return callback(err);
					compiler.applyPlugins("dojo-loader", content, filename);
					loaderScope = dojoLoaderUtils.createLoaderScope(loaderConfig, content, filename);
					return callback();
				});
			} else {
				callback();
			}
		});

		compiler.plugin(["run", "watch-run"], (compilation__, callback) => {
			// Load the Dojo loader and get the require function into loaderScope
			var loaderConfig = getBuildLoaderConfig(this.options, compiler);
			var dojoPath;
			try {
				dojoPath = getDojoPath(loaderConfig);
			} catch (e) {
				/* istanbul ignore next */
				return callback(e);
			}
			getOrCreateEmbeddedLoader(dojoPath, loaderConfig, this.options, (err, content) => {
				// options.loader specifies path to the embedded loader (set by createEmbeddedLoader if created)
				if (!err) {
					compiler.applyPlugins("embedded-dojo-loader", content, this.options.loader);
				}
				callback(err);
			});
		});

		compiler.plugin("get dojo require", () => {
			return loaderScope.require;
		});

		compiler.plugin("embedded-dojo-loader", (content, filename) => {
			embeddedLoader = content;
			embeddedLoaderFilename = filename;
		});

		compiler.plugin("compilation", (compilation, params) => {

			compiler.plugin("make", (compilation__, callback) => {
				// Make sure the embedded loader was created using the same version of dojo specified in the config
				validateEmbeddedLoader(params, embeddedLoader, embeddedLoaderFilename, (err) => {
					callback(err);
				});
			});

			compilation.plugin("succeed-module", (module) => {
				if (!module.issuer) {
					// No issuer generally means an entry module, so add a Dojo loader dependency.  It doesn't
					// hurt to add extra dependencies because the Dojo loader module will be removed from chunks
					// that don't need it in the 'after-optimize-chunks' handler below.
					module.addDependency(new CommonJsRequireDependency(this.options.loader));
					if (util.isString(this.options.loaderConfig)) {
						module.addDependency(new CommonJsRequireDependency(this.options.loaderConfig));
					}
				}
			});

			compilation.plugin("after-optimize-chunks", (chunks) => {
				// Get the loader and loader config
				const loaderModule = compilation.modules.find((module) => { return module.rawRequest === this.options.loader;});
				const configModule = util.isString(this.options.loaderConfig) &&
										compilation.modules.find((module) => { return module.rawRequest === this.options.loaderConfig;});

				// Ensure that the Dojo loader, and optionally the loader config, are included
				// only in the entry chunks that contain the webpack runtime.
				chunks.forEach((chunk) => {
					if (chunk.hasRuntime()) {
						if (!loaderModule) {
							throw Error("Can't locate " + this.options.loader + " in compilation");
						}
						if (util.isString(this.options.loaderConfig) && !configModule) {
							throw Error("Can't locate " + this.options.loaderConfig + " in compilation");
						}
						if (!containsModule(chunk, loaderModule)) {
							chunk.addModule(loaderModule);
							loaderModule.addChunk(chunk);
						}
						if (configModule && !containsModule(chunk, configModule)) {
							chunk.addModule(configModule);
							configModule.addChunk(chunk);
						}
					} else if (loaderModule) {
						if (containsModule(chunk, loaderModule)) {
							chunk.removeModule(loaderModule);
							loaderModule.removeChunk(chunk);
						}
						if (configModule && containsModule(chunk, configModule)) {
							chunk.removeModule(configModule);
							configModule.removeChunk(chunk);
						}
					}
				});
			});

			// Support for the __embedded_dojo_loader__ webpack variable.  This allows applications (and unit tests)
			// to require the embedded loader module with require(__embedded_dojo_loader__);
			params.normalModuleFactory.plugin("parser", (parser) => {
				parser.plugin("expression " + embeddedLoaderFilenameExpression , (expr) => {
					// change __embedded_dojo_loader__ expressions in the source to the filename value as a string.
					const fn = parser.applyPluginsBailResult("evaluate Identifier " + embeddedLoaderFilenameExpression, expr).string.replace(/\\/g, "\\\\");
					const dep = new ConstDependency("\"" + fn + "\"", expr.range);
					dep.loc = expr.loc;
					parser.state.current.addDependency(dep);
					return true;
				});

				parser.plugin("evaluate typeof " + embeddedLoaderFilenameExpression, (expr) => {
					// implement typeof operator for the expression
					var result = new BasicEvaluatedExpression().setString("string");
					if (expr) {
						result.setRange(expr.range);
					}
					return result;
				});

				parser.plugin("evaluate Identifier " + embeddedLoaderFilenameExpression, (expr) => {
					var result = new BasicEvaluatedExpression().setString(embeddedLoaderFilename);
					if (expr) {
						result.setRange(expr.range);
					}
					return result;
				});
			});
		});
	}
};
