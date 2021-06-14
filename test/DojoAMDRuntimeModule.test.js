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
});
