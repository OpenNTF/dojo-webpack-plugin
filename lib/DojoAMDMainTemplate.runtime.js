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
 /* globals loaderScope __webpack_require__ installedModules */

module.exports = {
	main: function() {
		function mix(dest, src) { // eslint-disable-line no-unused-vars
			for(var n in src) dest[n] = src[n];
			return src;
		}

		function toUrl(name, referenceModule) {
			return loaderScope.require.toUrl(name, referenceModule);
		}

		function toAbsMid(name, referenceModule) {
			return loaderScope.require.toAbsMid(name, referenceModule);
		}

		// dojo require function");
		function req(config, dependencies, callback) {
			return contextRequire(config, dependencies, callback, 0, req);
		}

		function createContextRequire(moduleId) { // eslint-disable-line no-unused-vars
			if (typeof(moduleId) === "number") { // Number.isInteger does not work in IE
				moduleId = req.absMidsById[moduleId];
			}
			if (!moduleId) return req;
			var result = function(a1, a2, a3) {
				return contextRequire(a1, a2, a3, moduleId, req);
			};
			for (var p in req) {
				if (req.hasOwnProperty(p)) {
					result[p] = req[p];
				}
			}
			result.toUrl = function(name) {
				return toUrl(name, moduleId ? {mid: moduleId} : null);
			};
			result.toAbsMid = function(name) {
				return toAbsMid(name, moduleId ? {mid: moduleId} : null);
			};

			if (req.undef) {
				result.undef = function(mid) {
					req.undef(mid, moduleId);
				};
			}
			return result;
		}

		function registerAbsMids(absMids) { // eslint-disable-line no-unused-vars
			for (var s in absMids) {
				req.absMids[s] = absMids[s];
				req.absMidsById[absMids[s]] = s;
			}
		}

		function resolveTernaryHasExpression(expr) { // eslint-disable-line no-unused-vars
			// Expects an expression of the form supported by dojo/has.js loader, except that module identifiers are
			// integers corresponding to webpack module ids.  Returns a module reference if evaluation of the expression
			// using the currently defined features returns a module id, or else undefined.

			var has = req("dojo/has");
			var id = has.normalize(expr, function(arg){return arg;});
			return id && __webpack_require__(id) || undefined;
		}

		function findModule(mid, referenceModule, noInstall, asModuleObj) {
			mid = mid.split("!").map(function(segment) {
				var isRelative = segment.charAt(0) === '.';
				if(isRelative && !referenceModule){
					throw new Error('Unsupported URL: ' + mid);
				}
				return toAbsMid(segment, referenceModule ? {mid: referenceModule} : null);
			}).join("!");
			var result;
			if (mid in req.absMids && __webpack_require__.m[req.absMids[mid]]) {
				if (noInstall) {
					const module = installedModules[req.absMids[mid]];
					result = module && module.l && (asModuleObj ? module : module.exports);
				} else {
					result = __webpack_require__(req.absMids[mid]);
				}
			}
			if (!result) {
				throw new Error('Module not found: ' + mid);
			}
			return result;
		}

		function dojoModuleFromWebpackModule(webpackModule) { // eslint-disable-line no-unused-vars
			var result = {exports: webpackModule.exports};
			var id = webpackModule.i;
			if (typeof id === 'number') {
				id = req.absMidsById[id];
			}
			result.i = result.id = id;
			return result;
		}

		function contextRequire(a1, a2, a3, referenceModule, req) { // eslint-disable-line no-shadow
			if (!referenceModule && loaderScope.buildContext) {
				// No reference module means we were called by global require, so use the build context
				// as the reference module since that's what would have been used for constructing the absMid
				referenceModule = loaderScope.buildContext + 'x';
			}
			var type = ({}.toString).call(a1);
			if (type === '[object String]') {
				// a3 is passed by require calls injected into dependency arrays for dependencies specified
				// as identifiers (vs. string literals).
				var noInstall = !(a3 === false);
				return findModule(a1, referenceModule, noInstall);
			} else if (type === '[object Object]') {
				throw new Error('Require config is not supported by WebPack');
			}
			if (type === '[object Array]') {
				var modules = [], callback = a2, errors = [];
				a1.forEach(function (mid) {
					try {
						modules.push(findModule(mid, referenceModule));
					} catch (e) {
						errors.push({mid: mid, error: e});
					}
				});
				if (errors.length === 0) {
					callback.apply(this, modules);
				} else {
					var error = new Error("findModules");
					error.src = "dojo-webpack-plugin";
					error.info = errors;
					req.signal("error", error);
				}
				return req;
			} else {
				throw new Error('Unsupported require call');
			}
		}
	},
	undef: function() {
		function undef(mid, referenceModule) { // eslint-disable-line no-unused-vars
			if (!referenceModule && typeof buildContext !== 'undefined') {
				referenceModule = loaderScope.buildContext + 'x';		// global require
			}
			var module = findModule(mid, referenceModule, true, true); // eslint-disable-line no-undef
			if (module) {
				delete installedModules[module.i];
			}
		}
	}
};
