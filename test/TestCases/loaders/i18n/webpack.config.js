var path = require("path");
var DojoWebpackPlugin = require("../../../../index");

module.exports = [undefined, "en-us", "fr", "es", "de", "zh-hk"].map(locale => {
	return {
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					paths:{test: "."},
					has: {"host-browser": 0, "dojo-config-api": 1},
					locale: locale
				},
				locales: ["en", "fr", "es", "de"],
				loader: path.join(__dirname, "../../../js/dojo/dojo.js")
			})
		]
	};
});
