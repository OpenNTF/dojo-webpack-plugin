define(["./subdir/a", "./subdir/b"], function(a, b) {
	it("should load dependency relative to module b", function(done) {
		b.loadc(function(c) {
			c.should.be.eql("test/subdir/c");
			done();
		});
	});
	it("should load dependency relative to baseUrl", function(done) {
		a.loadc(function(c) {
			c.should.be.eql("test/c");
			done();
		});
	});
});