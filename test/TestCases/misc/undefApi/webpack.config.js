var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'dojo-undef-api': true},
				testCase: "config object"
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: function() {
				return {
					paths:{test: "."},
					has: {'dojo-undef-api': true},
					testCase: "config function"
				};
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: path.join(__dirname,"loaderConfig"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: path.join(__dirname,"loaderConfigFn"),
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
