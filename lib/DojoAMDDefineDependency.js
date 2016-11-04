/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ReplaceSource = require("webpack-core/lib/ReplaceSource");
var AMDDefineDependency = require("webpack/lib/dependencies/AMDDefineDependency");

function DojoAMDDefineDependency(range, arrayRange, functionRange, objectRange) {
	AMDDefineDependency.apply(this, arguments);
}
module.exports = DojoAMDDefineDependency;

DojoAMDDefineDependency.prototype = Object.create(AMDDefineDependency.prototype);
DojoAMDDefineDependency.prototype.constructor = DojoAMDDefineDependency;
DojoAMDDefineDependency.prototype.type = "amd define";

DojoAMDDefineDependency.Template = function DojoAMDDefineDependencyTemplate() {};

/*
 * Dojo calls module define functions using global scope, but webpack specifies the exports 
 * object as the scope.  The following code fixes up the applied template result to replace
 * the exports scope with the global scope for invoking the define function.
 */
DojoAMDDefineDependency.Template.prototype.apply = function(dep, source) {
	AMDDefineDependency.Template.prototype.apply.call(this, dep, source);
	if (dep.functionRange) {
		var method = dep.arrayRange ? "apply" : "call";
		var searchText = "." + method + "(exports,";
		var replaceText = "." + method + "((function(){})(),"
		source.replacements.forEach(function(replacement) {
			replacement[2] = replacement[2].replace(searchText, replaceText);
		})
	}
};
