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
const querystring = require("querystring");
const NormalModule = require("webpack/lib/NormalModule");
const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
const {reg, tap, callSync, callSyncBail} = require("./pluginHelper");
const SingleEntryDependency = require("webpack/lib/dependencies/SingleEntryDependency");

module.exports = class DojoAMDModuleFactoryPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		/*
		 * Module factories are per-compilation objects.  We register our plugins using the
		 * compiler's "normal-module-factory" event instead of the "compilation" event to
		 * get the order of registration we need wrt other plugins, but it's safe to add
		 * the compilation objects to the context after the fact, because the
		 * "normal-module-factory" event will fire again for each new compilation.
		 */
		tap(compiler, {"normalModuleFactory" : factory => {
			const context = Object.create(this, {factory: {value: factory}});
			reg(factory, {
				"addAbsMid" : ["Sync", "data", "absMid"],
				"filterAbsMids" : ["Sync", "module", "callback"],
				"addAbsMidsFromRequest" : ["Sync", "data"]
			});
			tap(factory, {
				"addAbsMid"             : this.addAbsMid,	// plugin specific event
				"filterAbsMids"         : this.filterAbsMids,  // plugin specific event
				"addAbsMidsFromRequest" : this.addAbsMidsFromRequest,	// plugin specific event
				"beforeResolve"         : this.beforeResolve,
				"resolver"              : this.resolver,
				"createModule"          : this.createModule,
				"module"                : this.module
			}, context);
			tap(compiler, {"compilation" : (compilation, params) => {
				Object.defineProperties(context, {
					compilation: {value: compilation},
					params: {value: params}
				});
			}});
		}}, this);
	}

	toAbsMid(request, issuerAbsMid, dojoRequire) {
		var result = request;
		if (request) {
			const segments = [];
			request.split("!").forEach((segment) => {
				segments.push(dojoRequire.toAbsMid(segment, issuerAbsMid ? {mid: issuerAbsMid} : null));
			});
			result = segments.join("!");
		}
		return result;
	}

	processAbsMidQueryArgs(data) {
		// Parse the absMid query args from request and add them to the data
		// object.  Any such query args are also removed from the request.
		//
		// Note that we don't need to worry about duplicates because they
		// are weeded out by the chunk renderer
		const parts = data.request.split("!");
		parts.forEach((part, i) => {
			let idx = part.indexOf("?");
			if (idx !== -1) {
				let request = part.substring(0, idx);
				let query = querystring.parse(part.substring(idx+1));
				let absMids = query.absMid;
				if (absMids) {
					if (!Array.isArray(absMids)) {
						absMids = [absMids];
					}
					absMids.forEach(absMid => {
						callSync(this.factory, "addAbsMid", data, absMid);
					});
					delete query.absMid;
					if (Object.keys(query).length) {
						request = request + "?" + querystring.stringify(query);
					}
					parts[i] = request;
				}
			}
		});
		data.request = parts.join("!");
	}

	/*
	 * Adds an absMid alias for the module.
	 */
	addAbsMid(data, absMid) {
		if (!absMid || absMid.startsWith(".")) {
			throw new Error(`Illegal absMid: ${absMid} must not be empty or relative`);
		}
		data.absMidAliases = data.absMidAliases || [];
		if (!data.absMid) {
			data.absMid = absMid;
		} else if (path.isAbsolute(data.absMid)) {
			// prefer non-absolute paths for primary absMid
			data.absMidAliases.push(data.absMid);
			data.absMid = absMid;
		} else {
			data.absMidAliases.push(absMid);
		}
	}

	/*
	 * Filters the absMids for a module
	 */
	filterAbsMids(data, callback) {
		let toKeep = [];
		if (data.absMid && callback(data.absMid)) {
			toKeep.push(data.absMid);
		}
		if (data.absMidAliases) {
			toKeep = toKeep.concat(data.absMidAliases.filter(callback));
		}
		delete data.absMid;
		delete data.absMidAliases;
		toKeep.forEach(absMid => {
			this.addAbsMid(data, absMid);
		});
	}

	addAbsMidsFromRequest(data) {
		/*
		 * Determines the absMid aliases for this module and adds them to the data object.  An absMid can
		 * be derived from the request identifier path, or from query args in the request identiier.
		 * absMid aliases allow the module to be accessed at runtime using Dojo's synchonous require
		 * by referencing the alias name.
		 */
		if (data) {
			this.processAbsMidQueryArgs(data);
			if ((!data.absMidifiedRequest
			     || data.absMidifiedRequest === data.request
			     || data.request.indexOf("!") === -1) // Skip for loader expressions the second time through
			                                          //  since all loaders should now be webpack loaders
			     && data.dependencies) {
				data.dependencies.some(dep => {
					if (dep instanceof SingleEntryDependency || dep instanceof DojoAMDRequireItemDependency) {
						if (!path.isAbsolute(data.request)) {
							const context = dep.issuerModule && (dep.issuerModule.absMid || dep.issuerModule.request);
							var dojoRequire = callSyncBail(this.compiler, "getDojoRequire");
							const absMid = this.toAbsMid(data.request, context, dojoRequire);
							if (absMid.charAt(0) !== '.') {
								callSync(this.factory, "addAbsMid", data, data.request = data.absMidifiedRequest = absMid);
							}
						}
						return true;
					}
				});
			}
		}
	}

	beforeResolve(data, callback) {
		const dep = data.dependencies && data.dependencies[0];
		if (dep && dep.usingGlobalRequire && data.request.startsWith('.')) {
			// Global require with relative path.  Dojo resolves against the page.
			// We'll resolve against the compiler context.
			data.request = path.resolve(this.options.getGlobalContext(this.compiler), data.request);
			this.addAbsMid(data, this.options.getGlobalContextVarName() + "/" + data.request);
		}
		callSync(this.factory, "addAbsMidsFromRequest", data);
		return callback(null, data);
	}

	resolver(resolver) {
		return (data, callback) => {
			// Avoid invoking 'add absMids' more than once for the same request identifier
			// (for efficiencies sake more than anything else).  We may need to invoke
			// 'add absMid' again if the request has been modified by the
			// NormalModuleReplacementPlugin.  Note that we do it both here and in 'before-resolve'
			// so that we get the absMid aliases for both pre- and post- replaced module identifiers.
			// This allows the same module to be referenced at runtime by either name
			// (e.g. 'dojo/selector/_loader!default' and 'dojo/selector/lite').
			callSync(this.factory, "addAbsMidsFromRequest", data);
			return resolver(data, (err, result) => {
				if (result) {
					["absMid", "absMidAliases", "rawRequest"].forEach(prop => {
						if (prop in data) result[prop] = data[prop];
					});
				}
				callback(err, result);
			});
		};
	}

	createModule(data) {
		const module =  new NormalModule(data);
		if (data.absMid) {
			module.absMid = data.absMid;
			module.absMidAliases = data.absMidAliases;
		}
		return module;
	}

	module(module) {
		// If the module already exists in the compilation, then copy the absMid data from
		// this module to the existing module since this module will be discarded
		const existing = this.compilation.findModule(module.request);
		if (existing && module.absMid) {
			callSync(this.factory, "addAbsMid", existing, module.absMid);
			(module.absMidAliases||[]).forEach(absMid => {
				callSync(this.factory, "addAbsMid", existing, absMid);
			});
		}
		// Add functions to the module object for adding/filtering absMids (for use by loaders)
		module.addAbsMid = absMid => {
			callSync(this.factory, "addAbsMid", module, absMid);
		};
		module.filterAbsMids = callback => {
			callSync(this.factory, "filterAbsMids", module, callback);
		};
		return module;
	}
};
