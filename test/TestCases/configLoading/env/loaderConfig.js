require("should");
module.exports = function(env) {
	it("env should specify fooptah", function() {
		env.foopath.should.be.eql("test/foo");
	});
	return {
		paths: {foo: env.foopath}
	};
};