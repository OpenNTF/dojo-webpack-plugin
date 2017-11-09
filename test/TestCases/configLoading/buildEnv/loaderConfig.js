require("should");
module.exports = function(env) {
	it("foopath should be defined in environment", function() {
		env.foopath.should.be.defined;
	});
	return {
		paths: {foo: env.foopath},
		aliases: [[/^fooalias$/, function() {return env.foopath;}]]
	};
};