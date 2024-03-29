/*
 * (C) Copyright HCL Technologies Ltd. 2018
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
const {pluginName, getPluginProps} = require("./DojoAMDPlugin");

module.exports = class DojoAMDResolverPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		compiler.resolverFactory.hooks.resolver.for('normal').tap(pluginName, resolver => {
			const context = Object.create(this, {
				resolver: {value: resolver}
			});
			const hookName = this.options.ignoreNonModuleResources ? 'module' : 'resolve';
			resolver.hooks[hookName].tapAsync({name: pluginName, stage:-1}, this.resolve.bind(context));
		});
	}

	doResolve(obj, message, resolveContext, callback) {
		this.resolver.doResolve(this.resolver.hooks.rawFile, obj, message, resolveContext, callback);
	}

	resolve(request, resolveContext, callback) {
		if (request.directory || path.isAbsolute(request.request)) {
			return callback();
		}
		const dojoRequire = getPluginProps(this.compiler).dojoRequire;
		const url = dojoRequire.toUrl(
			(request.context?.originalRequest || request.request).split('!').pop(),
			{mid: path.join(request.originalPath || request.path, "x").replace('\\', '/')}
		);
		if (url && url != request.request) {
			const obj = {
					path: path.normalize(url),	// sets path separators to platform specific values
					query: request.query,
					directory: request.directory
			};
			const message = `Dojo resolve ${obj.path} from ${request.request} in ${request.path}`;
			this.doResolve(obj, message, resolveContext, (err, result) => {
				return result ? callback(null, result) : callback();
			});
		} else {
			callback();
		}
	}
};
