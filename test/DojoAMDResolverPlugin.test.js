/*
 * Tests to provide complete test coverage for DojoAMDResolvePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDResolverPlugin = require("../lib/DojoAMDResolverPlugin");
const Tapable = require("tapable");

describe("DojoAMDResolverPlugin tests", function() {
	const compiler = new Tapable();
	const plugin = new DojoAMDResolverPlugin({}, compiler);
	compiler.plugin("get dojo require", function() {
		return {
			toUrl: (request) => {
				return request.request === "null" ? null : request.request;
			}
		};
	});
	var factory;
	beforeEach(function() {
		factory = new Tapable();
		plugin.apply(factory);
	});
	describe("resolver tests", () => {
		it("Should invoke callback with no args for directory request", done => {
			factory.applyPlugins("module", {directory:true}, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
		it("Should invoke callback with no args for null request", done => {
			factory.applyPlugins("module", {request: "null", path:"."}, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
		it("Should invoke callback with no args for identity request", done => {
			factory.applyPlugins("module", {request: "null", path:"."}, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
	});
});
