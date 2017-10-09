var path = require("path");
var webpack = require("webpack");
var DojoWebpackPlugin = require("../../../../index");

module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		}),
		new webpack.NormalModuleReplacementPlugin(
			/^addHeaderPlugin!/, function(data) {
				var match = /^addHeaderPlugin!(.*)$/.exec(data.request);
				data.request = "dojo/loaderProxy?loader=./addHeaderPlugin&deps=dojo/text%21" + match[1] + "!" + match[1];
			}
		)	]
};
