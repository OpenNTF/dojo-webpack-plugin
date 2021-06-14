/*
 * Tests to provide complete test coverage for DojoLoaderPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const proxyquire = require("proxyquire");
const {pluginName} = require("../lib/DojoAMDPlugin");
const {SyncHook, AsyncSeriesHook} = require("tapable");

const tmpStub = {};

const DojoLoaderPlugin = proxyquire("../lib/DojoLoaderPlugin", {
	tmp: tmpStub
});
var plugin, options;
describe("DojoLoaderPlugin tests", function() {
	var compiler;
	beforeEach(function() {
		options = {loaderConfig:{}, noConsole:true};
		plugin = new DojoLoaderPlugin(options);
		compiler = {hooks: {}};
		var pluginProps = compiler[pluginName] = {hooks:{}};
		compiler.context = '.';
		compiler.hooks.compilation = new SyncHook(['compilation', 'params']);
		compiler.hooks.run = new AsyncSeriesHook();
		compiler.hooks.watchRun = new AsyncSeriesHook();
		plugin.apply(compiler);
		pluginProps.hooks.getDojoConfig.tap(pluginName, () => {
			return {};
		});
	});
	afterEach(function() {
		Object.keys(tmpStub).forEach(key => {
			delete tmpStub[key];
		});
	});
	describe("getOrCreateEmbeddedLoader edge cases", function() {

		it("Should call callback with error returned by tmp.dir", function(done) {
			var error = new Error("Failed to create temp dir");
			tmpStub.dir = function(options__, callback) {
				callback(error);
			};
			plugin.getOrCreateEmbeddedLoader("path", {}, {}, err => {
				err.should.be.eql(error);
				done();
			});
		});
		it("Should call callback with error returned by exec", function(done) {
			plugin.getOrCreateEmbeddedLoader("path", {baseUrl:'.'}, {}, err => {
				err.message.should.match(/Cannot find module|ENOENT/);
				done();
			});
		});
	});
	describe("compiler run1 edge cases", function() {
		afterEach(function() {
			delete plugin.getDojoPath;
		});
		it("Should call the callback with error if can't find dojo.js", function(done) {
			const error = new Error("test error");
			plugin.getDojoPath = function() {throw error;};
			plugin.run1({}, (err, data) => {
				err.should.be.eql(error);
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
	});

	describe("compiler run2 edge cases", function() {
		afterEach(function() {
			delete plugin.getDojoPath;
		});
		it("Should call the callback with error if can't find dojo.js", function(done) {
			const error = new Error("test error");
			plugin.getDojoPath = function() {throw error;};
			plugin.run2({}, (err, data) => {
				err.should.be.eql(error);
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
		it("Should call the callback with error if creating embedded loader fails", function(done) {
			const error = new Error("Exception from tmp");
			tmpStub.dir = function(options__, callback) {
				callback(error);
			};
			plugin.run2({}, (err, data) => {
				err.should.be.eql(error);
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
	});

	describe("after-optimize-chunks edge cases", function() {
		beforeEach(function() {
			plugin.options.loader = "loader";
			plugin.options.loaderConfig = "loaderConfig";
			plugin.compilation =  {
				modules: []
			};
		});
		it("Should throw if embedded loader not found in compilation", function(done) {
			try {
				plugin.afterOptimizeChunks([{hasRuntime:function(){return true;}}]);
				done(new Error("Exception not thrown"));
			} catch (err) {
				err.message.should.match(/Can't locate loader in compilation/);
				done();
			}
		});
		it("Should throw if config module not found in compilation", function(done) {
			try {
				plugin.compilation.modules.push({rawRequest:'loader'});
				plugin.afterOptimizeChunks([{hasRuntime:function(){return true;}}]);
				done(new Error("Exception not thrown"));
			} catch (err) {
				err.message.should.match(/Can't locate loaderConfig in compilation/);
				done();
			}
		});
		it("Should not throw if chunk doesn't have runtime", function(done) {
			plugin.afterOptimizeChunks([{hasRuntime:function(){return false;}}]);
			done();
		});
		it("should return typeof string for loader expression when no expression object is passed", function() {
			const result = plugin.evaluateTypeofLoader();
			result.string.should.be.eql("string");
		});
	});
	describe("skip compilation step", function() {
		it("should skip compilation step", function() {
			var isSkipCompilationsCalled;
			options.isSkipCompilation = () => {
				isSkipCompilationsCalled = true;
				return true;
			};
			compiler.hooks.compilation.call({});
			isSkipCompilationsCalled.should.be.eql(true);
		});
	});
});
