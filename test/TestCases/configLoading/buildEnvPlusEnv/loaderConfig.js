require("should");
module.exports = function(env) {
	return {
		paths: {foo: env.foopath},
		aliases: [[/^fooalias$/, function() {return env.foopath;}]]
	};
};