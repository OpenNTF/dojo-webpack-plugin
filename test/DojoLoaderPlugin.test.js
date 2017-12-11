/*
 * Tests to provide complete test coverage for DojoLoaderPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const proxyquire = require("proxyquire");
const tmpStub = {}, child_processStub = {};
const DojoLoaderPlugin = proxyquire("../lib/DojoLoaderPlugin", {
	tmp: tmpStub,
	child_process: child_processStub
});
var plugin;
describe("DojoLoaderPlugin tests", function() {
	var runCallbacks;
	var compilationCallback;
	beforeEach(function() {
		runCallbacks = [];
		plugin = new DojoLoaderPlugin({loaderConfig:{}, noConsole:true});
		plugin.apply({
			plugin: function(event, callback) {
				if (event === "run" || event[0] === "run") {
					runCallbacks.push(callback);
				}
				if (event === "compilation") {
					compilationCallback = callback;
				}
			},
			context: "."
		});
	});
	describe("getOrCreateEmbeddedLoader edge cases", function() {
		beforeEach(function() {
			Object.keys(tmpStub).forEach(key => {
				delete tmpStub[key];
			});
			Object.keys(child_processStub).forEach(key => {
				delete child_processStub[key];
			});
		});

		it("Should call callback with error returned by tmp.dir", function(done) {
			var error = new Error("Failed to create temp dir");
			tmpStub.dir = function(options__, callback) {
				callback(error);
			};
			DojoLoaderPlugin.getOrCreateEmbeddedLoader("path", {}, {}, err => {
				err.should.be.eql(error);
				done();
			});
		});
		it("Should call callback with error returned by exec", function(done) {
			var error = new Error("Error from execFile");
			child_processStub.execFile = function(executable__, options__, callback) {
				callback(error, "", "Error from execFile");
			};
			DojoLoaderPlugin.getOrCreateEmbeddedLoader("path", {baseUrl:'.'}, {}, err => {
				err.should.be.eql(error);
				done();
			});
		});
	});
	describe("validateEmbeddedLoader edge cases", function() {
		it("Should invoke callback with error if nomralModuleFactory.create returns an error", function(done) {
			var error = new Error("Failed to create module");
			DojoLoaderPlugin.validateEmbeddedLoader({
				normalModuleFactory: {
					create: function(params__, callback) {
						callback(error);
					}
				}
			}, "", "", err => {
				err.should.be.eql(error);
				done();
			});
		});
	});
	describe("compiler run(0) edge cases", function() {
		afterEach(function() {
			plugin.options.loaderConfig = {};
		});
		it("Should call the callback with error if can't find dojo.js", function(done) {
			// specifying location as an object throws an exception in the getDojoPath function
			plugin.options.loaderConfig.packages = [{name:"dojo", location:{}}];
			runCallbacks[0].call(plugin, {}, (err, data) => {
				err.message.should.match(/Path must be a string/);
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
	});

	describe("compiler run(1) edge cases", function() {
		afterEach(function() {
			plugin.options.loaderConfig = {};
		});
		it("Should call the callback with error if can't find dojo.js", function(done) {
			// specifying location as an object throws an exception in the getDojoPath function
			plugin.options.loaderConfig.packages = [{name:"dojo", location:{}}];
			runCallbacks[1].call(plugin, {}, (err, data) => {
				err.message.should.match(/Path must be a string/);
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
		it("Should call the callback with error if creating embedded loader fails", function(done) {
			const error = new Error("Exception from tmp");
			tmpStub.dir = function(options__, callback) {
				callback(error);
			};
			runCallbacks[1].call(plugin, {}, (err, data) => {
				err.should.be.eql(error);
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
	});

	describe("after-optimize-chunks edge cases", function() {
		var afterOptimizeChunksCallback, params, compilation;
		beforeEach(function() {
			plugin.options.loader = "loader";
			plugin.options.loaderConfig = "loaderConfig";
			params = {
				normalModuleFactory: {
					plugin: function() {}
				}
			},
			compilation = {
				plugin: function(event, callback) {
					if (event === 'after-optimize-chunks') {
						afterOptimizeChunksCallback = callback;
					}
				},
				modules: {
					find() {}
				}
			};
			compilationCallback(compilation, params);
		});
		it("Should throw if embedded loader not found in compilation", function(done) {
			try {
				afterOptimizeChunksCallback([{hasRuntime:function(){return true;}}]);
				done(new Error("Exception not thrown"));
			} catch (err) {
				err.message.should.match(/Can't locate loader in compilation/);
				done();
			}
		});
		it("Should throw if config module not found in compilation", function(done) {
			try {
				var count = 0;
				compilation.modules.find = function() {
					return count++ === 0 ? {} : null;
				};
				afterOptimizeChunksCallback([{hasRuntime:function(){return true;}}]);
				done(new Error("Exception not thrown"));
			} catch (err) {
				err.message.should.match(/Can't locate loaderConfig in compilation/);
				done();
			}
		});
		it("Should not throw if chunk doesn't have runtime", function(done) {
			afterOptimizeChunksCallback([{hasRuntime:function(){return false;}}]);
			done();
		});
	});
	describe("evaluate typeof __embedded_dojo_loader__ edge cases", function() {
		var params, compilation, parserCallback, evalTypeofCallback;
		beforeEach(function() {
			params = {
				normalModuleFactory: {
					plugin: function(event, callback) {
						if (event === "parser") {
							parserCallback = callback;
						}
					}
				}
			},
			compilation = {
				plugin: function() {}
			};
			debugger; // eslint-disable-line
			compilationCallback(compilation, params);
			parserCallback({
				plugin: function(event, callback) {
					if (event === "evaluate typeof __embedded_dojo_loader__") {
						evalTypeofCallback = callback;
					}
				}
			});
		});
		it("Should not throw if expr is undefined", function() {
			debugger; // eslint-disable-line
			const result = evalTypeofCallback();
			result.string.should.be.eql('string');
		});
	});
});
