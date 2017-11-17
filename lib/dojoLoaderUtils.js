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
const vm = require("vm");
const defaultFeatures = require("../buildDojo/loaderDefaultFeatures");

module.exports = {
	createLoaderScope: function(loaderConfig, loader, filename) {
		const loaderScope = {};
		loaderScope.global = loaderScope.window = loaderScope;
		loaderScope.dojoConfig = Object.assign({}, loaderConfig);
		loaderScope.dojoConfig.has = Object.assign({}, defaultFeatures, loaderScope.dojoConfig.has, {"dojo-config-api":1, "dojo-publish-privates":1});
		var context = vm.createContext(loaderScope);
		vm.runInContext('(function(global, window) {' + loader + '});', context, filename).call(context, context);
		return loaderScope;
	},
	createEmbeddedLoaderScope: function(userConfig, embeddedLoader, filename) {
		const loaderScope = {};
		const defaultConfig = {hasCache:{}, modules:{}};
		loaderScope.global = loaderScope.window = loaderScope;
		var context = vm.createContext(loaderScope);
		vm.runInContext("var module = {};" + embeddedLoader, context, filename).call(context, userConfig, defaultConfig, context, context);
		return loaderScope;
	}
};
