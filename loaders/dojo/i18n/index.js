
var loaderUtils = require("loader-utils");

module.exports = function(content) {
	
	this.cacheable && this.cacheable();

	// Returns the locales that are enabled in bundle which match the requested locale
	// A locale matches the requested locale if it is the same, or more specific than
	// the requested locale.  For example if the requested locale is en, then bundle
	// locales en, en-us and en-uk will all match.
	function getAvailableLocales(requestedLocale, bundle) {
		var result = [];
		for (var locale in bundle) {
			if (locale === requestedLocale || locale.indexOf(requestedLocale) === 0 && requestedLocale.charAt(locale.length) === '-') {
				if (bundle[locale]) {
					result.push(locale);
				}
			}
		}
		return result;
	}
	
	function define(innards) {
		return innards;
	}
	var bundle = eval(content);
	var absMid;
	var query = loaderUtils.parseQuery(this.query);
	// See if the normalized name was provided in the query string
	if ("name" in query) {
		absMid = query.name;
	}
	var res = this._module.request.replace(/\\/g, "/");
	var segments = res.split("!");
	if (segments) {
		res = segments[segments.length-1];
	}
	if (!absMid && this._module.absMid) {
		// Fix up absMid to remove loader 
		segments = this._module.absMid.split("!");
		if (segments) {
			absMid = segments[segments.length-1];
		}
	}
	this._module.absMid = absMid;
	
	// Determine if this is the default bundle or a locale specific bundle
	var buf = [], regex = /^(.+)\/nls\/([^/]+)\/?(.*)$/;
	var match = regex.exec(res);
	if (match && absMid) {
		var path = match[1], locale, file;
		if (!match[3]) {
			file = match[2];
		} else {
			locale = match[2];
			file = match[3]
		}
		if (!locale) {
			// this is the default bundle.  Add any locale specific bundles that match the 
			// requested locale.  Default bundles specify available locales
			match = regex.exec(absMid);
			var normalizedPath = match[1];
			var normalizedFile = match[2];
			var requestedLocales = this._compilation.options.DojoAMDPlugin && this._compilation.options.DojoAMDPlugin.locales || [];
			requestedLocales.forEach(function(requestedLocale) {
				var availableLocales = getAvailableLocales(requestedLocale, bundle);
				availableLocales.forEach(function(locale) {
					buf.push("require(\"" + __filename.replace(/\\/g, "/") + "?name=" + normalizedPath + "/nls/" + locale + "/" + normalizedFile + "!" + path + "/nls/" + locale + "/" + file + "\");\n");
				});
			});
			
		}
	}
	
	this._module.isAMD = true;
	buf.push("module.exports = " + JSON.stringify(bundle));
	return buf.join("\n");
}

module.exports.seperable = true;
