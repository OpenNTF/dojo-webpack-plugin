/*
 * (C) Copyright HCL Technologies Ltd. 2018
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
/*
 * Copied from webpack/lib/dependencies/AMDRequireDependenciesBlock.js with
 * non-functional modifications to improve code reuse and extendibility.
 */
"use strict";
const AsyncDependenciesBlock = require("webpack/lib/AsyncDependenciesBlock");
const AMDRequireDependency = require("./AMDRequireDependency");

module.exports = class DojoAMDRequireDependenciesBlock extends AsyncDependenciesBlock {
	constructor(
		expr,
		arrayRange,
		functionRange,
		errorCallbackRange,
		module,
		loc,
		request
	) {
		super(null, module, loc, request);
		this.expr = expr;
		this.outerRange = expr.range;
		this.arrayRange = arrayRange;
		this.functionBindThis = false;
		this.functionRange = functionRange;
		this.errorCallbackBindThis = false;
		this.errorCallbackRange = errorCallbackRange;
		this.bindThis = true;
		if (arrayRange && functionRange && errorCallbackRange) {
			this.range = [arrayRange[0], errorCallbackRange[1]];
		} else if (arrayRange && functionRange) {
			this.range = [arrayRange[0], functionRange[1]];
		} else if (arrayRange) {
			this.range = arrayRange;
		} else if (functionRange) {
			this.range = functionRange;
		} else {
			this.range = expr.range;
		}
		const dep = this.newRequireDependency();
		dep.loc = loc;
		this.addDependency(dep);
	}

	newRequireDependency() {
		return new AMDRequireDependency(this);
	}
};

