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
const {pluginName} = require('./DojoAMDPlugin');

module.exports = class DojoAMDMiscParserPlugin {
	apply(parser) {
		const context = Object.create(this, {parser: {value: parser}});
		parser.hooks.call.for('cjsRequire').tap(pluginName, this.callRequire.bind(context));
		parser.hooks.expression.for('module').tap(pluginName, this.expressionModule.bind(context));
	}

	callRequire(expr) {
		return this.parser.hooks.call.for('require').call(expr);
	}

	expressionModule() {
		if (this.parser.state.module.isAMD) {
			/*
			 * For module expressions, webpack normally converts module.id to module.i,
			 * which references the webpack integer id for the current module.  For Dojo
			 * modules, we want to leave module.id alone because we set the id property
			 * to the absMid string name of the module.  Returning true tells webpack
			 * that we handled the expression.
			 */
			return true;
		}
	}
};
