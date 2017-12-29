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
const ModuleDependencyTemplateAsRequireId = require('webpack/lib/dependencies/ModuleDependencyTemplateAsRequireId');
const DojoAMDDependencyTemplateHelpers = require("./DojoAMDDependencyTemplateHelpers");

module.exports = class DojoAMDModuleDependencyTemplateAsRequireId extends ModuleDependencyTemplateAsRequireId {
	constructor(...args) {
		super(...args);
		this.templateHelpers = this.newDependencyTemplateHelpers();
	}

	apply(dep, source, outputOptions, ...rest) {
		if(!dep.range) return;
		if (dep.request === "require") {	// context require
			const content = this.templateHelpers.contentForContextRequire(dep, outputOptions.pathinfo);
			source.replace(dep.range[0], dep.range[1] - 1, content);
		} else if (dep.featureExpression) {
			const content = this.templateHelpers.contentForFeatureExpression(dep, outputOptions.pathinfo);
			source.replace(dep.range[0], dep.range[1] - 1, content);
		} else {
			super.apply(dep, source, outputOptions, ...rest);
		}
	}

	newDependencyTemplateHelpers() {
		return new DojoAMDDependencyTemplateHelpers();
	}
};
