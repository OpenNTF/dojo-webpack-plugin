/*
 * Tests to provide complete test coverage for DojoAMDResolvePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDResolverPlugin = require("../lib/DojoAMDResolverPlugin");

describe("DojoAMDResolverPlugin tests", function() {
	let compiler, plugin, resolverCallback;
	beforeEach(() => {
		resolverCallback = undefined;
		plugin = new DojoAMDResolverPlugin({});
		compiler = {
			hooks: {},
			resolverFactory: {
				hooks: {
					resolver: {
						for() {
							return {
								tap(pluginName__, callback) {
									resolverCallback = callback;
								}
							};
						}
					}
				}
			}
		};
		compiler['dojo-webpack-plugin'] = {
			hooks: {},
			dojoRequire: {
				toUrl: (request) => {
					return request.request === "null" ? null : request.request;
				}
			}
		};
		plugin.compiler = compiler;
	});
	describe("apply tests", () => {
		it("Should tap resolve hook", () => {
			let resolveCalled = false;
			plugin.apply(compiler);
			const resolver = {
				hooks: {
					resolve: {
						tapAsync() {
							resolveCalled = true;
						}
					}
				}
			};
			resolverCallback(resolver);
			resolveCalled.should.be.eql(true);
		});
		it("Should tap module hook", () => {
			let moduleCalled = false;
			plugin.options.ignoreNonModuleResources = true;
			plugin.apply(compiler);
			const resolver = {
				hooks: {
					module: {
						tapAsync() {
							moduleCalled = true;
						}
					}
				}
			};
			resolverCallback(resolver);
			moduleCalled.should.be.eql(true);
		});
	});
	describe("resolver tests", () => {
		it("Should invoke callback with no args for directory request", done => {
			plugin.resolve({directory:true}, null, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
		it("Should invoke callback with no args for null request", done => {
			plugin.resolve({request: "null", path:"."}, null, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
		it("Should invoke callback with no args for identity request", done => {
			plugin.resolve({request: "null", path:"."}, null, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
	});
});
