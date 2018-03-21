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
const path = require("path");
const i18nEval = require("../i18nEval");
const {callSyncBail} = require("../../../lib/pluginCompat");

module.exports = function(content) {
	this.cacheable && this.cacheable();

	// Returns the locales that are enabled in bundle which match the requested locale
	// A locale matches the requested locale if it is the same, or more/less specific than
	// the requested locale.  For example if the requested locale is en-us, then bundle
	// locales en and en-us and en-us-xyz all match.
	function getAvailableLocales(requestedLocale, bundle) {
		if (!bundle.root || typeof bundle.root !== 'object') {
			return [];
		}
		if (requestedLocale === "*") {
			return Object.keys(bundle).filter(locale => {
				return locale !== "root" && !!bundle[locale];
			});
		}
		var result = [], parts = requestedLocale.split("-");
		// Add root locales (less spcific) first
		for (var current = "", i = 0; i < parts.length; i++) {
			current += (current ? "-" : "") + parts[i];
			if(bundle[current]){
				result.push(current);
			}
		}
		// Add locales with greater specificity
		Object.keys(bundle).forEach(function(loc) {
			if (bundle[loc] && loc.startsWith(requestedLocale + "-")) {
				result.push(loc);
			}
		});
		return result;
	}

	var bundle = i18nEval(content);
	const dojoRequire = callSyncBail(this._compiler, "get dojo require");
	var absMid;
	var res = this._module.request.replace(/\\/g, "/").split("!").pop();
	if (this._module.absMid) {
		// Fix up absMid to remove loader
		absMid = this._module.absMid.split("!").pop();
	}
	if (!absMid && this._module.issuer.absMid) {
		// Fix up absMid to remove loader
		absMid = dojoRequire.toAbsMid(this._module.rawRequest.split("!").pop(), {mid:this._module.issuer.absMid});
	}
	if (!absMid) {
		const rawRequest = this._module.rawRequest.split("!").pop();
		if (!path.isAbsolute(rawRequest) && !rawRequest.startsWith('.')) {
			absMid = rawRequest;
		} else {
			absMid = res;
		}
	}
	this._module.absMid = this._module.absMid || "dojo/i18n!" + absMid;

	// Determine if this is the default bundle or a locale specific bundle
	const buf = [], regex = /^(.+)\/nls\/([^/]+)\/?(.*)$/;
	const resMatch = regex.exec(res);
	const pluginOptions = callSyncBail(this._compiler, "dojo-webpack-plugin-options");
	const requestedLocales = pluginOptions.locales;
	const bundledLocales = [];

	if (!resMatch) {
		throw new Error(`Unsupported resource path for dojo/i18n loader.  ${res} must be in an nls directory`);
	}
	var locale;
	if (resMatch[3]) {
		locale = resMatch[2];
	}
	if (!locale) {
		// this is the default bundle.  Add any locale specific bundles that match the
		// requested locale.  Default bundles specify available locales
		let absMidMatch = regex.exec(absMid);
		(requestedLocales || ["*"]).forEach(function(requestedLocale) {
			const availableLocales = getAvailableLocales(requestedLocale, bundle);
			availableLocales.forEach((loc) => {
				const localeRes = `${resMatch[1]}/nls/${loc}/${resMatch[2]}`;
				if (absMidMatch) {
					var localeAbsMid = `${absMidMatch[1]}/nls/${loc}/${absMidMatch[2]}`;
				}
				bundledLocales.push(loc);
				buf.push(`require("${localeRes}?absMid=${(localeAbsMid || localeRes)}");`);
			});
		});

	}
	const runner = require.resolve("./runner.js").replace(/\\/g, "/");
	const rootLocales = getAvailableLocales("*", bundle);

	if (rootLocales.length !== bundledLocales.length) {
		const locs = bundledLocales.toString().replace(/,/g,"|");
		buf.push(`require("dojo/i18nRootModifier?absMid=${absMid}&bundledLocales=${locs}!${absMid}");`);
	} else {
		buf.push(`require("${res}?absMid=${absMid}");`);
	}
	buf.push(`var req = ${this._compilation.mainTemplate.requireFn}.${pluginOptions.requireFnPropName}.c();`);
	buf.push(`module.exports = require("${runner}")("${absMid}", req);`);
	return buf.join("\n");
};

module.exports.seperable = true;
