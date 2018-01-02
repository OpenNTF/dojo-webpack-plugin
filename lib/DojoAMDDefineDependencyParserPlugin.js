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
const {plugin} = require("./pluginHelper");
const DojoAMDDependencyParserMixin = require("./DojoAMDDependencyParserMixin");
const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
const AMDDefineDependencyParserPlugin = require("webpack/lib/dependencies/AMDDefineDependencyParserPlugin");
const AMDDefineDependency = require("webpack/lib/dependencies/AMDDefineDependency");

module.exports = class DojoAMDDefineDependencyParserPlugin extends
mixin(AMDDefineDependencyParserPlugin, DojoAMDDependencyParserMixin) {
	constructor(options) {
		super({});
		this.options = options;
		this.verb = "define";
	}

	apply(parser) {
		const context = Object.create(this, {parser: {value: parser}});
		context.subclassCallDefineHandler();
		plugin(parser, Object.entries({
			"call define:amd:array" : this.addArrayDependency,
			"call define:amd:item"  : this.addItemDependency
		}), context);
	}

	subclassCallDefineHandler() {
		// "Subclasses" the 'call define' handler in the base class implementation.  This is a bit
		// painful because the base class is not set up to support subclassing, but we manage by
		// replacing the parser plugin handler for the duration of the plugin call in the super
		// class and then grabbing the 'call define' callback so that we can use it for our own
		// 'call define' handler.
		const {parser} = this;
		const original_plugin = parser.plugin;
		const restore_original_plugin = parser.hasOwnProperty("plugin");
		parser.plugin = (expression, callback) => {
			if (expression === "call define") {
				// Augment base class implementation for "call define"
				original_plugin.call(parser, expression, this.callDefine.bind(this, callback));
			}
		};
		super.apply(parser);
		delete parser.plugin;
		if (restore_original_plugin) {
			parser.plugin = original_plugin;
		}
	}

	callDefine(cb, expr) {
		this.parser.state.current.isAMD = true;
		const result = cb.call(this.parser, expr);	// invoke base class implementation
		/* istanbul ignore if  */
		if (!AMDDefineDependencyParserPlugin.prototype.newDefineDependency) {
			// This is pretty hacky.  Earlier versions of webpack don't provide the newDefineDependency method allowing us
			// to override the object creation, so instead, we reach into the module's dependencies to find the instance
			// of the AMDDefineDependency object and replace it our own.  There should only be one AMDDefineDependency of
			// any given module.
			// The newDefineDependency method was introduced in webpack with https://github.com/webpack/webpack/pull/5783
			const deps = this.parser.state.current.dependencies;
			for (let i = deps.length-1; i >= 0; i--) {
				const dep = deps[i];
				if (dep instanceof AMDDefineDependency) {
					const newDep = this.newDefineDependency(dep.range, dep.arrayRange, dep.functionRange, dep.objectRange, dep.namedModule);
					newDep.loc = dep.loc;
					newDep.localModule = dep.localModule;
					deps[i] = newDep;
					break;
				}
			}
		}
		return result;
	}

	// Factories

	// Overrides base class implementation.
	newDefineDependency(range, arrayRange, functionRange, objectRange, namedModule) {
		return new DojoAMDDefineDependency(range, arrayRange, functionRange, objectRange, namedModule);
	}
};
