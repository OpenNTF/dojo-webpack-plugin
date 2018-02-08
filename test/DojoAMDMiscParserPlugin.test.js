/*
 * Tests to provide complete test coverage for DojoAMDPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDMiscParserPlugin = require("../lib/DojoAMDMiscParserPlugin");
const Tapable = require("tapable");
const plugin = new DojoAMDMiscParserPlugin({});

describe("DojoAMDMiscParserPlugin tests", function() {
	const parser = new Tapable();
	beforeEach(function() {
		plugin.apply(parser);
		parser.state = {module:{}};
	});
	describe("DojoAMDPlugin tests", function() {
		it("Should return undefined from parser 'expression module' event", function() {
			(typeof parser.applyPluginsBailResult("expression module")).should.be.eql('undefined');
		});
	});
});
