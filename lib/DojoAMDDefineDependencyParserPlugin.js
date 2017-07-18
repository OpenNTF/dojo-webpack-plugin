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
const util = require("util");
const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
const DojoAMDRequireArrayDependency = require("./DojoAMDRequireArrayDependency");
const CommonJsRequireDependency = require("webpack/lib/dependencies/CommonJsRequireDependency");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
const LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
const LocalModulesHelpers = require("webpack/lib/dependencies/LocalModulesHelpers");
const AMDDefineDependency = require("webpack/lib/dependencies/AMDDefineDependency");

module.exports = class DojoAMDDefineDependencyParserPlugin {
	constructor(options, dojoRequire) {
		this.options = options;
		this.dojoRequire = dojoRequire;
	}

  apply(parser) {
		parser.plugin("call define", (expr) => {
			if (expr.dojoSkipFlag) return;
			expr.dojoSkipFlag = true;

			if (!parser.state.compilation.dojoLoaderDependenciesAdded) {
				parser.state.current.addDependency(new CommonJsRequireDependency(this.options.loader));
				if (util.isString(this.options.loaderConfig)) {
					parser.state.current.addDependency(new CommonJsRequireDependency(this.options.loaderConfig));
				}
				parser.state.compilation.dojoLoaderDependenciesAdded = true;
			}
			parser.state.current.isAMD = true;
			const result = parser.applyPluginsBailResult("call define", expr);
			delete expr.dojoSkipFlag;

			if (result) {
				// This is pretty hacky.  We want to avoid duplicating the implementation of the 'call define' plugin handler in
				// AMDDefineDependencyParserPlugin, but it doesn't provide the ability to override the define dependency object
				// creation so instead, we reach into the module's dependencies to find the instance of the AMDDefineDependency
				// object and replace it our own.  There should only be one AMDDefineDependency of any given module.
				const deps = parser.state.current.dependencies;
				for (let i = deps.length-1; i >= 0; i--) {
					const dep = deps[i];
					if (dep instanceof AMDDefineDependency) {
						const newDep = new DojoAMDDefineDependency(dep.range, dep.arrayRange, dep.functionRange, dep.objectRange);
						newDep.loc = dep.loc;
						newDep.localModule = dep.localModule;
						deps[i] = newDep;
						break;
					}
				}
			}
			return result;
		});

		parser.plugin("call define:amd:array", (expr, param, identifiers) => {
			if(param.isConstArray()) {
				const deps = [];
				param.array.forEach((request, idx) => {
					let dep, localModule;
					if (request === "module") {
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
						dep = new DojoAMDRequireItemDependency(request, parser.state.module);
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

		parser.plugin("call define:amd:item", (expr, param, namedModule) => {
			if(param.isString()) {
				let dep, localModule;
				if (param.string === "module") {
					dep = new ConstDependency("__webpack_require__.dj.m(module)", param.range);
				} else if (param.string === "exports") {
					dep = new ConstDependency(param.string, param.range);
				} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, param.string, namedModule)) { // eslint-disable-line no-cond-assign
					dep = new LocalModuleDependency(localModule, param.range);
				} else {
					const props = {options: this.options, require:this.dojoRequire};
					dep = new DojoAMDRequireItemDependency(param.string, parser.state.module, props, param.range);
				}
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		});
	}
};
