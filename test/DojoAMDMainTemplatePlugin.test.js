/*
 * Tests to provide complete test coverage for DojoAMDMainTemplatePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDMainTemplatePlugin = require("../lib/DojoAMDMainTemplatePlugin");
const plugin = new DojoAMDMainTemplatePlugin({});

class MainTemplate {
	constructor() {
		this.requireFn = "__webpack_require__";
	}
	plugin(event, callback) { // eslint-disable-line no-shadow
		if (event === 'dojo-require-extensions') {
			this.reqExtCallback = callback;
		}
	}
	indent() {}
}

describe("DojoAMDMainTemplatePlugin tests", function() {
	var mainTemplate;

	beforeEach(function() {
		mainTemplate = new MainTemplate();
		plugin.apply({
			plugin: function(event, callback) {
				if (event === "compilation") {
					callback({	// compilation object
						mainTemplate: mainTemplate,
						modules: {
							find: function() { return null; }
						}
					});
				}
			}
		});
	});

	describe("dojo-require-extensions test", function() {
		it("Should throw if dojo loader is not available", function(done) {
			try {
				mainTemplate.reqExtCallback("");
				done(new Error("Shouldn't get here"));
			} catch (err) {
				err.message.should.match(/Can't locate [^\s]+ in compilation/);
				done();
			}
		});
	});
});
