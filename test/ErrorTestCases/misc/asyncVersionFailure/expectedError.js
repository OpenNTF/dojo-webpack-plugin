const major = parseInt(require("webpack/package.json").version.split('.')[0]);
const result = {};
if (major < 4) {
	result.test = function(error) {
		return /Async mode require webpack 4\.28 or greater/.test(error.message);
	};
}
module.exports = result;