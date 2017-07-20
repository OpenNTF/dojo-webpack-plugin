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
 const CommonJsRequireDependency = require("webpack/lib/dependencies/CommonJsRequireDependency");

function containsModule(chunk, module) {
	if (chunk.containsModule) {
		return chunk.containsModule(module);
	} else {
		return chunk.modules.indexOf(module) !== -1;
	}
}

module.exports = class DojoLoaderEnsurePlugin {
	constructor(options) {
		this.options = options;
	}
	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
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
		});
	}
};
