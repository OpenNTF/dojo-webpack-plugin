define(["dojo/query!css2"], function(engine) {
	it("should load the specified selector engine" , function() {
		"css2".should.be.eql(engine);
	});
});
