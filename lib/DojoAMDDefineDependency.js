/*
 * (C) Copyright HCL Technologies Ltd. 2018, 2019
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
const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const AMDDefineDependency = require("webpack/lib/dependencies/AMDDefineDependency");

class DojoAMDDefineDependency extends AMDDefineDependency {}

DojoAMDDefineDependency.prototype.type = "amd define";

DojoAMDDefineDependency.Template = class DojoAMDDefineDependencyTemplate extends AMDDefineDependency.Template {

	constructor(options) {
		super();
		this.options = options;
	}

	getContent(branch, _default) {
		const djProp = `__webpack_require__.${this.options.requireFnPropName}`;
		const DEFINITIONS = {
			af: `!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, __WEBPACK_AMD_DEFINE_RESULT__ = ${djProp}.d(__WEBPACK_AMD_DEFINE_ARRAY__, (#), module, exports),
				module.exports = __WEBPACK_AMD_DEFINE_RESULT__)`,
			aof: `!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, __WEBPACK_AMD_DEFINE_FACTORY__ = (#),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(${djProp}.d(__WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_FACTORY__, module, exports)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				module.exports = __WEBPACK_AMD_DEFINE_RESULT__)`,
			laf: `!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, XXX = ${djProp}.d(__WEBPACK_AMD_DEFINE_ARRAY__, (#), function(m){return XXX=m}, XXXExports = {}))`,
			laof: `!(XXXarray = #, XXXfactory = (#),
				(typeof XXXfactory === 'function' ?
					((XXX = XXXfactory.apply(XXXexports = {}, XXXarray)), XXX === undefined && (XXX = XXXexports)) :
					(XXX = ${djProp}.d(XXXarray, XXXfactory, function(m){return XXX=m}, XXXexports))
					(XXX = XXXfactory)
				))`
		};
		return (branch in DEFINITIONS) ? DEFINITIONS[branch] : _default;
	};

	/*
	 * Dojo calls module define functions using global scope, but webpack specifies the exports
	 * object as the scope.  The following code fixes up the applied template result to replace
	 * the exports scope with the global scope for invoking the define function.
	 */
	apply(dep, source, context) {
		super.apply(dep, source, context);
		context.runtimeRequirements.add(RuntimeGlobals.require);
		context.runtimeRequirements.add(RuntimeGlobals.moduleId);
		context.runtimeRequirements.add(RuntimeGlobals.moduleLoaded);
		context.runtimeRequirements.add(RuntimeGlobals.moduleFactories);
		this.fixupDefineScope(dep, source);
	}

	replace(dep, source, definition, content) {
		if (this.options.async) {
			const branch = this.branch(dep);
			content = this.getContent(branch, content);
		}
		super.replace(dep, source, definition, content);
	}

	fixupDefineScope(dep, source) {
		if (dep.functionRange) {
			source._replacements.forEach((replacement) => {
				const index = Array.isArray(replacement) ? 2 : 'content';
				replacement[index] = replacement[index].replace(/\.(call|apply)\(exports,/, ".$1(null,");
			});
		}
	}
};

module.exports = DojoAMDDefineDependency;
