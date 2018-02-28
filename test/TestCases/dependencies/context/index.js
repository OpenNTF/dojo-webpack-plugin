define(["./subdir/a", "./subdir/b"], function(a, b) {
	it("should load dependency relative to module b", function(done) {
		try {
			b.loadc(function(c) {
				c.should.be.eql("test/subdir/c");
				done();
			});
		} catch(e) {
			done(e);
		}
	});
	it("should load dependency relative to baseUrl", function(done) {
		try {
			a.loadc(function(c) {
				c.should.be.eql("test/c");
				done();
			});
		} catch(e) {
			done(e);
		}
	});
});