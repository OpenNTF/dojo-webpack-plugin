define(["foo"], function(foo) {
	it ("should load foo", function() {
		foo.should.be.eql("foo");
	});

	it ("Should resolve foo as defined by environment", function() {
		require.toUrl("foo").should.be.eql("test/foo");
	});
});