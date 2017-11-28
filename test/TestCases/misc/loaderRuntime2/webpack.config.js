var path = require("path");
var webpack = require("webpack");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: {
		app: "./index"
	},
	output: {
		filename: "app.js"
	},
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require.resolve("./loaderConfig"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		}),
		new webpack.optimize.CommonsChunkPlugin({
			name: "vendor",
			filename: "vendor.js",
			minChunks: Infinity
		})
	]
};
