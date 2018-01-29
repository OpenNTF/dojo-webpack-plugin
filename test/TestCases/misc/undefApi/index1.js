define(["should", "require", "./a"], function(should, require, a) {
	it("should successfully undefine the module and then load it again", function(done) {
		a.label.should.be.eql("a");
		require("./a").should.be.eql(a);
		require.undef("./a");
		try {
			require("./a");
			should.fail("Shouldn't get here");
		} catch (e) {}
		require(["./a"], function(_a) {
			a.should.be.eql(_a);
			(a === _a).should.be.false;
			done();
		});
	});
});
