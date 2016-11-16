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

	
	function toAbsMid(request, issuerAbsMid) {
		if (!request) return request;
		var segments = [];
		request.split("!").forEach(function(segment) { 
			segments.push(dojoRequire.toAbsMid(segment, issuerAbsMid ? {mid: issuerAbsMid} : null));
		});
		return segments.join("!");
	}
	
	compiler.plugin("normal-module-factory", function(factory) {
		factory.plugin("before-resolve", function(data, callback) {
			if (!data) return callback;
			var match = /^(.*)\?absMid=([^!]*)$/.exec(data.request);
			if (match && match.length === 3) {
				data.absMid = decodeURIComponent(match[2]);
				data.request = match[1];
			} else if (data.request === "require" || data.request === "module") {
				data.absMid = data.request;
				data.request = require.resolve("./NoModule").replace(/\\/g, "/");
			} else if (data.dependency.issuerModule) {
				// dojo/has loader plugin syntax is not compatible with webpack loader syntax, so need
				// to evaluate dojo/has loader conditionals here
				data.rawRequest = data.request;
				data.request = data.absMid = toAbsMid(data.request, data.dependency.issuerModule.absMid);
				data.absMidAliases = [];
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
