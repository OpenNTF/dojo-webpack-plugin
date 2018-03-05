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
const {tap, callSyncBail} = require("./pluginHelper");

module.exports = class DojoAMDResolverPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		tap(compiler, {"compilation": () => {
			tap(compiler.resolverFactory, {"resolver normal" : resolver => {
				this.resolver = resolver;
				tap(resolver, {"module" : this.module}, this, {stage:-1});
			}});
		}});
	}

	module(request, resolveContext, callback) {
		if (request.directory || path.isAbsolute(request.request)) {
			return callback();
		}
		const dojoRequire = callSyncBail(this.compiler, "getDojoRequire");
		const url = dojoRequire.toUrl(request.request, {mid: path.join(request.path, "x").replace('\\', '/')});
		if (url && url != request.request) {
			const obj = {
					path: path.normalize(url),	// sets path separators to platform specific values
					query: request.query,
					directory: request.directory
			};
			const message = `Dojo resolve ${obj.path} from ${request.request} in ${request.path}`;
			this.resolver.doResolve(this.resolver.hooks.rawFile, obj, message, resolveContext, (err, result) => {
				return result ? callback(null, result) : callback();
			});
		} else {
			callback();
		}
	}
};
