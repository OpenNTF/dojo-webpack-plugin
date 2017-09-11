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
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RequireHeaderDependency = require("webpack/lib/dependencies/RequireHeaderDependency");
const LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
const LocalModulesHelpers = require("webpack/lib/dependencies/LocalModulesHelpers");

module.exports = class CJSRequireDependencyParserPlugin {
	apply(parser) {
		parser.plugin("call cjsRequire", (expr) => {
			if(expr.arguments.length !== 1) return;
			let localModule;
			const param = parser.evaluateExpression(expr.arguments[0]);
			if(param.isString() && (localModule = LocalModulesHelpers.getLocalModule(parser.state, param.string))) {
				const dep = new LocalModuleDependency(localModule, expr.range);
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
				return true;
			} else {
				const result = parser.applyPluginsBailResult("call require:commonjs:item", expr, param);
				if(result === undefined) {
					parser.applyPluginsBailResult("call require:commonjs:context", expr, param);
				} else {
					const dep = new RequireHeaderDependency(expr.callee.range);
					dep.loc = expr.loc;
					parser.state.current.addDependency(dep);
				}
				return true;
			}
		});
	}
};
