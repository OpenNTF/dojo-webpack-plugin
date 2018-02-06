/*
 * Tests to provide complete test coverage for DojoAMDRequireDependenciesBlockParserPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDRequireDependenciesBlockParserPlugin = require("../lib/DojoAMDRequireDependenciesBlockParserPlugin");

describe("DojoAMDRequireDependenciesBlockParserPlugin tests", function() {
	var requireItem;
	beforeEach(function() {
		const plugin = new DojoAMDRequireDependenciesBlockParserPlugin({});
		plugin.apply({
			plugin: function(event, callback) {
				if (event === "call require:amd:item") {
					requireItem = callback;
				}
			}
		});
	});
	describe("Test edge cases", function() {
		it("'call define:amd:item' with unrecognized param type", function() {
			const result = requireItem({}, {
				isString: function() {return false;},
				isIdentifier: function() {return false;}
			});
			(typeof result).should.be.eql("undefined");
		});
	});
});
