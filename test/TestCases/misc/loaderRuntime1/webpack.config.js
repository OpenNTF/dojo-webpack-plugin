var path = require("path");
var webpack = require("webpack");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: {
		app: "./index"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require("./loaderConfig"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		}),
		new webpack.optimize.RuntimeChunkPlugin({name:"runtime"})
	],
	optimization: {
		splitChunks: false
	}
};
