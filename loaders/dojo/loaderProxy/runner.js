module.exports = function(loader, name, req) {
	var result, resultSet;
	loader.load(name,  req, function(data) {
		result = data;
		resultSet = true;
	}, {isBuild:true});

	if (!resultSet) {
		throw new Error(name + ' unavailable');
	}
};
