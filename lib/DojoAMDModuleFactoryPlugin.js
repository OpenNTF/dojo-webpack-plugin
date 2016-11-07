var NormalModule = require("webpack/lib/NormalModule");
var path = require("path");

function DojoAMDModuleFactoryPlugin(options, dojoRequire) {
	this.options = options;
	this.dojoRequire = dojoRequire
}
module.exports = DojoAMDModuleFactoryPlugin;

DojoAMDModuleFactoryPlugin.prototype.apply = function(compiler) { 
	var dojoRequire = this.dojoRequire;
	var options = this.options;

	function resolveTernaryHasExpression(request) {
		var match = /^[^!]*\/has!(.+)$/.exec(request);
		if (!match) {
			return request;
		}
		// The following code courtesy of dojo/has.js
		var tokens = match[1].match(/[\?:]|[^:\?]*/g), i = 0;
		var get = function(skip){
			var term = tokens[i++];
			if(term == ":"){
				// empty string module name, resolves to 0
				return 0;
			}else{
				// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
				if(tokens[i++] == "?"){
					if(dojoRequire.has(term)){
						// matched the feature, get the first value from the options
						return get();
					}else{
						// did not match, get the second value, passing over the first
						get(true);
						return get(skip);
					}
				}
				// a module
				return term || 0;
			}
		};
		return get();
	}
	
	compiler.plugin("normal-module-factory", function(factory) {
		factory.plugin("before-resolve", function(data, callback) {
			if (!data) return callback;
			if (data.dependency.issuerModule) {
				// dojo/has loader plugin syntax is not compatible with webpack loader syntax, so need
				// to evaluate dojo/has loader conditionals here
				data.rawRequest = data.request;
				data.request = resolveTernaryHasExpression(data.request);
	
				var segments = [];
				if (data.request) {
					data.request.split("!").forEach(function(segment) { 
						segments.push(dojoRequire.toAbsMid(segment, {mid: data.dependency.issuerModule.absMid}));
					});
					data.request = data.absMid = segments.join("!");
					data.absMidAliases = [];
				}
				if (!data.request || /!$/.test(data.request)) {
					data.request = (data.request || "") + path.join(__dirname, "./NoModule.js");
				}
			}
			return callback(null, data);
		});	
		
		factory.plugin("resolver", function(resolver) {
			return function(data, callback) {
				return resolver(data, function(err, result) {
					if (result && data.absMid) {
						result.absMid = data.absMid;
						result.absMidAliases = data.absMidAliases;
						result.rawRequest = data.rawRequest;
					}
					callback(err, result);
				});
			}
		});
		
		factory.plugin("create-module", function(data) {
			var module =  new NormalModule(
				data.request,
				data.userRequest,
				data.rawRequest,
				data.loaders,
				data.resource,
				data.parser
			);
			if (data.absMid) {
				module.absMid = data.absMid;
				module.absMidAliases = data.absMidAliases;
			}
			return module;
		});
	});		
};
