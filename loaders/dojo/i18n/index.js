/*
 * (C) Copyright IBM Corp. 2012, 2016 All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var loaderUtils = require("loader-utils");
module.exports = function(content) {
	
	this.cacheable && this.cacheable();

	// Returns the locales that are enabled in bundle which match the requested locale
	// A locale matches the requested locale if it is the same, or less specific than
	// the requested locale.  For example if the requested locale is en-us, then bundle
	// locales en and en-us match.
	function getAvailableLocales(requestedLocale, bundle) {
		var result = [], parts = requestedLocale.split("-"); 
		for (var current = "", i = 0; i < parts.length; i++) {
			current += (current ? "-" : "") + parts[i];
			if(current in bundle){
				result.push(current);
			}
		}
		return result;
	}
	
	var bundle = (function() {
		var result;
		function define(arg1, arg2) {
			if (!arg2) {
				result = arg1;
			} else {
				if (arg1.length !== 0) {
					throw new Error("define dependencies not supported in langauge files!");
				}
				result = arg2(); // call factory function
			}
		}
		define.amd = true;
		eval(content);
		return result;
	})();

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
	this._module.absMid = "dojo/i18n!" + absMid;
	
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
					var name = normalizedPath + "/nls/" + locale + "/" + normalizedFile;
					buf.push("require(\"" + name + "?absMid=" + name + "\");");
				});
			});
			
		}
	}
	var runner = require.resolve("./runner.js").replace(/\\/g, "/");
	var issuer = this._module.issuer;
	if (issuer) {
		issuerAbsMid = this._compilation.findModule(issuer).absMid;
	}
	if (!issuerAbsMid) {
		issuerAbsMid = this._module.absMid || "";
	}

	buf.push("require(\"" + absMid + "?absMid=" + absMid + "\");");
	buf.push("module.exports = require(\"" + runner + "\")(\"" + absMid + "\");");
	return buf.join("\n");
}

module.exports.seperable = true;
