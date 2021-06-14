module.exports = {
	test: function(error) {
		return /Please rebuild the embedded loader/.test(error.message);
	}
};