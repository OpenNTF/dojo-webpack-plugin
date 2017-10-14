require("should");
module.exports = function(env) {
	return {
		paths: {foo: env.foopath}
	};
};