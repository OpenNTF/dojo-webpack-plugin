var path = require("path");
var loaderUtils = require("loader-utils");
module.exports = function(content) {
	this.cacheable && this.cacheable();
	var query = loaderUtils.parseQuery(this.query);
	var loader = query.loader;
	if (!loader) {
		throw new Error("No loader specified");
	}
	var segments = this._module.absMid.split("!");
	var name = segments[segments.length-1];
	var deps = query.deps ? query.deps.split(",") : [];
	var issuer = this._module.issuer;
	if (issuer) {
		issuerAbsMid = this._compilation.findModule(issuer).absMid;
	}
	if (!issuerAbsMid) {
		issuerAbsMid = this._module.absMid || "";
	}
	var buf = [];
	buf.push("define([\"" + loader + "\"");
	deps.forEach(function(dep) {
		buf.push(",\"" + decodeURIComponent(dep) + "\"")
	});
	buf.push("], function(loader) {");
	buf.push("require(\"" + path.join(__dirname, "runner.js") + "\")(");
	buf.push("\tloader,");
	buf.push("\t\"" + name + "\",");
	buf.push("\t__webpack_require__.djr(\"" + issuerAbsMid + "\")");
	buf.push(");");
	buf.push("});");
	return buf.join("\n");
};