/*
 * Tests to provide complete test coverage for DojoAMDDefineDependencyParserPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDDefineDependencyParserPlugin = require("../lib/DojoAMDDefineDependencyParserPlugin");

describe("DojoAMDDefineDependencyParserPlugin tests", function() {
	var defineArray, defineItem;
	beforeEach(function() {
		const plugin = new DojoAMDDefineDependencyParserPlugin({});
		plugin.apply({
			plugin: function(event, callback) {
				if (event === "call define:amd:array") {
					defineArray = callback;
				} else if (event === "call define:amd:item") {
					defineItem = callback;
				}
			}
		});
	});
	describe("Test edge cases", function() {
		it("'call define:amd:item' with unrecognized param type", function() {
			const result = defineArray({}, {
				isArray: function() {return false;},
				isConstArray: function() {return false;}
			});
			(typeof result).should.be.eql("undefined");
		});
		it("'call define:amd:item' with unrecognized param type", function() {
			const result = defineItem({}, {
				isString: function() {return false;}
			});
			(typeof result).should.be.eql("undefined");
		});
	});
});
