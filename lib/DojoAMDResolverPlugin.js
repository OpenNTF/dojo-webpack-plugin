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

module.exports = class DojoAMDResolverPlugin {
	apply(compiler) {
		this.compiler = compiler;
		compiler.plugin("normal-module-factory", () => {
			compiler.resolvers.normal.plugin('module', this.module.bind(this));
		});
	}
	module(request, callback) {
		if (request.directory) {
			return callback();
		}
		const dojoRequire = this.compiler.applyPluginsBailResult("get dojo require");
		const url = dojoRequire.toUrl(request.request, {mid: path.join(request.path, "x").replace('\\', '/')});
		if (url && url != request.request) {
			const obj = {
					path: path.normalize(url),	// sets path separators to platform specific values
					query: request.query,
					directory: request.directory
			};
			const message = `Dojo resolve ${obj.path} from ${request.request} in ${request.path}`;
			this.compiler.resolvers.normal.doResolve(['raw-file'], obj, message, (err, result) => {
				callback(null, result);
			});
		} else {
			callback();
		}
	}
};
