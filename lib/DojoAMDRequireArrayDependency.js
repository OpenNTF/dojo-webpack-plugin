/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Dependency = require("webpack/lib/Dependency");

function DojoAMDRequireArrayDependency(depsArray, range) {
	Dependency.call(this);
	this.depsArray = depsArray;
	this.range = range;
}
module.exports = DojoAMDRequireArrayDependency;

DojoAMDRequireArrayDependency.prototype = Object.create(Dependency.prototype);
DojoAMDRequireArrayDependency.prototype.constructor = DojoAMDRequireArrayDependency;
DojoAMDRequireArrayDependency.prototype.type = "amd require array";

DojoAMDRequireArrayDependency.Template = function DojoAMDRequireArrayDependencyTemplate() {};

DojoAMDRequireArrayDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var content = "[" + dep.depsArray.map(function(dep) {
		var comment = "";
		if(typeof dep === "string") {
			return dep;
		} else if (dep.request === "require") {
			if(outputOptions.pathinfo) comment = "/*! " + dep.issuerModule.absMid + " */ ";
			return "__webpack_require__.dj.c(" + comment + JSON.stringify(dep.issuerModule.id) + ")";
		} else if (dep.featureExpression) {
			var expr, result;
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
				return comment + require("./WebpackMissingModule").module(err.message);
			}
			return "__webpack_require__.dj.h(" + comment + "\"" + expr + "\")";
		} else {	
			if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
			if(dep.module)
				return "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ")";
			else
				return require("./WebpackMissingModule").module(dep.request);
		}
	}).join(", ") + "]";
	source.replace(dep.range[0], dep.range[1] - 1, content);
};
