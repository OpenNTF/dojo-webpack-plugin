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
const Dependency = require("webpack/lib/Dependency");
const WebpackMissingModule = require("webpack/lib/dependencies/WebpackMissingModule");

class DojoAMDRequireArrayDependency extends Dependency {
	constructor(depsArray, range) {
		super();
		this.depsArray = depsArray;
		this.range = range;
	}
};

module.exports = DojoAMDRequireArrayDependency;

DojoAMDRequireArrayDependency.prototype.type = "amd require array";

DojoAMDRequireArrayDependency.Template = class DojoAMDRequireArrayDependencyTemplate {
	/*eslint no-shadow: [2, { "allow": ["dep"] }]*/
	apply(dep, source, outputOptions, requestShortener) {
		const content = "[" + dep.depsArray.map((dep) => {
			var comment = "";
			if(typeof dep === "string") {
				return dep;
			} else if (dep.request === "require") {
				if(outputOptions.pathinfo) comment = "/*! " + dep.issuerModule.absMid + " */ ";
				return "__webpack_require__.dj.c(" + comment + JSON.stringify(dep.issuerModule.id) + ")";
			} else if (dep.featureExpression) {
				let expr;
				if(outputOptions.pathinfo) comment = "/*! " + dep.originalRequest + " */ ";
				try {
					// replace the %%# positional arguments in the feature expression with the corresponding module ids from the
					// dependencies array.
					expr = dep.featureExpression.replace(/%%(\d+)/g, (match__, p) => {
						const module = dep.featureDeps[p].module;
						if (module) {
							return module.id;
						} else {
							throw new Error(dep.featureDeps[p].request);
						}
					});
				} catch (err) {
					return comment + WebpackMissingModule.module(err.message);
				}
				return "__webpack_require__.dj.h(" + comment + "\"" + expr + "\")";
			} else {
				if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
				if(dep.module) {
					return "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ")";
				} else if (dep.localModule) {
					return dep.localModule.variableName();
				}	else {
					return WebpackMissingModule.module(dep.request);
				}
			}
		}).join(", ") + "]";
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
};
