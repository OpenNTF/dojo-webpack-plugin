/*
/* (C) Copyright HCL Technologies Ltd. 2018
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
const {newNormalModule} = require("./compat");
const {reg, tap, callSync, callSyncBail} = require("webpack-plugin-compat").for("dojo-webpack-plugin");
const Module = require("webpack/lib/Module");

module.exports = class DojoAMDModuleFactoryPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		tap(compiler, "normal-module-factory", factory => {
			const context = Object.create(this, {factory: {value: factory}});
			reg(factory, {
				"add absMid" : ["Sync", "data", "absMid"],
				"filter absMids" : ["Sync", "module", "callback"],
				"add absMids from request" : ["Sync", "data"]
			});
			tap(factory, {
				"add absMid"               : this.addAbsMid,	// plugin specific event
				"filter absMids"           : this.filterAbsMids,  // plugin specific event
				"add absMids from request" : this.addAbsMidsFromRequest,	// plugin specific event
				"before-resolve"           : this.beforeResolve,
				"resolver"                 : this.resolver,
				"create-module"            : this.createModule
			}, context);
		});
		tap(compiler, {"compilation" : (compilation, params) => {
			tap(params.normalModuleFactory, {
				"module": this.module.bind(this, compilation, params.normalModuleFactory)
			});
		}});
	}

	toAbsMid(request, issuerAbsMid, dojoRequire) {
		var result = request;
		if (request) {
			const segments = [];
			let context;
			// extract context path from issuerAbsMid (it might be a loader expression)
			const parts = issuerAbsMid && issuerAbsMid.split('!') || [];
			while (!context && parts.length) context = parts.pop();
			request.split("!").forEach((segment) => {
				segments.push(dojoRequire.toAbsMid(segment, context ? {mid: context} : null));
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
						callSync(this.factory, "add absMid", data, absMid);
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
		if (!absMid) {
			throw new Error(`Illegal absMid: ${absMid} must not be empty.`);
		}
		if (absMid.split('!').some(part => path.isAbsolute(part))) {
			throw new Error(`Illegal absMid: ${absMid} must not be absolute.`);
		}
		data.absMidAliases = data.absMidAliases || [];
		if (absMid !== data.absMid && !data.absMidAliases.includes(absMid)) {
			if (data.absMid) {
				data.absMidAliases.unshift(data.absMid);
			}
			data.absMid = absMid;
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
		toKeep.reverse().forEach(absMid => {
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
				  || data.absMidifiedRequest !== data.request
			    && data.request.indexOf("!") === -1) // Skip for loader expressions the second time through
			                                         //  since all loaders should now be webpack loaders
					&& data.request.charAt(0) !== '!'
				  && data.request.split('!').every(part => !path.isAbsolute(part) && part.charAt(0) != '/')) {
				let context;
				if (data.dependencies) {
					data.dependencies.some(dep => context = dep.issuerModule && dep.issuerModule.absMid);
				}
				var dojoRequire = callSyncBail(this.compiler, "get dojo require");
				const absMid = this.toAbsMid(data.request, context, dojoRequire);
				if (absMid.split('!').every(part => !/^[./]/.test(part) && !path.isAbsolute(part))) {
					callSync(this.factory, "add absMid", data, data.request = data.absMidifiedRequest = absMid);
				}
			}
		}
	}

	beforeResolve(data, callback) {
		const dep = data.dependencies && data.dependencies[0];
		if (dep && dep.usingGlobalRequire && data.request.startsWith('.')) {
			// Global require with relative path.  Dojo resolves against the page.
			// We'll resolve against the compiler context or config defined global context
			const globalPath = this.options.getGlobalContext(this.compiler);
			data.request = path.resolve(globalPath, data.request);
			var relPath = path.relative(globalPath, data.request).replace(/\\/g,'/');
			if (!path.isAbsolute(relPath) && !relPath.startsWith('.')) {
				relPath = "./" + relPath;
			}
			this.addAbsMid(data,  relPath);
		}
		callSync(this.factory, "add absMids from request", data);
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
			callSync(this.factory, "add absMids from request", data);
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
		const module =  newNormalModule(data);
		if (data.absMid) {
			module.absMid = data.absMid;
			module.absMidAliases = data.absMidAliases;
		}
		return module;
	}

	module(compilation, moduleFactory, module) {
		if (module.originalRequest instanceof Module) {
			// Copy absMids from original request to the new request
			callSync(moduleFactory, "filter absMids", module.originalRequest, absMid => {
				callSync(moduleFactory, "add absMid", module, absMid);
				return true;
			});
		}
		// If the module already exists in the compilation, then copy the absMid data from
		// this module to the existing module since this module will be discarded
		const existing = compilation.findModule(module.request);
		if (existing) {
			callSync(moduleFactory, "filter absMids", module, absMid => {
				callSync(moduleFactory, "add absMid", existing, absMid);
				return true;
			});
		}
		// Add functions to the module object for adding/filtering absMids (for use by loaders)
		module.addAbsMid = absMid => {
			callSync(moduleFactory, "add absMid", module, absMid);
		};
		module.filterAbsMids = callback => {
			callSync(moduleFactory, "filter absMids", module, callback);
		};
		return module;
	}
};
