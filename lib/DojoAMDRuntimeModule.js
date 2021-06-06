const util = require('util');
const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const RuntimeModule = require("webpack/lib/RuntimeModule");
const Template = require("webpack/lib/Template");
const runtime = require("../runtime/DojoAMDMainTemplate.runtime");
const loaderMainModulePatch = require("../runtime/DojoLoaderNonLocalMainPatch.runtime");
const {pluginName, callSyncBail, callSyncWaterfall} = require("webpack-plugin-compat").for("dojo-webpack-plugin");
const {needChunkLoadingCode} = require("./compat");

class DojoAMDRuntimeModule extends RuntimeModule {
	constructor(chunk, options, compiler, mainTemplate) {
		super('dojo-webpack-loader');
		this.chunk = chunk;
		this.options = options;
		this.compiler = compiler;
		this.mainTemplate = mainTemplate;
		compiler.hooks.afterCompile.tap('dojo-webpack-plugin', () => {
		  if (this.getNumberOfErrors()) {
				throw this.getErrors()[0];
			}
		});
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { mainTemplate } = this.compilation;
		const [runtimeSource, asyncSource] = ['main', 'async'].map(type => Template.getFunctionContent(runtime[type])
		                           .replace(/__async__/g, (!!this.options.async).toString()));
		const buf = [];

		buf.push(runtimeSource);
		if (this.options.async) {
			buf.push(asyncSource);
		}
		buf.push("var globalObj = this||window;");
		buf.push("registerAbsMids({");
		buf.push(callSyncWaterfall(this.compilation.chunkTemplate, "render absMids", "", this.chunk));
		buf.push("});");
		buf.push("");
		buf.push((callSyncWaterfall(mainTemplate, "dojo-global-require", "globalObj.require = req;")));
		if(needChunkLoadingCode(this.chunk)) {
			buf.push(Template.indent(
				`(self["${RuntimeGlobals.chunkCallback}"] = self["${RuntimeGlobals.chunkCallback}"] || []).registerAbsMids = registerAbsMids;`
			));
		}
		buf.push("");
		buf.push("// expose the Dojo compatibility functions as a properties of __webpack_require__");
		const djProp = `__webpack_require__.${this.options.requireFnPropName}`;
		buf.push(`if (${djProp}) throw new Error("${djProp} name collision.")`);
		buf.push(`${djProp} = {`);
		buf.push(Template.indent([
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

		const dojoLoaderModule = Array.from(this.compilation.modules).find((module) => {
			return module.rawRequest === this.mainTemplate.embeddedLoaderFilename;
		});
		if (!dojoLoaderModule) {
			 this.addError(new Error("Can't locate " + this.mainTemplate.embeddedLoaderFilename + " in compilation"));
		}
		buf.push(`globalObj.dojoConfig = globalObj.dojoConfig || {}`);
		var loaderScope;
		if (!this.mainTemplate.embeddedLoaderHasConfigApi) {
			if (!util.isString(this.options.loaderConfig)) {
				let loaderConfig = this.options.loaderConfig;
				if (typeof loaderConfig === 'function') {
					loaderConfig = loaderConfig(this.options.environment || {});
				}
				loaderScope = callSyncBail(this.compiler, "create-dojo-loader-scope", Object.assign({}, loaderConfig), this.mainTemplate.dojoLoader, this.mainTemplate.dojoLoaderFilename);
			} else {
				this.addError(new Error(`The embedded Dojo loader needs the config API in order to support loading the Dojo loader config as a module, \
but the loader specified at ${this.mainTemplate.embeddedLoaderFilename} was built without the config API.  Please rebuild the embedded loader with 'dojo-config-api' feature enabled`));
			}
		}
		buf.push(callSyncWaterfall(mainTemplate, "render-dojo-config-vars", loaderScope, "", this.chunk));
		buf.push("var dojoLoader = __webpack_require__(" + JSON.stringify(this.compilation.chunkGraph.getModuleId(dojoLoaderModule)) + ");");
		buf.push("dojoLoader.call(loaderScope, userConfig, defaultConfig, loaderScope, loaderScope);");
		if (loaderScope) {
			// loaderProps.baseUrl is set by the loader config renderer if the loader has no config api.
			buf.push("loaderScope.require.baseUrl = " + JSON.stringify(loaderScope.require.baseUrl) + ";");
		}
		buf.push(Template.getFunctionContent(loaderMainModulePatch));
		buf.push("['baseUrl','has','rawConfig','on','signal'].forEach(function(name) {req[name] = loaderScope.require[name]})");
		const loaderConfig = callSyncBail(this.compiler, "get dojo config");
		if (loaderConfig.has && loaderConfig.has['dojo-undef-api']) {
			buf.push("req.undef = " +  Template.getFunctionContent(runtime.undef));
		}
		if(needChunkLoadingCode(this.chunk)) {
			buf.push(`var absMidsWaiting = globalObj['${RuntimeGlobals.chunkCallback}'].absMidsWaiting;`);
			buf.push("if (absMidsWaiting) {");
			buf.push("   absMidsWaiting.forEach(registerAbsMids);");
			buf.push(`   delete globalObj['${RuntimeGlobals.chunkCallback}'].absMidsWaiting;`);
			buf.push("}");
		}
		return Template.asString([
			`(function() { /* Start ${pluginName} extensions */`,
			Template.indent(buf),
			`})(); /* End ${pluginName} extensions */`
		]);
	}
};
module.exports = DojoAMDRuntimeModule;
