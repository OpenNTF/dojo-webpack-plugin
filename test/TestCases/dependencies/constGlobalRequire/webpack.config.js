var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	context: path.resolve(__dirname, "globalContext"),
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				baseUrl: "../",
				paths:{test: "."}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js"),
			cjsRequirePatterns: [/subdir/]
		})
	]
};
