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
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
const AMDDefineDependencyParserPlugin = require("webpack/lib/dependencies/AMDDefineDependencyParserPlugin");
const LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
const LocalModulesHelpers = require("webpack/lib/dependencies/LocalModulesHelpers");
const AMDDefineDependency = require("webpack/lib/dependencies/AMDDefineDependency");

module.exports = class DojoAMDDefineDependencyParserPlugin extends AMDDefineDependencyParserPlugin {
	constructor(options) {
		super({});
		this.options = options;
	}

	apply(parser) {
		this.subclassCallDefineHandler(parser);

		parser.plugin("call define:amd:array", this.callDefineAmdArray.bind(this, parser));

		parser.plugin("call define:amd:item", this.callDefineAmdItem.bind(this, parser));
	}

	subclassCallDefineHandler(parser) {
		// "Subclasses" the 'call define' handler in the base class implementation.  This is a bit
		// painful because the base class is not set up to support subclassing, but we manage by
		// replacing the parser plugin handler for the duration of the plugin call in the super
		// class and then grabbing the 'call define' callback so that we can use it for our own
		// 'call define' handler.
		const original_plugin = parser.plugin;
		const restore_original_plugin = parser.hasOwnProperty("plugin");
		parser.plugin = (expression, callback) => {
			if (expression === "call define") {
				// Augment base class implementation for "call define"
				original_plugin.call(parser, expression, this.callDefine.bind(this, callback, parser));
			}
		};
		super.apply(parser);
		delete parser.plugin;
		if (restore_original_plugin) {
			parser.plugin = original_plugin;
		}
	}

	callDefine(cb, parser, expr) {
		parser.state.current.isAMD = true;
		const result = cb.call(this, expr);	// invoke base class implementation
		/* istanbul ignore if  */
		if (!AMDDefineDependencyParserPlugin.prototype.newDefineDependency) {
			// This is pretty hacky.  Earlier versions of webpack don't provide the newDefineDependency method allowing us
			// to override the object creation, so instead, we reach into the module's dependencies to find the instance
			// of the AMDDefineDependency object and replace it our own.  There should only be one AMDDefineDependency of
			// any given module.
			// The newDefineDependency method was introduced in webpack with https://github.com/webpack/webpack/pull/5783
			const deps = parser.state.current.dependencies;
			for (let i = deps.length-1; i >= 0; i--) {
				const dep = deps[i];
				if (dep instanceof AMDDefineDependency) {
					const newDep = this.newDefineDependency(dep.range, dep.arrayRange, dep.functionRange, dep.objectRange, dep.namedModule);
					newDep.loc = dep.loc;
					newDep.localModule = dep.localModule;
					deps[i] = newDep;
					break;
				}
			}
		}
		return result;
	}

	callDefineAmdArray(parser, expr, param, identifiers, namedModule) {
		if(param.isArray()) {
			param.items.forEach((param, idx) => { // eslint-disable-line no-shadow
				if(param.isString() && ["require", "module", "exports"].indexOf(param.string) >= 0)
					identifiers[idx] = param.string;
				parser.applyPluginsBailResult("call define:amd:item", expr, param, namedModule);
			});
			return true;
		} else if(param.isConstArray()) {
			const deps = [];
			param.array.forEach((request, idx) => {
				let dep, localModule;
				if(request === "require") {
					identifiers[idx] = request;
					dep = request;
					dep = "__webpack_require__";
				} else if (request === "module") {
					identifiers[idx] = request;
					dep = "__webpack_require__.dj.m(module)";
				} else if(request === "exports") {
					identifiers[idx] = request;
					dep = request;
				} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, request)) { // eslint-disable-line no-cond-assign
					dep = new LocalModuleDependency(localModule);
					dep.loc = expr.loc;
					parser.state.current.addDependency(dep);
				} else {
					var dojoRequire = parser.state.compilation.compiler.applyPluginsBailResult("get dojo require");
					const props = {options: this.options, require:dojoRequire};
					dep = this.newRequireItemDependency(request, parser.state.current, props);
					dep.loc = expr.loc;
					dep.optional = !!parser.scope.inTry;
					parser.state.current.addDependency(dep);
				}
				deps.push(dep);
			});
			const dep = this.newRequireArrayDependency(deps, param.range);
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		}
	}

	callDefineAmdItem(parser, expr, param, namedModule) {
		if(param.isString()) {
			let dep, localModule;
			if (param.string === "module") {
				dep = new ConstDependency("__webpack_require__.dj.m(module)", param.range);
			} else if (param.string === "exports") {
				dep = new ConstDependency(param.string, param.range);
			} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, param.string, namedModule)) { // eslint-disable-line no-cond-assign
				dep = new LocalModuleDependency(localModule, param.range);
			} else {
				var dojoRequire = parser.state.compilation.compiler.applyPluginsBailResult("get dojo require");
				const props = {options: this.options, require:dojoRequire};
				dep = this.newRequireItemDependency(param.string, parser.state.current, props, param.range);
			}
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		}
	}

	// Factories

	// Overrides base class implementation.
	newDefineDependency(range, arrayRange, functionRange, objectRange, namedModule) {
		return new DojoAMDDefineDependency(range, arrayRange, functionRange, objectRange, namedModule);
	}
	newRequireArrayDependency(deps, range) {
		return new DojoAMDRequireArrayDependency(deps, range);
	}
	newRequireItemDependency(expr, module, props, range) {
		return new DojoAMDRequireItemDependency(expr, module, props, range);
	}
};
