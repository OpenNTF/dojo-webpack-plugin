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
const vm = require("vm");
const path = require("path");
const util = require("util");
const defaultFeatures = require("../buildDojo/loaderDefaultFeatures");

module.exports = {

	createLoaderScope: function(loaderConfig, loaderProps) {
		const loaderScope = {};
		loaderScope.global = loaderScope.window = loaderScope;
		loaderScope.dojoConfig = Object.assign({}, loaderConfig);
		loaderScope.dojoConfig.has = Object.assign({}, defaultFeatures, loaderScope.dojoConfig.has, {"dojo-config-api":1, "dojo-publish-privates":1});
		var context = vm.createContext(loaderScope);
		vm.runInContext('(function(global, window) {' + loaderProps.content + '});', context, loaderProps.filename).call(context, context);
		return loaderScope;
	},

	createEmbeddedLoader: function(dojoPath, loaderConfig, options, callback) {
		var dojoLoader;
		if (options.loader) {
			try {
				dojoLoader = require(options.loader);
			} catch (error) {
				callback(error);
			}
			callback(null, dojoLoader);
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
					if (loaderConfig.has && 'dojo-config-api' in loaderConfig.has && !loaderConfig.has['dojo-config-api']) {
						featureOverrides['dojo-config-api'] = 0;
						featureOverrides['dojo-publish-privates'] = 1;
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
							if (!options.noConsole) {
								console.error(stderr.toString());
							}
							callback(error);
						} else {
							if (!options.noConsole) {
								console.log(stdout.toString());
							}
							options.loader = path.join(tempDir, "dojo/dojo.js");
							dojoLoader = require(path.join(options.loader));
							callback(null, dojoLoader);
						}
					}
				);
			});
		}
	},

	validateEmbeddedLoader: function(params, embeddedLoader, loaderScope, callback) {
		// Vefiry that embedded loader version and dojo version are the same
		params.normalModuleFactory.create({
			dependencies: [{request: "dojo/package.json"}]
		}, (err, module) => {
			if (!err) {
				 const dojoVersion = require(module.request).version;
				 const scope = {};
				 embeddedLoader.call(scope, {packages:[{name:"dojo", location:"./dojo"}]}, {hasCache:{}, modules:{}}, scope, scope);
				 if (dojoVersion !== scope.loaderVersion) {
					 err = new Error(
`Dojo loader version does not match the version of Dojo.
Loader version = ${loaderScope.loaderVersion}.
Dojo version = ${dojoVersion}.
You may need to rebuild the Dojo loader.
Refer to https://github.com/OpenNTF/dojo-webpack-plugin/blob/master/README.md#building-the-dojo-loader`);
				 }
				 return callback(err, scope);
			}
			callback();
		});
	}
};