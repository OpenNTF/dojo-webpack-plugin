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
const AMDRequireDependency = require("webpack/lib/dependencies/AMDRequireDependency");

class DojoAMDRequireDependency extends AMDRequireDependency {}

DojoAMDRequireDependency.prototype.type = "amd require";

DojoAMDRequireDependency.Template = class DojoAMDRequireDependencyTemplate extends AMDRequireDependency.Template {

	constructor(options) {
		super();
		this.options = options;
	}

	/**
	 * Modiify definiton strings for require calls using dependency array with callback
	 * to invoke the callback asynchronously once all dependency promises are resolved
	 * when the plugin is running in async mode.
	 */
	get definitions() {
		const defs = super.definitions;
		if (this.options.async) {
			Object.assign(defs, {
				af: "; Promise.all(__WEBPACK_AMD_REQUIRE_ARRAY__).then(function(deps) {return (",
				f: ").apply(null, deps)}.bind(this));",
				eaf: "; Promise.all(__WEBPACK_AMD_REQUIRE_ARRAY__).then(function(deps) {return (",
				ef: ").apply(null, deps)}.bind(this));"
			});
		}
		return defs;
	}
};

module.exports = DojoAMDRequireDependency;
