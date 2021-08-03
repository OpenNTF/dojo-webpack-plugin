const util = require('util');
const {Template, RuntimeModule} = require("webpack");
const {getPluginProps, pluginName} = require("./DojoAMDPlugin");
const runtime = require("../runtime/DojoAMDMainTemplate.runtime");
const loaderMainModulePatch = require("../runtime/DojoLoaderNonLocalMainPatch.runtime");
const stringify = require("node-stringify");

class DojoAMDRuntimeModule extends RuntimeModule {
	constructor(chunk, set__, compiler) {
		super(pluginName);
		this.chunk = chunk;
		this.pluginProps = getPluginProps(compiler);
		this.options = this.pluginProps.options;
		compiler.hooks.afterCompile.tap(pluginName, () => {
		  if (this.getNumberOfErrors()) {
				throw this.getErrors()[0];
			}
		});
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const pluginProps = getPluginProps(this.compilation.compiler);
		const djProp = `__webpack_require__.${this.options.requireFnPropName}`;
		const [runtimeSource, asyncSource] = ['main', 'async'].map(type => Template.getFunctionContent(runtime[type])
		                           .replace(/__async__/g, (!!this.options.async).toString())
		                           .replace('__webpack_require__.dj', djProp));
		const chunkLoadingGlobal = JSON.stringify(this.compilation.outputOptions.chunkLoadingGlobal);
		const buf = [];

		buf.push(runtimeSource);
		if (this.options.async) {
			buf.push(asyncSource);
		}
		buf.push("var globalObj = this||window;");
		buf.push("registerAbsMids({");
		buf.push(pluginProps.hooks.renderAbsMids.call("", this.chunk));
		buf.push("});");
		buf.push("");
		buf.push(pluginProps.hooks.dojoGlobalRequire.call("globalObj.require = req;"));
		buf.push(Template.indent(
			`(self[${chunkLoadingGlobal}] = self[${chunkLoadingGlobal}] || []).registerAbsMids = registerAbsMids;`
		));
		buf.push("");
		buf.push("// expose the Dojo compatibility functions as a properties of __webpack_require__");
		buf.push(`if (${djProp} && ${djProp}.name !== '${pluginName}') throw new Error("${djProp} name collision.")`);
		buf.push(`${djProp} = {`);
		buf.push(Template.indent([
			`name: '${pluginName}',`,
			"r: req,",
			"c: createContextRequire,",
			"m: dojoModuleFromWebpackModule,",
			"h: resolveTernaryHasExpression,"
		]));
		if (this.options.async) {
			buf.push(Template.indent([
				"d: asyncDefineModule,",
				"w: wrapPromises,",
				"u: unwrapPromises"
			]));
		}
		buf.push("};");
		buf.push("var loaderScope = Object.create(globalObj, {");
		buf.push("   document:{value: globalObj.document},");
		buf.push("});");
		buf.push("Object.defineProperties(loaderScope, {");
		buf.push("   window:{value:loaderScope},");
		buf.push("   global:{value:loaderScope}");
		buf.push("});");
		// Remove evidence of any existing AMD loader or else the Dojo loader won't initialize properly.
		buf.push("loaderScope.define = loaderScope.require = undefined");

		const dojoLoaderModule = this.getDojoLoaderModule();
		buf.push(`globalObj.dojoConfig = globalObj.dojoConfig || {}`);
		var loaderScope;
		if (!pluginProps.embeddedLoaderHasConfigApi) {
			if (!util.isString(this.options.loaderConfig)) {
				let loaderConfig = this.options.loaderConfig;
				if (typeof loaderConfig === 'function') {
					loaderConfig = loaderConfig(this.options.environment || {});
				}
				loaderScope = pluginProps.hooks.createDojoLoaderScope.call(Object.assign({}, loaderConfig), pluginProps.dojoLoader, pluginProps.dojoLoaderFilename);
			} else {
				const error = new Error(`The embedded Dojo loader needs the config API in order to support loading the Dojo loader config as a module, \
but the loader specified at ${pluginProps.embeddedLoaderFilename} was built without the config API.  Please rebuild the embedded loader with 'dojo-config-api' feature enabled`);
				this.addError(error);
				throw error;
			}
		}
		buf.push(this.renderDojoConfigVars(loaderScope));
		buf.push("var dojoLoader = __webpack_require__(" + JSON.stringify(this.compilation.chunkGraph.getModuleId(dojoLoaderModule)) + ");");
		buf.push("dojoLoader.call(loaderScope, userConfig, defaultConfig, loaderScope, loaderScope);");
		if (loaderScope) {
			// loaderProps.baseUrl is set by the loader config renderer if the loader has no config api.
			buf.push("loaderScope.require.baseUrl = " + JSON.stringify(loaderScope.require.baseUrl) + ";");
		}
		buf.push(Template.getFunctionContent(loaderMainModulePatch));
		buf.push("['baseUrl','has','rawConfig','on','signal'].forEach(function(name) {req[name] = loaderScope.require[name]})");
		const loaderConfig = pluginProps.hooks.getDojoConfig.call();
		if (loaderConfig.has && loaderConfig.has['dojo-undef-api']) {
			buf.push("req.undef = " +  Template.getFunctionContent(runtime.undef));
		}
		buf.push(`var absMidsWaiting = globalObj[${chunkLoadingGlobal}].absMidsWaiting;`);
		buf.push("if (absMidsWaiting) {");
		buf.push("   absMidsWaiting.forEach(registerAbsMids);");
		buf.push(`   delete globalObj[${chunkLoadingGlobal}].absMidsWaiting;`);
		buf.push("}");
		return Template.asString([
			`(function() { /* Start ${pluginName} extensions */`,
			Template.indent(buf),
			`})(); /* End ${pluginName} extensions */`
		]);
	}

