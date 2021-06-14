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
const ConcatSource = require("webpack-sources").ConcatSource;
const {javascript:{JavascriptModulesPlugin}} = require("webpack");

const pluginName = 'scoped-require-plugin';

module.exports = class ScopedRequirePlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, compilation => {
			const pluginProps = compiler['dojo-webpack-plugin'];
			pluginProps.hooks.dojoGlobalRequire.tap('scoped-require-plugin', () => {'';});
			JavascriptModulesPlugin.getCompilationHooks(compilation)
							.renderModuleContent.tap(pluginName, (source, module) => {
				var result = source;
				if (module.isAMD) {
					// Define a module scoped 'require' variable for AMD modules that references the
					// the Dojo require function.
					result = new ConcatSource();
					result.add(`var require = __webpack_require__.${pluginProps.options.requireFnPropName}.r;`);
					result.add(source);
				}
				return result;
			});
		});
	}
};
