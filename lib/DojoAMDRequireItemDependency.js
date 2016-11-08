var path = require("path");
var ModuleDependency = require("webpack/lib/dependencies/ModuleDependency");

function DojoAMDRequireItemDependency(request, issuerModule, props, range) {
	var deps = [];
	var resolved = resolveTernaryHasExpression(request, deps, props);
	this.originalRequest = request;
	if (!resolved) {
		// feature expression evaluation resulted in no module
		request = path.join(__dirname, "./NoModule.js");
	} else if (deps.length === 0) {
		// feature expression evaluation resulted in a single module, or there is no feature expression
		request = resolved;
	} else {
		// There are undefined feature names in the expression, so we need to evaluate the expression
		// on the client at run-time.  Add dependencies for each of the modules involved in the
		// expression and save the simplified expression and the dependencies as properties on
		// this object.  The expression will be post-processed by the template using the module ids
		// of the dependencies after they have been resolved.
		request = path.join(__dirname, "./NoModule.js");
		this.featureExpression = resolved;
		var featureDeps = [];
		deps.forEach(function(dep) {
			var featureDep = new DojoAMDRequireItemDependency(dep, issuerModule);
			issuerModule.addDependency(featureDep);
			featureDeps.push(featureDep);
		});
		issuerModule.addDependency(new DojoAMDRequireItemDependency("dojo/has", issuerModule));
		this.featureDeps = featureDeps;
	}
	ModuleDependency.call(this, request);
	this.issuerModule = issuerModule;
	this.range = range;

}
module.exports = DojoAMDRequireItemDependency;

DojoAMDRequireItemDependency.prototype = Object.create(ModuleDependency.prototype);
DojoAMDRequireItemDependency.prototype.constructor = DojoAMDRequireItemDependency;
DojoAMDRequireItemDependency.prototype.type = "amd require";

DojoAMDRequireItemDependency.Template = require("./DojoAMDModuleDependencyTemplateAsRequireId");


/*
 * This function partially or fully resolves a dojo/has.js feature expression based on the currently
 * defined features.  If the request does not specify a feature expression, then the request is returned
 * unchanged.  Otherwise, if all of the features are defined, then a module name is returned or an empty
 * string is returned, depending on the result of the evaluation.  If any of the features is not 
 * defined (i.e. evaluating a feature name returns undefined), then this function will return
 * a simplified expression that contains only the undefined features, and with the module names
 * replaced with %%# tokens, where # is an index into the deps array for the dependency object
 * corresponding to the associated module.  The %%# tokens get replaced with the webpack module ids
 * for the resolved dependencies during application of this dependency object's template.
 * 
 * request - The request.  May contain dojo/has conditional expression
 * deps - On input, an empty array.  On output, contains the unresolved expression module dependencies
 * props - and object with options and require properties
 */
function resolveTernaryHasExpression(request, deps, props) {
	deps.length = 0;
	var isUnresolvedFeatures = false;
	var match = /^[^!]*\/?has!(.+)$/.exec(request);
	if (!match) {
		return request;
	}
	// Adapted from code in dojo/has.js
	var tokens = match[1].match(/[\?:]|[^:\?]*/g), i = 0;
	var get = function(result, skip){
		var termIndex = i;
		var term = tokens[i++];
		if(term == ":"){
			// empty string module name, resolves to empty string
			return result;
		}else{
			// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
			if(tokens[i++] == "?"){
				var value = props.require.has(term);
				if (typeof value !== 'undefined' || props.options.coerceUndefinedToFalse) {
					if(!skip && value){
						// matched the feature, get the first value from the options
						result += get(result);
						get("", true);
						return result;
					}else{
						// did not match, get the second value, passing over the first
						get("", true);
						return result + get(result, skip);
					}
				} else {
					isUnresolvedFeatures = true;
					var trueResult = get(result,skip);
					var falseResult = get(result,skip);
					return result + term + "?" + trueResult + (falseResult ? (":" + falseResult) : "");
				}
			}
			// a module
			if (term && !skip) {
				deps.push(term);
				result += ("%%" + (deps.length-1))
			}
			return result;
		}
	};
	var result =  get("");
	if (!isUnresolvedFeatures) {
		result = deps[0] || "";
		deps.length = 0;
	}
	return result;
}
