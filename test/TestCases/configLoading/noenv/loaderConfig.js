require("should");
module.exports = function(env) {
	it("should have empty env", function() {
		Object.keys(env).length.should.be.eql(0);
	});
	return {
		paths: {foo: "/test/foo"},
		aliases: [[/^fooalias(\/.*)?$/, function(__, $1) {return "/test/foo" + $1;}]]
	};
};