/*
 * Tests to provide complete test coverage for DojoAMDDefineDependencyParserPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDDefineDependencyParserPlugin = require("../lib/DojoAMDDefineDependencyParserPlugin");
const Tapable = require("tapable");

describe("DojoAMDDefineDependencyParserPlugin tests", function() {
	var parser;
	const params = {
		isString: function() {return false;},
		isIdentifier: function() {return false;},
		isArray: function() {return false;},
		isConstArray: function() {return false;}
	};
	beforeEach(function() {
		parser = new Tapable();
		parser.plugin = function() {  // so hasOwnProperty is true
			return Tapable.prototype.plugin.apply(this, arguments);
		};
		const plugin = new DojoAMDDefineDependencyParserPlugin({}, parser);
		plugin.apply(parser);
	});
	describe("Test edge cases", function() {
		it("'call define:amd:array' with unrecognized param type", function() {
			const result = parser.applyPluginsBailResult('call define:amd:array', {}, params);
			(typeof result).should.be.eql("undefined");
		});
	});
});
