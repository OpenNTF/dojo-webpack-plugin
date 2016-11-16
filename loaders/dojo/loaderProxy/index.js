var path = require("path");
var loaderUtils = require("loader-utils");

module.exports = function(content) {
	this.cacheable && this.cacheable();
	var dojoRequire = this._compiler.applyPluginsBailResult("get dojo require");
	var query = loaderUtils.parseQuery(this.query);
	var loader = query.loader;
	if (!loader) {
		throw new Error("No loader specified");
	}
	var name = this._module.absMid.split("!").pop();
	var deps = query.deps ? query.deps.split(",") : [];
	var issuer = this._module.issuer;
	if (issuer) {
		issuerAbsMid = this._compilation.findModule(issuer).absMid;
	}
	if (!issuerAbsMid) {
		issuerAbsMid = this._module.absMid || "";
	}
	var buf = [];
	var runner = require.resolve("./runner.js").replace(/\\/g, "/");
	buf.push("var runner = require(\"" + runner + "\");");
	buf.push("var loader = require(\"" + loader + "?absMid=" + loader + "\");");
	deps.forEach(function(dep) {
		dep = decodeURIComponent(dep);
		dep = dep.split("!").map(function(segment) {
			return dojoRequire.toAbsMid(segment, issuerAbsMid);
		}).join("!");
		buf.push("require(\"" + dep + "?absMid=" + dep.replace(/\!/g, "%21") + "\");")
	});
	buf.push("module.exports = runner(loader,\"" + name + "\");");
	return buf.join("\n");
};