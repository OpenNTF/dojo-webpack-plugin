define(["dojo/text!test/hello.txt"], function(hello) {
	it("should load text files" , function() {
		"hello".should.be.eql(hello);
	});
});
