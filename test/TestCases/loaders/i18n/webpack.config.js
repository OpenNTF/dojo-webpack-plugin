var path = require("path");
var DojoWebpackPlugin = require("../../../../index");

module.exports = [undefined, "fr", "es", "de"].map(locale => {
	return {
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					paths:{test: "."},
					has: {"host-browser": 0, "dojo-config-api": 1}
				},
				locales: ["fr", "es", "de"],
				loader: path.join(__dirname, "../../../js/dojo/dojo.js"),
				locale: locale
			})
		]
	};
});
