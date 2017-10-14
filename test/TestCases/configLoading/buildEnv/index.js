define(["foo"], function(foo) {
	it ("should load foo", function() {
		foo.should.be.eql("foo");
	});
	it ("Should resolve foo as defined by environment", function() {
		require.rawConfig.paths.foo.should.be.eql("/foo");
	});
});