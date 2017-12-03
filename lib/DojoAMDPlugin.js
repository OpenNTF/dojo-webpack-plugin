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
const path = require("path");
const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
const LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
const NormalModuleReplacementPlugin = require("webpack/lib/NormalModuleReplacementPlugin");

const NullFactory = require("webpack/lib/NullFactory");

const DojoAMDRequireDependenciesBlockParserPlugin = require("./DojoAMDRequireDependenciesBlockParserPlugin");
const DojoAMDDefineDependencyParserPlugin = require("./DojoAMDDefineDependencyParserPlugin");
const CJSRequireDependencyParserPlugin = require("./CJSRequireDependencyParserPlugin");
const DojoAMDMainTemplatePlugin = require("./DojoAMDMainTemplatePlugin");
const DojoAMDChunkTemplatePlugin = require("./DojoAMDChunkTemplatePlugin");
const DojoAMDResolverPlugin = require("./DojoAMDResolverPlugin");
const DojoAMDModuleFactoryPlugin = require("./DojoAMDModuleFactoryPlugin");
const DojoLoaderPlugin = require("./DojoLoaderPlugin");
const DojoAMDRequireArrayDependency =  require("./DojoAMDRequireArrayDependency");

module.exports = class DojoAMDPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {

		compiler.apply(
			new DojoLoaderPlugin(this.options),
			new DojoAMDMainTemplatePlugin(this.options),
			new DojoAMDChunkTemplatePlugin(this.options)
		);

		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(DojoAMDRequireItemDependency, params.normalModuleFactory);
			compilation.dependencyTemplates.set(DojoAMDRequireItemDependency, new DojoAMDRequireItemDependency.Template());

			compilation.dependencyFactories.set(DojoAMDDefineDependency, new NullFactory());
			compilation.dependencyTemplates.set(DojoAMDDefineDependency, new DojoAMDDefineDependency.Template());

			compilation.dependencyFactories.set(DojoAMDRequireArrayDependency, new NullFactory());
			compilation.dependencyTemplates.set(DojoAMDRequireArrayDependency, new DojoAMDRequireArrayDependency.Template());

			compilation.dependencyFactories.set(LocalModuleDependency, new NullFactory());
			compilation.dependencyTemplates.set(LocalModuleDependency, new LocalModuleDependency.Template());

			params.normalModuleFactory.plugin("parser", (parser) => {
				parser.plugin("expression module", () => {
					if (parser.state.module.isAMD) {
						return true;
					}
				});
				// Ensure that the embedded loader doesn't pull in node dependencies for process and global
				const embeddedLoaderFileName = parser.applyPluginsBailResult("evaluate Identifier __embedded_dojo_loader__").string;
				["process", "global"].forEach(name => {
					parser.plugin(`expression ${name}`, function() {
						if(this.state.module && this.state.module.request === embeddedLoaderFileName) {
							return false;
						}
					});
				});
			});
		});

		compiler.plugin("normal-module-factory", () => {
			compiler.apply(
				new NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!default$/, "dojo/selector/lite"),
				new NormalModuleReplacementPlugin(/^dojo\/request\/default!$/, "dojo/request/xhr"),
				new NormalModuleReplacementPlugin(/^dojo\/query!/, data => {
					var match = /^dojo\/query!(.*)$/.exec(data.request);
					data.request = "dojo/loaderProxy?loader=dojo/query&name=" + match[1] + "&absMid=dojo/query%21" + match[1] + "!";
				})
			);
		});

		compiler.apply(
			new DojoAMDModuleFactoryPlugin(this.options),
			new DojoAMDResolverPlugin()
		);

		compiler.plugin("compilation", (__, params) => {
			params.normalModuleFactory.plugin("parser", (parser) => {
				parser.apply(
					new DojoAMDRequireDependenciesBlockParserPlugin(this.options),
					new DojoAMDDefineDependencyParserPlugin(this.options),
					new CJSRequireDependencyParserPlugin()
				);
			});
		});

		// Copy options to webpack options
		compiler.options.DojoAMDPlugin = this.options;

		// Add resolveLoader config entry
		const resolveLoader = compiler.options.resolveLoader = compiler.options.resolveLoader || {};
		const alias = resolveLoader.alias = resolveLoader.alias || {};
		alias['dojo/text'] = path.resolve(__dirname, "..", "loaders", "dojo", "text");
		alias['dojo/i18n'] = path.resolve(__dirname, "..", "loaders", "dojo", "i18n");
		alias['dojo/i18nRootModifier'] = path.resolve(__dirname, "..", "loaders", "dojo", "i18nRootModifier");
		alias['dojo/loaderProxy'] = path.resolve(__dirname, "..", "loaders", "dojo", "loaderProxy");
	}
};
