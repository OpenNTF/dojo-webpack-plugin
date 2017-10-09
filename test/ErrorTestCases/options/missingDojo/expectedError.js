module.exports = {
	test: function(error) {
		return /dojo package not defined in loader config/.test(error.message);
	}
};