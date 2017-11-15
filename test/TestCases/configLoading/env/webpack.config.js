var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require.resolve("./loaderConfig"),
			environment: {foopath: "test/foo"},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require("./loaderConfig"),
			environment: {foopath: "test/foo"},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			// Leaving console output enabled on one test case for code coverage
			// noConsole: true,
			loaderConfig: function(env) {
				return Object.assign(require("./loaderConfig")(env), {has:{'dojo-config-api':1}});
			},
			environment: {foopath: "test/foo"}
		})
	]
}];
