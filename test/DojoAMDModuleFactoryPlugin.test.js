/*
 * Tests to provide complete test coverage for DojoAMDModuleFactoryPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDModuleFactoryPlugin = require("../lib/DojoAMDModuleFactoryPlugin");
const {Tapable, reg, callSync, callSyncWaterfall} = require("../lib/pluginCompat");
const plugin = new DojoAMDModuleFactoryPlugin({});

class Factory extends Tapable {
	constructor() {
		super();
		reg(this, {
			"beforeResolve" : ["AsyncSeriesWaterfall", "data"],
			"resolver"      : ["SyncWaterfall", "resolver"],
			"createModule"  : ["SyncBail", "data"],
			"module"        : ["SyncWaterfall", "module", "data"]
		});
	}
	addAbsMid(data, absMid) {
		return this.events["add absMid"](data, absMid);
	}
}

describe("DojoAMDModuleFactoryPlugin tests", function() {
	var factory;
	var compiler;
	var compilation;
	beforeEach(function() {
		factory = new Factory();
		compiler = new Tapable();
		compilation = new Tapable();
		reg(compiler, {
			"normal-module-factory" : ["Sync", "factory"],
			"compilation"         : ["Sync", "compilation, params"]
		});
		plugin.apply(compiler);
		plugin.factory = factory;
		callSync(compiler, "normal-module-factory", factory);
		callSync(compiler, "compilation", compilation, {});
	});
	describe("addAbsMid tests", function() {
		it("should add the absMid", function() {
			var data = {};
			plugin.addAbsMid(data, "a");
			data.absMid.should.be.eql("a");
			data.absMidAliases.length.should.be.eql(0);

			plugin.addAbsMid(data, "b");
			data.absMid.should.be.eql("a");
			data.absMidAliases.length.should.be.eql(1);
			data.absMidAliases[0].should.be.eql("b");
		});
		it("Should prioritize the non-absolute absMid", function() {
			var data = {};
			plugin.addAbsMid(data, "/foo/bar");
			data.absMid.should.be.eql("/foo/bar");
			data.absMidAliases.length.should.be.eql(0);
			plugin.addAbsMid(data, "foo/bar");
			data.absMid.should.be.eql("foo/bar");
			data.absMidAliases.length.should.be.eql(1);
			data.absMidAliases[0].should.be.eql("/foo/bar");
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
	});

	describe("filterAbsMids tests", function() {
		it("Should remove the specified aliases", function() {
			var data = {};
			data.absMid = "a";
			data.absMidAliases = ["b", "c"];
			plugin.filterAbsMids(data, absMid => {
				return absMid === "b";
			});
			data.absMid.should.be.eql("b");
			data.absMidAliases.length.should.be.eql(0);

			data = {};
			data.absMid = "a";
			data.absMidAliases = ["b", "c"];
			plugin.filterAbsMids(data, absMid => {
				return absMid !== "b";
			});
			data.absMid.should.be.eql("a");
			data.absMidAliases.length.should.be.eql(1);
			data.absMidAliases[0].should.be.eql("c");

			data = {};
			data.absMid = "a";
			data.absMidAliases = ["b", "c"];
			plugin.filterAbsMids(data, absMid => {
				return absMid !== "c";
			});
			data.absMid.should.be.eql("a");
			data.absMidAliases.length.should.be.eql(1);
			data.absMidAliases[0].should.be.eql("b");

			data = {};
			data.absMid = "a";
			data.absMidAliases = ["b", "c"];
			plugin.filterAbsMids(data, () => {
				return false;
			});
			(typeof data.absMid).should.be.eql('undefined');
			(typeof data.absMidAliases).should.be.eql('undefined');

			// shouldn't blow up if absMidAliaes is missing
			data = {};
			data.absMid = "a";
			plugin.filterAbsMids(data, () => {
				return true;
			});
			data.absMid.should.be.eql("a");
			data.absMidAliases.length.should.be.eql(0);
		});
	});

	describe("processAbsMidQueryArgs tests", function() {
		it("Should parse no-arg requests properly", function() {
			var data = {};
			data.request = "foo/bar";
			plugin.processAbsMidQueryArgs(data);
			(typeof data.absMid).should.be.eql('undefined');
			(typeof data.absMidAliases).should.be.eql('undefined');
		});
		it("Should parse request with single absMid properly", function() {
			var data = {};
			data.request = "./bar?absMid=foo/bar";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("./bar");
			data.absMid.should.be.eql("foo/bar");
			data.absMidAliases.length.should.be.eql(0);
		});
		it("Should parse request with multple absMids and other args properly", function() {
			var data = {};
			data.request = "moduleA?q=123&absMid=test/a&id=456&absMid=foo/a";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA?q=123&id=456");
			data.absMid.should.be.eql("test/a");
			data.absMidAliases.length.should.be.eql(1);
			data.absMidAliases[0].should.be.eql("foo/a");
		});
		it("Should parse requests with no absMid args properly", function() {
			var data = {};
			data.request = "moduleA?q=123&s=abc";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA?q=123&s=abc");
			(typeof data.absMid).should.be.eql('undefined');
			(typeof data.absMidAliases).should.be.eql('undefined');
		});
		it("Should parse requests with absMid args in multiple plugin segments", function() {
			var data = {};
			data.request = "moduleA?absMid=a!moduleB!moduleC?absMid=c!moduleD?q=123";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA!moduleB!moduleC!moduleD?q=123");
			data.absMid.should.be.eql("a");
			data.absMidAliases.length.should.be.eql(1);
			data.absMidAliases[0].should.be.eql("c");
		});
	});

	describe("'add absMids from request event' tests", function() {
		it("should gracefully handle undefined data object", function(done) {
			try {
				callSync(factory, "addAbsMidsFromRequest");
				done();
			} catch (err) {
				done(err);
			}
		});
		it("should gracefully handle undefined data.dependencies object", function(done) {
			try {
				const data = {request: ""};
				callSync(factory, "addAbsMidsFromRequest", data);
				done();
			} catch (err) {
				done(err);
			}
		});
	});

	describe("'module' event tests", function() {
		it("Should gracefully handle missing absMidAliases in data object", function() {
			const module = {absMid: 'a'};
			const existing = {};
			compilation.findModule = function() { return existing; };
			const result = callSyncWaterfall(factory, "module", module);
			result.should.be.eql(module);
			(typeof result.addAbsMid).should.be.eql('function');
			(typeof result.filterAbsMids).should.be.eql('function');
			existing.absMid.should.eql('a');
			existing.absMidAliases.length.should.eql(0);
		});
	});

	describe("toAbsMid tests", function() {
		it("Should return undefined for undefined request", function() {
			(typeof plugin.toAbsMid()).should.be.eql('undefined');
		});
	});
});
