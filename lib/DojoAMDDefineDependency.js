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
const AMDDefineDependency = require("webpack/lib/dependencies/AMDDefineDependency");

class DojoAMDDefineDependency extends AMDDefineDependency {}

DojoAMDDefineDependency.prototype.type = "amd define";

DojoAMDDefineDependency.Template = class DojoAMDDefineDependencyTemplate extends AMDDefineDependency.Template {
	/*
	 * Dojo calls module define functions using global scope, but webpack specifies the exports
	 * object as the scope.  The following code fixes up the applied template result to replace
	 * the exports scope with the global scope for invoking the define function.
	 */
	apply(...args) {
		super.apply(...args);
		this.fixupDefineScope(...args);
	}

	fixupDefineScope(dep, source) {
		if (dep.functionRange) {
			source.replacements.forEach((replacement) => {
				replacement[2] = replacement[2].replace(/\.(call|apply)\(exports,/, ".$1(null,");
			});
		}
	}
};

module.exports = DojoAMDDefineDependency;
