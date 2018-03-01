/*
 * Tests to provide complete test coverage for DojoAMDMainTemplatePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDMainTemplatePlugin = require("../lib/DojoAMDMainTemplatePlugin");
const Tapable = require("tapable");
const plugin = new DojoAMDMainTemplatePlugin({});

class MainTemplate extends Tapable {
	constructor() {
		super();
		this.requireFn = "__webpack_require__";
	}
	indent() {}
}

describe("DojoAMDMainTemplatePlugin tests", function() {
	var mainTemplate;

	beforeEach(function() {
		mainTemplate = new MainTemplate();
		const compiler = new Tapable();
		const compilation = new Tapable();
		plugin.apply(compiler);
		compilation.mainTemplate = mainTemplate;
		compilation.modules = {
			find: function() { return null; }
		};
		compiler.applyPlugins("compilation", compilation);
	});

	describe("dojo-require-extensions test", function() {
		it("Should throw if dojo loader is not available", function(done) {
			try {
				mainTemplate.applyPlugins("dojo-require-extensions");
				done(new Error("Shouldn't get here"));
			} catch (err) {
				err.message.should.match(/Can't locate [^\s]+ in compilation/);
				done();
			}
		});
	});
});
