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
	var buf = [];
	var runner = require.resolve("./runner.js").replace(/\\/g, "/");
	buf.push("define([\"" + loader + "\", \"" + runner + "\"");
	deps.forEach(function(dep) {
		buf.push(",\"" + decodeURIComponent(dep) + "\"")
	});
	buf.push("], function(loader, runner) {");
	buf.push("runner(");
	buf.push("\tloader,");
	buf.push("\t\"" + name + "\",");
	buf.push("\t__webpack_require__.dj.c(" + JSON.stringfy(this._module.issuer.id) + ")");
	buf.push(");");
	buf.push("});");
	return buf.join("\n");
};