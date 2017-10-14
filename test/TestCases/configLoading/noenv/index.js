define([], function() {
	it ("Should resolve path as defined in loader config", function() {
		require.toUrl('foo/bar').should.be.eql("/test/foo/bar");
	});
});