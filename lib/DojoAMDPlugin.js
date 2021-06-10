/*
 * (C) Copyright HCL Technologies Ltd. 2018, 2019
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
const NormalModuleReplacementPlugin = require("webpack/lib/NormalModuleReplacementPlugin");
const NullFactory = require("webpack/lib/NullFactory");
const { SyncBailHook, SyncWaterfallHook } = require("tapable");

const ScopedRequirePlugin = require("./ScopedRequirePlugin");
const [major, minor, patch] = require('webpack/package.json').version.split('.').map(v => parseInt(v));

module.exports = class DojoAMDPlugin {
	constructor(options) {
		options.requireFnPropName = options.requireFnPropName || "dj";
		this.options = options;
		this.options.getGlobalContext = this.getGlobalContext.bind(this);
		this.options.isSkipCompilation = this.isSkipCompilation.bind(this);
		this.options.ignoredCompilationNames = this.options.ignoredCompilationNames || [];
		this.options.ignoredCompilationNames.push("HtmlWebpackCompiler");
		this.options.ignoredCompilationNames.push(/^mini-css-extract-plugin\s/);
	}

	static pluginName = 'dojo-webpack-plugin';

	static getPluginProps(compiler) {
		return compiler[DojoAMDPlugin.pluginName];
	}

	apply(compiler) {
		this.compiler = compiler;
		const pluginName = DojoAMDPlugin.pluginName;
		if (!compiler[pluginName]) {
			compiler[pluginName] = {hooks: {}, options: this.options};
		}
		const pluginProps = compiler[pluginName]
		compiler.hooks.compilation.tap(pluginName, this.compilationPlugins.bind(this));
		pluginProps.hooks.dojoGlobalRequire = new SyncWaterfallHook(['source']);
		pluginProps.hooks.dojoGlobalRequire.tap(pluginName, source => source);
		const resolver = this.newResolverPlugin(this.options);
		resolver.apply(compiler);
		this.newDojoLoaderPlugin(this.options).apply(compiler);
		this.newDojoLoaderValidatorPlugin(this.options).apply(compiler);
		this.newChunkTemplatePlugin(this.options).apply(compiler);
		this.newModuleFactoryPlugin(this.options).apply(compiler);

		this.normalModuleReplacements();

		this.setAliases(compiler);
	}

	compilationPlugins(compilation, params) {
		if (!this.options.isSkipCompilation(compilation)) {
			compilation.hooks.additionalTreeRuntimeRequirements
				.tap("dojo-webpack-plugin", (chunk, set) => {
					compilation.addRuntimeModule(chunk, this.newRuntimeModule(chunk, set, this.options, this.compiler));
					set.add("__webpack_require__.dj");
					return true;
				});
			const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
			const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
			const DojoAMDRequireDependency = require("./DojoAMDRequireDependency");
			const DojoAMDRequireArrayDependency = require("./DojoAMDRequireArrayDependency");

			compilation.dependencyFactories.set(DojoAMDRequireItemDependency, params.normalModuleFactory);
			compilation.dependencyTemplates.set(DojoAMDRequireItemDependency, this.newRequireItemDependencyTemplate(this.options, compilation));

			compilation.dependencyFactories.set(DojoAMDDefineDependency, new NullFactory());
			compilation.dependencyTemplates.set(DojoAMDDefineDependency, this.newDefineDependencyTemplate(this.options));

			if (DojoAMDRequireDependency) {
				compilation.dependencyFactories.set(DojoAMDRequireDependency, new NullFactory());
				compilation.dependencyTemplates.set(DojoAMDRequireDependency, this.newRequireDependencyTemplate(this.options));
			}

			compilation.dependencyFactories.set(DojoAMDRequireArrayDependency, new NullFactory());
			compilation.dependencyTemplates.set(DojoAMDRequireArrayDependency, this.newRequireArrayDependencyTemplate(this.options, compilation));

			params.normalModuleFactory.hooks.parser.for('javascript/auto').tap('dojo-webpack-plugin', this.parserPlugins.bind(this));
		}
	}

	parserPlugins(parser) {
		this.newRequireDependenciesBlockParserPlugin(this.options).apply(parser);
		this.newDefineDependencyParserPlugin(this.options).apply(parser);
		this.newDojoAMDMiscParserPlugin(this.options).apply(parser);
		parser.hooks.expression.for('process').tap('dojo-webpack-plugin', this.expressionNode.bind(this, parser));
		parser.hooks.expression.for('global').tap('dojo-webpack-plugin', this.expressionNode.bind(this, parser));
	}

	normalModuleReplacements() {
		new NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!default$/, "dojo/selector/lite").apply(this.compiler);
		new NormalModuleReplacementPlugin(/^dojo\/request\/default!/, "dojo/request/xhr").apply(this.compiler);
		new NormalModuleReplacementPlugin(/^dojo\/query!/, data => {
			var match = /^dojo\/query!(.*)$/.exec(data.request);
			data.request = `dojo/loaderProxy?loader=dojo/query&name=${match[1]}&absMid=dojo/query%21${match[1]}!`;
		}).apply(this.compiler);
	}

	setAliases(compiler) {
		// Add resolveLoader config entry
		const resolveLoader = compiler.options.resolveLoader = compiler.options.resolveLoader || {};
		const alias = resolveLoader.alias = resolveLoader.alias || {};
		alias['dojo/text'] = path.resolve(__dirname, "..", "loaders", "dojo", "text");
		alias['dojo/i18n'] = path.resolve(__dirname, "..", "loaders", "dojo", "i18n");
		alias['dojo/i18nRootModifier'] = path.resolve(__dirname, "..", "loaders", "dojo", "i18nRootModifier");
		alias['dojo/loaderProxy'] = path.resolve(__dirname, "..", "loaders", "dojo", "loaderProxy");
	}

	getGlobalContext(compiler) {
		var context = '.';
		if (typeof this.options.globalContext === 'string') {
			context = this.options.globalContext;
		} else if (typeof this.options.globalContext === 'object') {
			context = this.options.globalContext.context || '.';
		}
		return path.resolve(compiler.context, context);
	}

	isSkipCompilation(compilation) {
		return this.options.ignoredCompilationNames.some(name => {
			if (name instanceof RegExp) {
				return name.test(compilation.name);
			} else {
				return name == compilation.name;
			}
		});
	}

	expressionNode(parser) {
		// Don't pull in node modules for node type references (e.g. process, global) in dojo modules.
		if(parser.state.module && parser.state.module.request && /[/\\](dojo|dijit|dojox)[/\\]/.test(parser.state.module.request)) {
			return false;
		}
	}
	// Factories
	newDojoLoaderPlugin(options) {
		const DojoLoaderPlugin = require("./DojoLoaderPlugin");
		return new DojoLoaderPlugin(options);
	}
	newDojoLoaderValidatorPlugin(options) {
		const DojoLoaderValidatorPlugin = require("./DojoLoaderValidatorPlugin");
		return new DojoLoaderValidatorPlugin(options);
	}
	newRuntimeModule(chunk, set, options, compiler) {
		const DojoAMDRuntimeModule = require("./DojoAMDRuntimeModule");
		return new DojoAMDRuntimeModule(chunk, set, options, compiler);
	}
	newChunkTemplatePlugin(options) {
		const DojoAMDChunkTemplatePlugin = require("./DojoAMDChunkTemplatePlugin");
		return new DojoAMDChunkTemplatePlugin(options);
	}
	newRequireItemDependencyTemplate(options, compilation) {
		const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
		return new DojoAMDRequireItemDependency.Template(options, compilation);
	}
	newDefineDependencyTemplate(options) {
		const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
		return new DojoAMDDefineDependency.Template(options);
	}
	newRequireDependencyTemplate(options) {
		const DojoAMDRequireDependency = require("./DojoAMDRequireDependency");
		return new DojoAMDRequireDependency.Template(options);
	}
	newRequireArrayDependencyTemplate(options, compilation) {
		const DojoAMDRequireArrayDependency =  require("./DojoAMDRequireArrayDependency");
		return new DojoAMDRequireArrayDependency.Template(options, compilation);
	}
	newModuleFactoryPlugin(options) {
		const DojoAMDModuleFactoryPlugin = require("./DojoAMDModuleFactoryPlugin");
		return new DojoAMDModuleFactoryPlugin(options);
	}
	newResolverPlugin(options, compiler) {
		const DojoAMDResolverPlugin = require("./DojoAMDResolverPlugin");
		return new DojoAMDResolverPlugin(options, compiler);
	}
	newRequireDependenciesBlockParserPlugin(options, parser) {
		const DojoAMDRequireDependenciesBlockParserPlugin = require("./DojoAMDRequireDependenciesBlockParserPlugin");
		return new DojoAMDRequireDependenciesBlockParserPlugin(options, parser);
	}
	newDefineDependencyParserPlugin(options, parser) {
		const DojoAMDDefineDependencyParserPlugin = require("./DojoAMDDefineDependencyParserPlugin");
		return new DojoAMDDefineDependencyParserPlugin(options, parser);
	}
	newDojoAMDMiscParserPlugin(options, parser) {
		const DojoAMDMiscParserPlugin = require("./DojoAMDMiscParserPlugin");
		return new DojoAMDMiscParserPlugin(options, parser);
	}
};
module.exports.ScopedRequirePlugin = ScopedRequirePlugin;
module.exports.buildLoader = require('../buildDojo/buildapi');
