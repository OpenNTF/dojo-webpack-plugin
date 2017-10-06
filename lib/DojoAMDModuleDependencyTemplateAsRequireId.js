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
const WebpackMissingModule = require("webpack/lib/dependencies/WebpackMissingModule");

module.exports = class DojoAMDModuleDependencyTemplateAsRequireId extends ModuleDependencyTemplateAsRequireId {
	apply(dep, source, outputOptions) {
		if(!dep.range) return;
		var expr, content, comment = "";
		if (dep.request === "require") {	// context require
			if(outputOptions.pathinfo) comment = "/*! " + dep.issuerModule.absMid + " */ ";
			content = "__webpack_require__.dj.c(" + comment + JSON.stringify(dep.issuerModule.id) + ")";
			source.replace(dep.range[0], dep.range[1] - 1, content);
			return;
		}
		if (!dep.featureExpression) {
			return ModuleDependencyTemplateAsRequireId.prototype.apply.apply(this, arguments);
		}
		if(outputOptions.pathinfo) comment = "/*! " + dep.originalRequest + " */ ";
		try {
			// replace the %%# positional arguments in the feature expression with the corresponding module ids from the
			// dependencies array.
			expr = dep.featureExpression.replace(/%%(\d+)/g, function(match__, p) {
				const module = dep.featureDeps[p].module;
				if (module) {
					return module.id;
				} else {
					throw new Error(dep.featureDeps[p].request);
				}
			});
		} catch (err) {
			content = comment + WebpackMissingModule.module(err.message);
		}
		if (expr && !content) {
			content = "__webpack_require__.dj.h(" + comment + "\"" + expr + "\")";
		}
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
};
