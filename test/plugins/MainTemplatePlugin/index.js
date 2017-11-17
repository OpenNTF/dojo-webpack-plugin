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

module.exports = class PatchRequireScopePlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation) {
			compilation.mainTemplate.plugin("require", function(source) {
				// When running unit tests in node, the scoped require function is node's CommonJs
				// require.  This code, together with the 'render' plugin below, defines a scoped
				// Dojo require variable for each AMD module so that referencing 'require' from
				// within the module will yield the Dojo function.
				return source.replace(/__webpack_require__\);/g, "__webpack_require__, req);");
			});

			// For unit testing only
			compilation.moduleTemplate.plugin("render", function(source, module) {
				var result = source;
				if (module.isAMD) {
					// Define a module scoped 'require' variable for AMD modules that yields the
					// the Dojo require function.
					result = new ConcatSource();
					result.add("var require = arguments[3];");
					result.add(source);
				}
				return result;
			});

			compilation.mainTemplate.plugin("bootstrap", function(source, chunk) {
				const buf = [];
				if(chunk.chunks.length > 0) {
					var jsonpFn = JSON.stringify(this.outputOptions.jsonpFunction);
					buf.push(`this[${jsonpFn}] = this[${jsonpFn}] || {}`);
				}
				buf.push(source);
				return this.asString(buf);
			});
		});
	}
};
