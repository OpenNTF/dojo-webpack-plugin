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
 const util = require('util');

function hasAMD(chunk) {
	return chunk.getModules().some((module) => {
		return module.isAMD;
	});
}

module.exports = class DojoLoaderEnsurePlugin {
	constructor(options) {
		this.options = options;
	}
	apply(compilation) {
		// Ensure that the Dojo loader, and optionally the loader config, are included
		// in each entry chunk that has any AMD modules.
		compilation.plugin("after-optimize-chunks", (chunks) => {
			debugger;
			if (!compilation.dojoLoaderDependenciesAdded) {
				return;	// Nothing to do for this compilation
			}
			// Get the loader and loader config
			const loaderModule = compilation.modules.find((module) => { return module.rawRequest === this.options.loader;});
			if (!loaderModule) {
				throw Error("Can't locate " + this.options.loader + " in compilation");
			}
			let configModule;
			if (util.isString(this.options.loaderConfig)) {
				configModule = compilation.modules.find((module) => { return module.rawRequest === this.options.loaderConfig;});
				if (!configModule) {
					throw Error("Can't locate " + this.options.loaderConfig + " in compilation");
				}
			}
			chunks.forEach((chunk) => {
				if (chunk.hasRuntime() && hasAMD(chunk)) {
					if (!chunk.containsModule(loaderModule)) {
						chunk.addModule(loaderModule);
						loaderModule.addChunk(chunk);
					}
					if (configModule && !chunk.containsModule(configModule)) {
						chunk.addModule(configModule);
						configModule.addChunk(chunk);
					}
				}
			});
		});
	}
};
