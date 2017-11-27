var path = require("path");
var webpack = require("webpack");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [
	require("./loaderConfig"),
	require.resolve("./loaderConfig")
].map(config => {
	return {
		entry: {
			app: "./index"
		},
		output: {
			filename: "app.js"
		},
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: config,
				loader: path.join(__dirname, "../../../js/dojo/dojo.js")
			}),
			new webpack.optimize.CommonsChunkPlugin({
				name: "vendor",
				filename: "vendor.js",
				minChunks: Infinity
			})
		]
	};
});
