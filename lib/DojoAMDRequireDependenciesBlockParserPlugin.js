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
const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
const DojoAMDRequireArrayDependency = require("./DojoAMDRequireArrayDependency");
const LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
const LocalModulesHelpers = require("webpack/lib/dependencies/LocalModulesHelpers");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");

module.exports = class DojoAMDRequireDependenciesBlockParserPlugin {
	constructor(options, dojoRequire) {
		this.options = options;
		this.dojoRequire = dojoRequire;
	}

	apply(parser) {
		parser.plugin("expression require", () => {
			return true;
		});

		parser.plugin("call require", (expr) => {
			if (!parser.state.module.isAMD || expr.callee.name === "cjsRequire") {
				return;
			}
			switch(expr.arguments.length) {
				case 1:
					if (expr.arguments[0].type === "Literal") {
						const patterns = this.options.cjsRequirePatterns || [/(exports-loader|imports-loader)[?!]/];
						if (patterns.some((pattern) => {
							return pattern.test(expr.arguments[0].value);
						})) {
							return;
						}
					}
					// Fall thru
				case 2:
					if (expr.arguments[0].type === "ArrayExpression" || parser.evaluateExpression(expr.arguments[0]).isConstArray()) {
						return;
					}
					return true; // let client handle
			}
		});
		parser.plugin("call require:amd:array", (expr, param) => {
			if(param.isArray()) {
				param.items.forEach((param) => {	/* eslint no-shadow: [2, { "allow": ["param"] }] */
					parser.applyPluginsBailResult("call require:amd:item", expr, param);
				});
				return true;
			} else if (param.isConstArray()) {
				const deps = [];
				param.array.forEach((request) => {
					var dep, localModule;
					if (request === "module") {
						dep = "__webpack_require__.dj.m(module)";
					} else if(request === "exports") {
						dep = request;
					} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, request)) { // eslint-disable-line no-cond-assign
						dep = new LocalModuleDependency(localModule);
						dep.loc = expr.loc;
						parser.state.current.addDependency(dep);
					} else {
						const props = {options: this.options, require: this.dojoRequire};
						dep = new DojoAMDRequireItemDependency(request, parser.state.current, props);
						dep.loc = expr.loc;
						dep.optional = !!parser.scope.inTry;
						parser.state.current.addDependency(dep);
					}
					deps.push(dep);
				});
				const dep = new DojoAMDRequireArrayDependency(deps, param.range);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		});

		parser.plugin("call require:amd:item", (expr, param) => {
			if(param.isString()) {
				let dep, localModule;
				if (param.string === "module") {
					dep = new ConstDependency("__webpack_require__.dj.m(module)", param.range);
				} else if (param.string === "exports") {
					dep = new ConstDependency(param.string, param.range);
				} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, param.string)) { // eslint-disable-line no-cond-assign
					dep = new LocalModuleDependency(localModule, param.range);
				} else {
					const props = {options: this.options, require: this.dojoRequire};
					dep = new DojoAMDRequireItemDependency(param.string, parser.state.current, props, param.range);
				}
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
			}
			return true;
		});
	}
};
