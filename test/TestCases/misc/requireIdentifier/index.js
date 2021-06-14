define([], function() {
	it("should access global require", function() {
		let req;
		req = require;
		(typeof req).should.be.eql('function');
		req.should.be.eql(window["require"]);
	});
});
