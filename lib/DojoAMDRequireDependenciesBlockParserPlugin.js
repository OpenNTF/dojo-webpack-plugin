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
const plugin = require("./pluginHelper").plugin;
if (!Object.entries) require("object.entries").shim();
const LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
const LocalModulesHelpers = require("webpack/lib/dependencies/LocalModulesHelpers");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");

module.exports = class DojoAMDRequireDependenciesBlockParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const context = Object.create(this, {parser: {value: parser}});
		plugin(parser, Object.entries({
			"expression require"     : this.expressionRequire,
			"call require"           : this.callRequire,
			"call require:amd:array" : this.callRequireAmdArray,
			"call require:amd:item"  : this.callRequireAmdItem
		}), context);
	}

	expressionRequire() {
		return true;
	}

	callRequire(expr) {
		if (!this.parser.state.module.isAMD || expr.callee.name === "cjsRequire") {
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
				if (expr.arguments[0].type === "ArrayExpression" || this.parser.evaluateExpression(expr.arguments[0]).isConstArray()) {
					return;
				}
				return true; // let client handle
		}
	}

	callRequireAmdArray(expr, param) {
		if(param.isArray()) {
			param.items.forEach((param) => {	/* eslint no-shadow: [2, { "allow": ["param"] }] */
				this.parser.applyPluginsBailResult("call require:amd:item", expr, param);
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
				} else if(localModule = LocalModulesHelpers.getLocalModule(this.parser.state, request)) { // eslint-disable-line no-cond-assign
					dep = new LocalModuleDependency(localModule);
					dep.loc = expr.loc;
					this.parser.state.current.addDependency(dep);
				} else {
					var dojoRequire = this.parser.state.compilation.compiler.applyPluginsBailResult("get dojo require");
					const props = {options: this.options, require: dojoRequire};
					dep = this.newRequireItemDependency(request, this.parser.state.current, props);
					dep.loc = expr.loc;
					dep.optional = !!this.parser.scope.inTry;
					this.parser.state.current.addDependency(dep);
				}
				deps.push(dep);
			});
			const dep = this.newRequireArrayDependency(deps, param.range);
			dep.loc = expr.loc;
			dep.optional = !!this.parser.scope.inTry;
			this.parser.state.current.addDependency(dep);
			return true;
		}
	}

	callRequireAmdItem(expr, param) {
		if(param.isString()) {
			let dep, localModule;
			if (param.string === "module") {
				dep = new ConstDependency("__webpack_require__.dj.m(module)", param.range);
			} else if (param.string === "exports") {
				dep = new ConstDependency(param.string, param.range);
			} else if(localModule = LocalModulesHelpers.getLocalModule(this.parser.state, param.string)) { // eslint-disable-line no-cond-assign
				dep = new LocalModuleDependency(localModule, param.range);
			} else {
				var dojoRequire = this.parser.state.compilation.compiler.applyPluginsBailResult("get dojo require");
				const props = {options: this.options, require: dojoRequire};
				dep = this.newRequireItemDependency(param.string, this.parser.state.current, props, param.range);
			}
			dep.loc = expr.loc;
			dep.optional = !!this.parser.scope.inTry;
			this.parser.state.current.addDependency(dep);
			return true;
		}
	}

	// Factories
	newRequireItemDependency(request, module, props, range) {
		return new DojoAMDRequireItemDependency(request, module, props, range);
	}
	newRequireArrayDependency(deps, range) {
		return new DojoAMDRequireArrayDependency(deps, range);
	}
};
