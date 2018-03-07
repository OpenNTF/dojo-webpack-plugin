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

module.exports = {
	evaluateIdentifierName: "evaluate Identifier",
	evaluateTypeofName: "evaluate typeof",
	moduleFactoryParserHookName: "parser",
	Tapable: require("tapable"),
	reg: function () {
	},
	plugin: function(...args) {
		return module.exports.tap(...args);
	},
	tap: function(obj, events, context) {
		if (!Array.isArray(events)) {
			events = Object.entries(events);
		}
		events.forEach(event => {
			obj.plugin(event[0], event[1].bind(context));
		});
	},
	callSync(obj, name, ...args) {
		return obj.applyPlugins(name, ...args);
	},
	callSyncWaterfall(obj, name, ...args) {
		return obj.applyPluginsWaterfall(name, ...args);
	},
	callSyncBail(obj, name, ...args) {
		return obj.applyPluginsBailResult(name, ...args);
	}
 };