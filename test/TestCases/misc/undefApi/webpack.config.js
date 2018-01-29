var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'dojo-undef-api': true}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index2",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'dojo-undef-api': false}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
}];
