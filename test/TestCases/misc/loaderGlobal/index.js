const should = require("should").default;
define(['dojo/has'], function(has) {
	var loaderGlobal;
	beforeAll(function() {
		has.add('foo', function(global) {
			loaderGlobal = global;
		}, true, true);
	});
	it("should define window and global properties on global object", function() {
		should(loaderGlobal).be.exactly(loaderGlobal.global);
		should(loaderGlobal).be.exactly(loaderGlobal.window);
	});
	it("should reflect global properties in loader global but no the other way around", function() {
		should(global.foo).be.undefined();
		should(loaderGlobal.foo).be.undefined();
		global.foo = "bar";
		global.foo.should.be.eql("bar");
		loaderGlobal.foo.should.be.eql("bar");
		loaderGlobal.foo = "baz";
		global.foo.should.be.eql("bar");
		loaderGlobal.foo.should.be.eql("baz");
	});
});