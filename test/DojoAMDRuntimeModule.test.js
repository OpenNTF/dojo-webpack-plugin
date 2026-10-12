/*
 * Tests to provide complete test coverage for DojoAMDMainTemplatePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDRuntimeModule = require("../lib/DojoAMDRuntimeModule");
const {pluginName} = require("../lib/DojoAMDPlugin");
const {SyncHook} = require("tapable");
const {WebpackError} = require("webpack");

function createCompiler() {
	return {[pluginName]: {hooks:{}}, hooks: {afterCompile: new SyncHook(["compilation"])}};
}

describe("DojoAMDRuntimeModule tests", function() {
	it("Should throw if dojo loader is not available", function(done) {
		const compiler = {[pluginName]: {hooks:{}, embeddedLoaderFileName: 'testEmbeddedLoader'}, hooks: {}};
		const compilation = {hooks:{}};
		compiler.hooks.afterCompile = new SyncHook();
		const runtimeModule = new DojoAMDRuntimeModule({}, {}, compiler);
		compilation.modules = {
			find: function() { return null; }
		};
		runtimeModule.compilation = compilation;
		try {
			runtimeModule.getDojoLoaderModule();
			done(new Error("Shouldn't get here"));
		} catch (err) {
			err.message.should.match(/Can't locate [^\s]+ in compilation/);
			runtimeModule.getErrors()[0].should.match(/Can't locate [^\s]+ in compilation/);
			done();
		}
	});

	it("Should tap afterCompile once per compiler, not once per runtime module", function() {
		// Watch mode creates a runtime module per compilation; a tap per instance kept every
		// previous compilation reachable from the compiler.
		const compiler = createCompiler();
		new DojoAMDRuntimeModule({}, {}, compiler);
		new DojoAMDRuntimeModule({}, {}, compiler);
		new DojoAMDRuntimeModule({}, {}, compiler);
		compiler.hooks.afterCompile.taps.length.should.equal(1);
	});

	it("Should throw only the current compilation's runtime module errors after compile", function() {
		const compiler = createCompiler();
		const firstBuildModule = new DojoAMDRuntimeModule({}, {}, compiler);
		firstBuildModule.addError(new WebpackError("first build error"));
		(() => compiler.hooks.afterCompile.call({modules: new Set([firstBuildModule])})).should.throw(/first build error/);

		const secondBuildModule = new DojoAMDRuntimeModule({}, {}, compiler);
		(() => compiler.hooks.afterCompile.call({modules: new Set([secondBuildModule])})).should.not.throw();
	});
});
