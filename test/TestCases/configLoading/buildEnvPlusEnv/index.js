define(["foo"], function(foo) {
	it ("should load foo", function() {
		foo.should.be.eql("foo");
	});
	it ("Should not resolve foo as defined by environment", function() {
		(typeof require.rawConfig.paths.foo === 'undefined').should.be.true;
	});
});