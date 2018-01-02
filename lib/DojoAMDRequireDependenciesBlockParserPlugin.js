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
const mixin = require("es6-class-mixin");
const DojoAMDDependencyParserMixin = require("./DojoAMDDependencyParserMixin");
const {plugin} = require("./pluginHelper");

module.exports = class DojoAMDRequireDependenciesBlockParserPlugin extends
mixin(class{}, DojoAMDDependencyParserMixin) {
	constructor(options) {
		super();
		this.options = options;
		this.verb = "require";
	}

	apply(parser) {
		const context = Object.create(this, {parser: {value: parser}});
		plugin(parser, Object.entries({
			"expression require"     : this.expressionRequire,
			"call require"           : this.callRequire,
			"call require:amd:array" : this.addArrayDependency,
			"call require:amd:item"  : this.addItemDependency
		}), context);
	}

	expressionRequire() {
		return true;
	}

	callRequire(expr) {
		if (!this.parser.state.module.isAMD || expr.callee.name === "cjsRequire") {
			return;
		}
		switch(expr.arguments.length) {
			case 1:
				if (expr.arguments[0].type === "Literal") {
					const patterns = this.options.cjsRequirePatterns || [/(exports-loader|imports-loader)[?!]/];
					if (patterns.some((pattern) => {
						return pattern.test(expr.arguments[0].value);
					})) {
						return;
					}
				}
				// Fall thru
			case 2:
				if (expr.arguments[0].type === "ArrayExpression" || this.parser.evaluateExpression(expr.arguments[0]).isConstArray()) {
					return;
				}
				return true; // let client handle
		}
	}
};
