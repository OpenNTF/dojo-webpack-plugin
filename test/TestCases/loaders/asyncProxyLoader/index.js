define(["require", "test/asyncPlugin!foo/content.txt", "test/asyncPlugin!./content.txt", "test/asyncPlugin!"], function(req, content1, content2, content3) {
	it("should load the resource name as the content", function(done) {
		"Name = foo/content.txt".should.be.eql(content1);
		"Name = ./content.txt".should.be.eql(content2);
		"Name = ".should.be.eql(content3);
		done();
	});
	it("should load using context runtime require", function(done) {
		var deps = [];
		deps.push("test/asyncPlugin!foo/content.txt");
		deps.push("test/asyncPlugin!./content.txt");
		deps.push("test/asyncPlugin!test/content.txt");
		deps.push("test/asyncPlugin!");
		req(deps, function(dep1, dep2, dep3, dep4) {
			"Name = foo/content.txt".should.be.eql(dep1);
			"Name = ./content.txt".should.be.eql(dep2);
			"Name = ./content.txt".should.be.eql(dep3);
			"Name = ".should.be.eql(dep4);
			done();
		});
	});
});
