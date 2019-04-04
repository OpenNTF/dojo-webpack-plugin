/*
 * (C) Copyright HCL Technologies Ltd. 2018, 2019
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
const loaderUtils = require("loader-utils");
const {callSyncBail} = require("webpack-plugin-compat");

module.exports = function() {
	const dojoRequire = callSyncBail(this._compiler, "get dojo require");
	const issuerAbsMid = this._module.issuer && this._module.issuer.absMid || this._module.absMid || "";

	function toAbsMid(mid) {
		let notAbsMid = false;
		const absMid = mid.split("!").map(part => {
			const a = part.split('?');
			a[0] = dojoRequire.toAbsMid(a[0], {mid:issuerAbsMid});
			notAbsMid = notAbsMid || /^[./\\]/.test(a[0]) || path.isAbsolute(a[0]);
			return a.join('?');
		}).join('!');
		return notAbsMid ? null : absMid;
	}
	function encode(uri) {
		return uri.replace(/[!?&]/g, match => '%' + match.charCodeAt(0).toString(16));
	}

	function decode(url) {
		return url.replace(/%[0-9A-Fa-f]{2}/g, match => {
			const code = parseInt(match.substring(1), 16);
			return (code === 0x21 || code === 0x3F) ? String.fromCharCode(code) : match;
		});
	}

	this.cacheable && this.cacheable();
	const query = this.query ? loaderUtils.parseQuery(this.query) : {};
	const loader = query.loader;
	if (!loader) {
		throw new Error("No loader specified");
	}
	let name = query.name;
	if (!name) {
		if (this._module.absMid) {
			name = this._module.absMid.split("!").pop();
		} else {
			throw new Error(`Dojo Loader Proxy error: No absMid for module ${this._module.request}
 requested with ${this._module.rawRequest}.  Try using a non-relative or non-absolute module
 itentifier (e.g. myPackage/nls/strings.js) for the module or any of it's including modules,
 or else use the 'name' query arg.`);
		}
	}
	const loaderAbsMid = toAbsMid(loader);
	const nameAbsMid = toAbsMid(name);
	if (loaderAbsMid && nameAbsMid) {
		this._module.addAbsMid(`${loaderAbsMid}!${nameAbsMid}`);;
		this._module.filterAbsMids && this._module.filterAbsMids(absMid => {
			return !/loaderProxy/.test(absMid);
		});
	}

	const pluginOptions = callSyncBail(this._compiler, "dojo-webpack-plugin-options");
	const buf = [];
	const runner = require.resolve("../runner.js").replace(/\\/g, "/");
	const req  = `${this._compilation.mainTemplate.requireFn}.${pluginOptions.requireFnPropName}.c()`;

	// Get dependencies from query arg.  Note that we set the absMid for the dependency using the
	// absMid query arg in the request so that we'll be able to find the module at runtime using
	// the absMid name even if the module has been renamed by aliasing or the NormalModuleReplacement
	// plugin.
	const deps = (query.deps ? query.deps.split(",") : []).map(dep => {
		const absMid = toAbsMid(decode(dep));
		return dep + (absMid ? '?absMid=' + encode(absMid) : '');
	});

	buf.push(`define(["${loader}","${runner}","${deps.join("\",\"")}"], function(loader, runner) {`);
	buf.push(`   return runner(loader, "${name}", ${req}, ${(!!pluginOptions.async).toString()});`);
	buf.push('});');

	return buf.join("\n");
};