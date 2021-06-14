/*
 * Tests to provide complete test coverage for DojoAMDChunkTemplatePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDChunkTemplatePlugin = require("../lib/DojoAMDChunkTemplatePlugin");
const {SyncHook} = require("tapable");

describe("DojoAMDChunkTemplatePlugin tests", function() {
	it("should skip compilation", function() {
		it("should skip compilation", function() {
			var isSkipCompilationCalled = false;
			const options = {
				isSkipCompilation: () => {
					isSkipCompilationCalled = true;
					return true;
				}
			};
			var compiler = {hooks:{}};
			compiler.hooks.compilation = new SyncHook(['compilation', 'params']);
			const plugin = new DojoAMDChunkTemplatePlugin(options);
			plugin.apply(compiler);
			compiler.hooks.compilation.call({});
			isSkipCompilationCalled.should.be.eql(true);
		});
	});
});