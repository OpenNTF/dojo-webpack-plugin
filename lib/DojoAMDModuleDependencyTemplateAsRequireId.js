ModuleDependencyTemplateAsRequireId = require('webpack/lib/dependencies/ModuleDependencyTemplateAsRequireId');

function DojoAMDModuleDependencyTemplateAsRequireId() {
	ModuleDependencyTemplateAsRequireId.apply(this, arguments);
} 

module.exports = DojoAMDModuleDependencyTemplateAsRequireId;

DojoAMDModuleDependencyTemplateAsRequireId.prototype = Object.create(ModuleDependencyTemplateAsRequireId.prototype);
DojoAMDModuleDependencyTemplateAsRequireId.prototype.constructor = DojoAMDModuleDependencyTemplateAsRequireId;

DojoAMDModuleDependencyTemplateAsRequireId.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	if(!dep.range) return;
	var expr, content, comment = "";
	if (dep.request === "require") {	// context require
		if(outputOptions.pathinfo) comment = "/*! " + dep.issuerModule.absMid + " */ ";
		content = "__webpack_require__.dj.c(" + comment + JSON.stringify(dep.issuerModule.id) + ")";
		source.replace(dep.range[0], dep.range[1] - 1, content);
		return;
	}
	if (!dep.featureExpression) {
		return ModuleDependencyTemplateAsRequireId.prototype.apply.apply(this, arguments);
	}
	if(outputOptions.pathinfo) comment = "/*! " + dep.originalRequest + " */ ";
	try {
		// replace the %%# positional arguments in the feature expression with the corresponding module ids from the 
		// dependencies array.
		expr = dep.featureExpression.replace(/%%(\d+)/g, function(match, p) {
			var module = dep.featureDeps[p].module;
			if (module) {
				return module.id;
			} else {
				throw new Error(dep.featureDeps[p].request);
			}
		});
	} catch (err) {
		content = comment + require("./WebpackMissingModule").module(err.message);
	}
	if (expr && !content) {
		 content = "__webpack_require__.dj.h(" + comment + "\"" + expr + "\")";
	}
	source.replace(dep.range[0], dep.range[1] - 1, content);
}

