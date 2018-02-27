define(["require", "test/a"], function(require, a) {
	it("should compile", function(done) {
		done();
	});
	it("should load the module specified as a variable", function(done) {
		a.should.be.eql("a");
		var avar = "test/a";
		var count = 2;
		require([avar, "test/b"], function(_a, b) {
			(a === _a).should.be.true();
			b.b.should.be.eql("b");
			b.a.should.be.eql("a");
			if (--count === 0) done();
		});
		avar = "./a";
		require([avar, "./b"], function(_a, b) {
			(a === _a).should.be.true();
			b.b.should.be.eql("b");
			b.a.should.be.eql("a");
			if (--count === 0) done();
		});
	});
});