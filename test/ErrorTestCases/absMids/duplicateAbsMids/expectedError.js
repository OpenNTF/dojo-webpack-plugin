module.exports = {
	test: function(error) {
		return /Duplicate absMid/.test(error.message);
	}
};