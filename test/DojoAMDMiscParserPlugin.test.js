/*
 * Tests to provide complete test coverage for DojoAMDPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDMiscParserPlugin = require("../lib/DojoAMDMiscParserPlugin");
const plugin = new DojoAMDMiscParserPlugin({});
var moduleCallback;

describe("DojoAMDMiscParserPlugin tests", function() {
	beforeEach(function() {
		plugin.apply({
			plugin: (event, callback) => { // eslint-disable-line no-shadow
				if (event === "expression module") {
					moduleCallback = callback;
				}
			},
			state: {
				module:{}
			}
		});
	});
	describe("DojoAMDPlugin tests", function() {
		it("Should return undefined from parser 'expression module' event", function() {
			(typeof moduleCallback()).should.be.eql('undefined');
		});
	});
});
