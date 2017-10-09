module.exports = {
	test: function(error) {
		return /Command failed:/.test(error.message);
	}
};