/*
 * Tests to provide complete test coverage for DojoAMDRequireDependenciesBlockParserPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDRequireDependenciesBlockParserPlugin = require("../lib/DojoAMDRequireDependenciesBlockParserPlugin");
const Tapable = require("tapable");

describe("DojoAMDRequireDependenciesBlockParserPlugin tests", function() {
	var parser;
	beforeEach(function() {
		const plugin = new DojoAMDRequireDependenciesBlockParserPlugin({});
		parser = new Tapable();
		plugin.apply(parser);
	});
	describe("Test edge cases", function() {
		it("'call define:amd:item' with unrecognized param type", function() {
			const result = parser.applyPluginsBailResult('call require:amd:item', {}, {
				isString: function() {return false;},
				isIdentifier: function() {return false;}
			});
			(typeof result).should.be.eql("undefined");
		});
	});
});
