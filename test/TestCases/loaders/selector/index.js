define(["dojo/selector/_loader!"], function(selector) {
	it("should load selector/lite", function() {
		"dojo/selector/lite".should.be.eql(selector);
		require("dojo/selector/_loader!").should.be.eql(selector);
		require("dojo/selector/lite").should.be.eql(selector);
	});
});
