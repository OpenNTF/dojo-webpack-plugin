define(["require"], function(req) {
	it("should load the resource name as the content", function(done) {
		req(["test/asyncPlugin!foo/content.txt", "test/asyncPlugin!./content.txt", "test/asyncPlugin!", "test/thenableResult", "dep"], function(content1, content2, content3, thenableResult, dep) {
			"Name = foo/content.txt".should.be.eql(content1);
			"Name = ./content.txt".should.be.eql(content2);
			"Name = ".should.be.eql(content3);
			(typeof thenableResult.then).should.be.eql('function');
			(typeof dep.then).should.be.eql('function');
			done();
		});
	});
});
