module.exports = function(name) {
	var result, resultSet;
	var loader = require("dojo/i18n?absMid=dojo/i18n");
	var req = __webpack_require__.dj.c();
	loader.load(name,  req, function(data) {
		result = data;
		resultSet = true;
	}, {isBuild:true});

	if (!resultSet) {
		throw new Error(name + ' unavailable');
	}
	return result;
};
