/*
 * Tests to provide complete test coverage for DojoAMDResolvePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.
 */
const DojoAMDResolverPlugin = require("../lib/DojoAMDResolverPlugin");
const plugin = new DojoAMDResolverPlugin({});

plugin.apply({
	resolvers: {
		normal: {
			plugin: (event, callback) => {
				if (event === "module") {
					describe("resolver tests", () => {
						it("Should invoke callback with no args for directory request", done => {
							callback({directory:true}, (err, data) => {
								(typeof err).should.be.eql('undefined');
								(typeof data).should.be.eql('undefined');
								done();
							});
						});
						it("Should invoke callback with no args for null request", done => {
							callback({request: "null", path:"."}, (err, data) => {
								(typeof err).should.be.eql('undefined');
								(typeof data).should.be.eql('undefined');
								done();
							});
						});
						it("Should invoke callback with no args for identity request", done => {
							callback({request: "null", path:"."}, (err, data) => {
								(typeof err).should.be.eql('undefined');
								(typeof data).should.be.eql('undefined');
								done();
							});
						});
					});
				}
			}
		}
	},
	plugin: (event, callback) => {
		if (event === "compilation") {
			callback();
		}
	},
	applyPluginsBailResult(event) {
		if (event === "get dojo require") {
			return {
				toUrl: (request) => {
					return request.request === "null" ? null : request.request;
				}
			};
		}
	}
});
