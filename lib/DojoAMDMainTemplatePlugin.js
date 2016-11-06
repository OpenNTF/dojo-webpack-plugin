var path = require('path');

function DojoAMDMainTemplatePlugin(options) {
	this.options = options;
}

module.exports = DojoAMDMainTemplatePlugin;

DojoAMDMainTemplatePlugin.prototype.apply = function(compilation, params) {
	var options = this.options;
	function toUrl(name, referenceModule) {
		return loaderScope.require.toUrl(name, {mid:referenceModule});
	}
	
	function toAbsMid(name, referenceModule) {
		return loaderScope.require.toAbsMid(name, {mid:referenceModule});
	}
	
	function createContextRequire(module) {
		if (!module) return req;
		var result = function(a1, a2, a3) {
			return contextRequire(a1, a2, a3, module);
		};
		for (var p in req) {
			if (req.hasOwnProperty(p)) {
				result[p] = req[p];
			}
		}
		result.toUrl = function(name) {
			return toUrl(name, module);
		}
		result.toAbsMid = function(name) {
			return toAbsMid(name, module);
		}
		return result;
	}
	
	function findModule(mid, referenceModule) {
 		var isRelative = mid.charAt(0) === '.';
 		if(/(^\/)|(\:)|(\.js$)/.test(mid) || (isRelative && !referenceModule)){
 			throw new Error('Unsupported URL: ' + mid);
 		}
 		var mid = loaderScope.require.toAbsMid(mid, referenceModule);
 		
 		var result;
 		if (mid in req.modules) {
 	 		result = __webpack_require__(req.modules[mid]);
 		}
 		if (!result) {
 			throw new Error('Module not found: ' + mid);
 		}
 		return result;
	}
	
	function dojoModuleFromWebpackModule(webpackModule, name) {
		var dojoModule = Object.create(webpackModule);
		dojoModule.id = name;
		return dojoModule;
	}
	
	function contextRequire(a1, a2, a3, referenceModule) {
		var type = ({}.toString).call(a1);
		if (type === '[object String]') {
 			return findModule(a1, referenceModule);
		} else if (type === '[object Object]') {
 			throw new Error('Require config is not supported by WebPack');
 		}
 		if (type === '[object Array]') {
 			var modules = [], callback = a2;
 			a1.forEach(function(mid) {
 				modules.push(findModule(mid, referenceModule));
 			});
 			callback.apply(this, modules);
 		} else {
 			throw new Error('Unsupported require call');
 		}
	}
		
	compilation.mainTemplate.plugin("bootstrap", function(source, chunk, hash) {
		var buf = [];
		buf.push(source);
		buf.push("")
		buf.push("// Dojo loader compatibility functions")
		buf.push(toUrl.toString());
		buf.push(toAbsMid.toString());
		buf.push("");
		buf.push(createContextRequire.toString());
		buf.push("// dojo require function");
		buf.push("var req = function(config, dependencies, callback) {");
		buf.push(this.indent("contextRequire(config, dependencies, callback, 0);"));
		buf.push(this.indent("return req;"));
		buf.push("};");
		buf.push("");
		buf.push(findModule.toString());
		buf.push("");
		buf.push(contextRequire.toString());
		buf.push("");
		buf.push(dojoModuleFromWebpackModule.toString());
		buf.push("");
		buf.push("req.toUrl = toUrl;");
		buf.push("req.toAbsMid = toAbsMid;");
		buf.push("");
		buf.push("req.modules = {");
		var lastEntry = 0;
		compilation.chunks.forEach(function(chunk, i) {
			buf.push("// chunk " + i);
			chunk.modules.forEach(function(module) {
				if (module.absMid) {
					if (lastEntry) {
						buf[lastEntry] += ",";
					}
					buf.push("\t'" + module.absMid + "':" + JSON.stringify(module.id));
					lastEntry = buf.length-1;
				} else {
					buf.push("\t// " + module.rawRequest + " = " + JSON.stringify(module.id));
				}
			});
		});
		buf.push("};");
		buf.push("req.async = 1;");
		buf.push("(function(){ // Ensure this refers to global scope");
		buf.push(this.indent("this.require = req;"));
		buf.push("})();");
		return this.asString(buf);
	});
	
	compilation.mainTemplate.plugin("require-extensions", function(source, chunk, hash) {
		var buf = [];
		buf.push(source);
		buf.push("");
		buf.push("// expose the Dojo compatibility functions as a properties of " + this.requireFn);
		buf.push(this.requireFn + ".djr = createContextRequire;");
		buf.push(this.requireFn + ".djm = dojoModuleFromWebpackModule;");
		buf.push("var loaderScope = {};");
		var dojoLoaderModule = compilation.findModule(require.resolve(options.loader));
		if (!dojoLoaderModule) {
			throw Error("Can't locate " + options.loader + " in compilation");
		}
		buf.push("var global = (function(){return this;})();");
		buf.push("global.dojoConfig = global.dojoConfig || {};");
		buf.push("var loaderConfig = " + JSON.stringify(options.loaderConfig));
		buf.push("for (var p in loaderConfig) global.dojoConfig[p] = loaderConfig[p];");
		buf.push("var dojoLoader = __webpack_require__(" + JSON.stringify(dojoLoaderModule.id) + ");");
		buf.push("dojoLoader.call(loaderScope, global.dojoConfig, {hasCache:{'dojo-config-api':1, 'dojo-inject-api':1}});");
		buf.push("req.has = loaderScope.require.has;");
		buf.push("req.rawConfig = loaderScope.require.rawConfig");
		buf.push("");
		return this.asString(buf);
	});
};