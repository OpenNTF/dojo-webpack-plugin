const {tap} = require("./pluginHelper");
const ConcatSource = require("webpack-sources").ConcatSource;

module.exports = class ScopedRequirePlugin {
	apply(compiler) {
		tap(compiler, {"compilation": compilation => {
			tap(compilation.mainTemplate, {"dojoGlobalRequire": () => {
				return "";	// don't set global require
			}});

			tap(compilation.moduleTemplates.javascript, {"render": (source, module) => {
				var result = source;
				if (module.isAMD) {
					// Define a module scoped 'require' variable for AMD modules that references the
					// the Dojo require function.
					result = new ConcatSource();
					result.add("var require = __webpack_require__.dj.r;");
					result.add(source);
				}
				return result;
			}});
		}});
	}
};