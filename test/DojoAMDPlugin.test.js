/*
 * Tests to provide complete test coverage for DojoAMDResolvePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDPlugin = require("../lib/DojoAMDPlugin");
describe("DojoAMDPlugin tests", function() {
	const plugin = new DojoAMDPlugin({});
	it("should set resolveLoader aliases even if no resolverLoader is defined", function() {
		const compiler = {
			options: {}
		};
		plugin.setAliases(compiler);
		compiler.options.resolveLoader.alias["dojo/text"].should.not.be.null;
		compiler.options.resolveLoader.alias["dojo/i18n"].should.not.be.null;
	});
});