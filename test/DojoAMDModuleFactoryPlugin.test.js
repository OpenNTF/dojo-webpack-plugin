/*
 * Tests to provide complete test coverage for DojoAMDModuleFactoryPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const {pluginName, getPluginProps} = require("../lib/DojoAMDPlugin");
const DojoAMDModuleFactoryPlugin = require("../lib/DojoAMDModuleFactoryPlugin");
const {AsyncSeriesWaterfallHook, SyncWaterfallHook, SyncHook, SyncBailHook} = require("tapable");

class Factory {
	constructor() {
		this.hooks = {};
		this.hooks.beforeResolve = new AsyncSeriesWaterfallHook(['data']);
		this.hooks.resolve = new AsyncSeriesWaterfallHook(['data']);
		this.hooks.module = new SyncWaterfallHook(['module', 'data']);
	}
	addAbsMid(data, absMid) {
		return this.events["add absMid"](data, absMid);
	}
}

describe("DojoAMDModuleFactoryPlugin tests", function() {
	var plugin;
	var factory;
	var compiler;
	var compilation;
	beforeEach(function() {
		plugin = new DojoAMDModuleFactoryPlugin({isSkipCompilation: () => false});
		factory = new Factory();
		compiler = {hooks: {}};
		compilation = {hooks:{}};
		compiler[pluginName] = {};
		compiler.hooks.normalModuleFactory = new SyncHook(['factory']);
		compiler.hooks.compilation = new SyncHook(['compilation', 'params']);
		compilation.hooks.seal = new SyncHook();
		compilation.hooks.buildModule = new SyncBailHook(['module']);
		plugin.apply(compiler);
		plugin.factory = factory;
		this.options = {isSkipCompilation: () => false};
		compiler.hooks.normalModuleFactory.call(factory);
		compiler.hooks.compilation.call(compilation, {normalModuleFactory: factory});
	});
	function getAbsMids(data) {
		var result = [];
		plugin.filterAbsMids(data, absMid => result.push(absMid));
		return result;
	}
	describe("addAbsMid tests", function() {
		it("should add the absMid", function() {
			var data = {};
			plugin.addAbsMid(data, "a");
			data.absMid.should.be.eql("a");
			getAbsMids(data).length.should.be.eql(1);

			plugin.addAbsMid(data, "b");
			var absMids = getAbsMids(data);
			data.absMid.should.be.eql("b");
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("b");
			absMids[1].should.be.eql("a");

			data = {absMid: "a"};
			absMids = getAbsMids(data);
			absMids.length.should.be.eql(1);
			absMids[0].should.be.eql("a");

			data = {absMid: 'a'};
			plugin.addAbsMid(data, 'b');
			absMids = getAbsMids(data);
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql('b');
			absMids[1].should.be.eql('a');

			// ensure provisional absMids remain behind non-provisional absMids
			data = {absMid: 'a'};
			plugin.addAbsMid(data, 'b', true);
			absMids = getAbsMids(data);
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql('a');
			absMids[1].should.be.eql('b');

			data = {};
			plugin.addAbsMid(data, 'd', true);
			data.absMid = 'b';
			data.absMid = 'a';
			plugin.addAbsMid(data, 'c', true);
			var absMids = getAbsMids(data);
			absMids.length.should.be.eql(4);
			absMids[0].should.be.eql('a');
			absMids[1].should.be.eql('b');
			absMids[2].should.be.eql('c');
			absMids[3].should.be.eql('d');
		});

		it("Should throw with empty absMid", function(done) {
			try {
				var data = {};
				plugin.addAbsMid(data, "");
				return done(new Error("Should have thrown"));
			} catch (e) {
				e.message.should.containEql("Illegal absMid:");
				done();
			}
		});

		it("Should throw with empty absMid assignment", function(done) {
			try {
				var data = {};
				plugin.addAbsMid(data, "a");
				data.absMid = '';
				return done(new Error("Should have thrown"));
			} catch (e) {
				e.message.should.containEql("Illegal absMid:");
				done();
			}
		});
	});

	describe("filterAbsMids tests", function() {
		it("Should remove the specified aliases", function() {
			var data = {};
			var absMids = [];
			plugin.addAbsMid(data, 'c');
			plugin.addAbsMid(data, 'b');
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, absMid => {
				return absMid === "b";
			});
			data.absMid.should.be.eql("b");
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(1);

			data = {};
			plugin.addAbsMid(data, 'c');
			plugin.addAbsMid(data, 'b');
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, absMid => {
				return absMid !== "b";
			});
			data.absMid.should.be.eql("a");
			absMids = [];
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("a");
			absMids[1].should.be.eql("c");

			data = {};
			plugin.addAbsMid(data, 'c');
			plugin.addAbsMid(data, 'b');
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, absMid => {
				return absMid !== "c";
			});
			data.absMid.should.be.eql("a");
			absMids = [];
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("a");
			absMids[1].should.be.eql("b");

			data = {};
			plugin.addAbsMid(data, 'c');
			plugin.addAbsMid(data, 'b');
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, () => {
				return false;
			});
			(typeof data.absMid).should.be.eql('undefined');

			// shouldn't blow up if absMidAliaes is missing
			data = {};
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, () => {
				return true;
			});
			data.absMid.should.be.eql("a");
			absMids = [];
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(1);
		});
	});

	describe("processAbsMidQueryArgs tests", function() {
		it("Should parse no-arg requests properly", function() {
			var data = {};
			data.request = "foo/bar";
			plugin.processAbsMidQueryArgs(data);
			(typeof data.absMid).should.be.eql('undefined');
		});
		it("Should parse request with single absMid properly", function() {
			var data = {};
			data.request = "./bar?absMid=foo/bar";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("./bar");
			data.absMid.should.be.eql("foo/bar");
		});
		it("Should parse request with multple absMids and other args properly", function() {
			var data = {};
			var absMids = [];
			data.request = "moduleA?q=123&absMid=test/a&id=456&absMid=foo/a";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA?q=123&id=456");
			data.absMid.should.be.eql("foo/a");
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("foo/a");
			absMids[1].should.be.eql("test/a");
		});
		it("Should parse requests with no absMid args properly", function() {
			var data = {};
			data.request = "moduleA?q=123&s=abc";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA?q=123&s=abc");
			(typeof data.absMid).should.be.eql('undefined');
		});
		it("Should parse requests with absMid args in multiple plugin segments", function() {
			var data = {};
			var absMids = [];
			data.request = "moduleA?absMid=a!moduleB!moduleC?absMid=c!moduleD?q=123";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA!moduleB!moduleC!moduleD?q=123");
			data.absMid.should.be.eql("c");
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("c");
			absMids[1].should.be.eql("a");
		});
	});

	describe("'add absMids from request event' tests", function() {
		it("should gracefully handle undefined data object", function(done) {
			try {
				plugin.addAbsMidsFromRequest(null);
				done();
			} catch (err) {
				done(err);
			}
		});

		it("should gracefully handle undefined data.dependencies object", function(done) {
			getPluginProps(compiler).dojoRequire = {toAbsMid: function(a) {return a;}};
			try {
				const data = {request: "foo/bar"};
				plugin.addAbsMidsFromRequest(data);
				data.absMid.should.be.eql(data.request);
				done();
			} catch (err) {
				done(err);
			}
		});
	});

	describe("'module' event tests", function() {
		it("Should return existing module", function() {
			const existing = factory.hooks.module.call({absMid: 'a', request:'./a'});
			var absMids = [];
			const result = factory.hooks.module.call({request:'./a'});
			result.should.be.equal(existing);
			(typeof result.addAbsMid).should.be.eql('function');
			(typeof result.filterAbsMids).should.be.eql('function');
			existing.absMid.should.eql('a');
			plugin.filterAbsMids(existing, absMid => absMids.push(absMid));
			absMids.length.should.eql(1);
		});
	});

	describe("toAbsMid tests", function() {
		it("Should return undefined for undefined request", function() {
			(typeof plugin.toAbsMid()).should.be.eql('undefined');
		});
	});

	describe("Skip compilation", function() {
		it("should not skip compilation", function() {
			var trimAbsMidsCalled = false;
			factory = new Factory();
			compiler = {hooks: {}};
			compilation = {hooks: {}};
			compiler.hooks.normalModuleFactory = new SyncHook(['factory']);
			compiler.hooks.compilation = new SyncHook(['compilation', 'params']);
			compilation.hooks.seal = new SyncHook();
			compilation.hooks.buildModule = new SyncBailHook(['module']);
			plugin.apply(compiler);
			plugin.factory = factory;
			plugin.trimAbsMids = () => trimAbsMidsCalled = true;
			this.options = {isSkipCompilation: () => false};
			compiler.hooks.compilation.call(compilation, {normalModuleFactory: factory});
			compilation.hooks.seal.call();
			trimAbsMidsCalled.should.be.eql(true);
		});
		it("should skip compilation", function() {
			plugin = new DojoAMDModuleFactoryPlugin({isSkipCompilation: () => true});
			var trimAbsMidsCalled = false;
			factory = new Factory();
			compiler = {hooks: {}};
			compilation = {hooks: {}};
			compiler.hooks.normalModuleFactory = new SyncHook(['factory']);
			compiler.hooks.compilation = new SyncHook(['compilation', 'params']);
			compilation.hooks.seal = new SyncHook();
			compilation.hooks.buildModule = new SyncBailHook(['module']);
			plugin.apply(compiler);
			plugin.factory = factory;
			plugin.trimAbsMids = () => trimAbsMidsCalled = true;
			this.options = {isSkipCompilation: () => false};
			compiler.hooks.compilation.call(compilation, {normalModuleFactory: factory});
			compilation.hooks.seal.call();
			trimAbsMidsCalled.should.be.eql(false);
		});
	});
});
