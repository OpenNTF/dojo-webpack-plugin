const DojoAMDModuleFactoryPlugin = require("../lib/DojoAMDModuleFactoryPlugin");
const should = require("should");
const plugin = new DojoAMDModuleFactoryPlugin({});

class Factory {
	constructor() {
		this.events = [];
	}
	plugin(event, callback) {
		this.events[event] = callback;
	}
	addAbsMid(data, absMid) {
		return this.events["add absMid"](data, absMid);
	}
	applyPlugins(event) {
		this.events[event].apply(this, Array.prototype.slice.call(arguments, 1));
	}
};
plugin.apply({
	plugin: function(event, callback) {
		if (event === "normal-module-factory") {
			const factory = new Factory();
			callback(factory);
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
				it("Should throw if absMid is relative", function(done) {
					var data = {};
					try {
						plugin.addAbsMid(data, "./foo");
						should.fail("Error not thrown");
					} catch (e) {
						e.message.startsWith("Illegal absMid").should.be.true;
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

					data.absMid = "a";
					data.absMidAliases = ["b", "c"];
					plugin.filterAbsMids(data, absMid => {
						return absMid !== "b";
					});
					data.absMid.should.be.eql("a");
					data.absMidAliases.length.should.be.eql(1);
					data.absMidAliases[0].should.be.eql("c");

					data.absMid = "a";
					data.absMidAliases = ["b", "c"];
					plugin.filterAbsMids(data, absMid => {
						return absMid !== "c";
					});
					data.absMid.should.be.eql("a");
					data.absMidAliases.length.should.be.eql(1);
					data.absMidAliases[0].should.be.eql("b");

					data.absMid = "a";
					data.absMidAliases = ["b", "c"];
					plugin.filterAbsMids(data, () => {
						return false;
					});
					(typeof data.absMid).should.be.eql('undefined');
					(typeof data.absMidAliases).should.be.eql('undefined');
				});
			});

			describe("processAbsMidQueryArgs tests", function() {
				it("Should parse no-arg requests properly", function() {
					var data = {};
					data.request = "foo/bar";
					plugin.processAbsMidQueryArgs(factory, data);
					(typeof data.absMid).should.be.eql('undefined');
					(typeof data.absMidAliases).should.be.eql('undefined');
				});
				it("Should parse request with single absMid properly", function() {
					var data = {};
					data.request = "./bar?absMid=foo/bar";
					plugin.processAbsMidQueryArgs(factory, data);
					data.request.should.be.eql("./bar");
					data.absMid.should.be.eql("foo/bar");
					data.absMidAliases.length.should.be.eql(0);
				});
				it("Should parse request with multple absMids and other args properly", function() {
					var data = {};
					data.request = "moduleA?q=123&absMid=test/a&id=456&absMid=foo/a";
					plugin.processAbsMidQueryArgs(factory, data);
					data.request.should.be.eql("moduleA?q=123&id=456");
					data.absMid.should.be.eql("test/a");
					data.absMidAliases.length.should.be.eql(1);
					data.absMidAliases[0].should.be.eql("foo/a");
				});
				it("Should parse requests with no absMid args properly", function() {
					var data = {};
					data.request = "moduleA?q=123&s=abc";
					plugin.processAbsMidQueryArgs(factory, data);
					data.request.should.be.eql("moduleA?q=123&s=abc");
					(typeof data.absMid).should.be.eql('undefined');
					(typeof data.absMidAliases).should.be.eql('undefined');
				});
				it("Should parse requests with absMid args in multiple plugin segments", function() {
					var data = {};
					data.request = "moduleA?absMid=a!moduleB!moduleC?absMid=c!moduleD?q=123";
					plugin.processAbsMidQueryArgs(factory, data);
					data.request.should.be.eql("moduleA!moduleB!moduleC!moduleD?q=123");
					data.absMid.should.be.eql("a");
					data.absMidAliases.length.should.be.eql(1);
					data.absMidAliases[0].should.be.eql("c");
				});
			});
		}
	}
});
