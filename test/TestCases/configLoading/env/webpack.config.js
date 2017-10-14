var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require.resolve("./loaderConfig"),
			environment: {foopath: "test/foo"},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
};
