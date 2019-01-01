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
 * Copied from webpack/lib/dependencies/AMDRequireDependency.js with
 * non-functional modifications to improve code reuse and extendibility.
 */
"use strict";
const NullDependency = require("webpack/lib/dependencies/NullDependency");

class AMDRequireDependency extends NullDependency {
	constructor(block) {
		super();
		this.block = block;
	}
}

AMDRequireDependency.Template = class AMDRequireDependencyTemplate {
	get definitions() {
		return {
			a: "var __WEBPACK_AMD_REQUIRE_ARRAY__ = ",
			af: "; (",
			f: ").apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);",
			ea: "var __WEBPACK_AMD_REQUIRE_ARRAY__ = ",
			eaf: "; (",
			ef: ").apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);"
		};
	}

	apply(dep, source, runtime) {
		const depBlock = dep.block;
		const promise = runtime.blockPromise({
			block: depBlock,
			message: "AMD require"
		});

		// has array range but no function range
		if (depBlock.arrayRange && !depBlock.functionRange) {
			const startBlock = `${promise}.then(function() {`;
			const endBlock = `;}).catch(${runtime.onError()})`;
			source.replace(
				depBlock.outerRange[0],
				depBlock.arrayRange[0] - 1,
				startBlock
			);
			source.replace(
				depBlock.arrayRange[1],
				depBlock.outerRange[1] - 1,
				endBlock
			);
			return;
		}

		// has function range but no array range
		if (depBlock.functionRange && !depBlock.arrayRange) {
			const startBlock = `${promise}.then((`;
			const endBlock = `).bind(exports, __webpack_require__, exports, module)).catch(${runtime.onError()})`;
			source.replace(
				depBlock.outerRange[0],
				depBlock.functionRange[0] - 1,
				startBlock
			);
			source.replace(
				depBlock.functionRange[1],
				depBlock.outerRange[1] - 1,
				endBlock
			);
			return;
		}

		// has array range, function range, and errorCallbackRange
		if (
			depBlock.arrayRange &&
			depBlock.functionRange &&
			depBlock.errorCallbackRange
		) {
			const startBlock = `${promise}.then(function() { `;
			const errorRangeBlock = `}${
				depBlock.functionBindThis ? ".bind(this)" : ""
			}).catch(`;
			const endBlock = `${
				depBlock.errorCallbackBindThis ? ".bind(this)" : ""
			})`;

			source.replace(
				depBlock.outerRange[0],
				depBlock.arrayRange[0] - 1,
				startBlock
			);
			source.insert(depBlock.arrayRange[0] + 0.9, this.definitions.ea);
			source.replace(
				depBlock.arrayRange[1],
				depBlock.functionRange[0] - 1,
				this.definitions.eaf
			);
			source.insert(depBlock.functionRange[1], this.definitions.ef);
			source.replace(
				depBlock.functionRange[1],
				depBlock.errorCallbackRange[0] - 1,
				errorRangeBlock
			);
			source.replace(
				depBlock.errorCallbackRange[1],
				depBlock.outerRange[1] - 1,
				endBlock
			);
			return;
		}

		// has array range, function range, but no errorCallbackRange
		if (depBlock.arrayRange && depBlock.functionRange) {
			const startBlock = `${promise}.then(function() { `;
			const endBlock = `}${
				depBlock.functionBindThis ? ".bind(this)" : ""
			}).catch(${runtime.onError()})`;
			source.replace(
				depBlock.outerRange[0],
				depBlock.arrayRange[0] - 1,
				startBlock
			);
			source.insert(depBlock.arrayRange[0] + 0.9, this.definitions.a);
			source.replace(
				depBlock.arrayRange[1],
				depBlock.functionRange[0] - 1,
				this.definitions.af
			);
			source.insert(depBlock.functionRange[1], this.definitions.f);
			source.replace(
				depBlock.functionRange[1],
				depBlock.outerRange[1] - 1,
				endBlock
			);
		}
	}
};

module.exports = AMDRequireDependency;
