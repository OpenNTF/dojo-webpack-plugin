define(["foo", "fooalias", "dojo/_base/lang"], function(foo, fooalias) {
	it ("should load foo", function() {
		foo.should.be.eql("foo");
		fooalias.should.be.eql("foo");
	});
	it ("Should resolve foo as defined by environment", function() {
		require.toUrl("foo").should.be.eql("/foo");
	});
	it ("Should resolve dojo runtime path correctly", function() {
		require.toUrl("dojo/_base/lang").should.be.eql("release/dojo/_base/lang");
	});
});