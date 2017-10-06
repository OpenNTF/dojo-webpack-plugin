define(["dojo/selector/_loader!"], function(selector) {
	it("should load selector/lite", function() {
		"dojo/selector/lite".should.be.eql(selector);
	});
});