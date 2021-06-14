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
	it("should set resolveLoader aliases even if no resolverLoader is defined", function() {
		const plugin = new DojoAMDPlugin({});
		const compiler = {
			options: {}
		};
		plugin.setAliases(compiler);
		compiler.options.resolveLoader.alias["dojo/text"].should.not.be.null;
		compiler.options.resolveLoader.alias["dojo/i18n"].should.not.be.null;
	});

	it("should set resolveLoader aliases even if no resolverLoader is defined", function() {
		let plugin = new DojoAMDPlugin({});
		plugin.isSkipCompilation({name: "HtmlWebpackCompiler"}).should.be.eql(true);
		plugin = new DojoAMDPlugin({ignoredCompilationNames:["foo", /bar$/]});
		plugin.isSkipCompilation({name: "foo"}).should.be.eql(true);
		plugin.isSkipCompilation({name: "foobar"}).should.be.eql(true);
		plugin.isSkipCompilation({name: "foobarbaz"}).should.be.eql(false);
	});

	it("should skip compilation step", function() {
		var isSkipCompilationCalled;
		const options = {};
		const plugin = new DojoAMDPlugin(options);
		options.isSkipCompilation = () => {
			isSkipCompilationCalled = true;
			return true;
		};
		plugin.compilationPlugins({});
		isSkipCompilationCalled.should.be.eql(true);
	});
});