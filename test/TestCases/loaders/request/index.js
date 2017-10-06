define([], function() {
	it("should compile", function(done) {
		require(["dep"], function() {
			done();
		});
	});
});