	getDojoLoaderModule() {
		const result = Array.from(this.compilation.modules).find((module) => {
			return module.rawRequest === this.pluginProps.embeddedLoaderFilename;
		});
		if (!result) {
			 const error = new Error("Can't locate " + this.pluginProps.embeddedLoaderFilename + " in compilation");
			 this.addError(error);
			 throw error;
		}
		return result;
	}
	renderDojoConfigVars(loaderScope) {
		// Defines and assigns the defalutConfig and userConfig vars on the client.
		// If loaderScope is defined, then the embedded Dojo loader does not include the config API and so
		// the post-processed properties exported in the loaderScope should be used to specify the default config
		var defaultConfig = {hasCache:this.getDefaultFeatures()};
		const buf = [];
		// loader config props duplicated in default config when not using config api
		if (util.isString(this.options.loaderConfig)) {
			const dojoLoaderConfig = Array.from(this.compilation.modules).find((module) => { return module.rawRequest === this.options.loaderConfig;});
			var id = this.compilation.chunkGraph.getModuleId(dojoLoaderConfig);
			buf.push(`var userConfig = __webpack_require__(${JSON.stringify(id)});`);
			buf.push(`if (typeof userConfig === 'function') {`);
			buf.push(Template.indent(`userConfig = userConfig.call(globalObj, ${stringify(this.options.environment || {})});`));
			buf.push("}");
		} else {
			var loaderConfig = this.options.loaderConfig;
			if (typeof loaderConfig === 'function') {
				loaderConfig = loaderConfig(this.options.environment || {});
			}
			if (loaderScope) {
				// make a working copy of the config for us to modify
				loaderConfig = Object.assign({}, loaderConfig);

				// Items to copy from the require object to the default config
				["paths", "pathsMapProg", "packs", "aliases", "mapProgs",  "cacheBust"].forEach(prop => {
					defaultConfig[prop] = loaderScope.require[prop];
				});
				["modules", "cache"].forEach(prop => {
					defaultConfig[prop] = {};
				});
				// Remove packages defined by the loader default config
				["dojo", "dijit", "dojox", "tests", "doh", "build", "demos"].forEach(prop => {
					if (!loaderConfig.packages || !loaderConfig.packages.find(pack => {return pack.name === prop;})) delete defaultConfig.packs[prop];
				});
				// Remove duplicated/redundant items from the user config since they are not needed by Dojo.
				["paths", "packages", "aliases", "maps", "cacheBust"].forEach(prop => {
					delete loaderConfig[prop];
				});
				defaultConfig.hasCache = this.getDefaultFeatures();
			}
			buf.push(`var userConfig = mix(globalObj.dojoConfig, ${stringify(loaderConfig)});`);
		}
		buf.push(`var defaultConfig = ${stringify(defaultConfig)};`);
		return Template.asString(buf);
	}

	getDefaultFeatures() {
		return require("./defaultFeatures");
	}

};
module.exports = DojoAMDRuntimeModule;
