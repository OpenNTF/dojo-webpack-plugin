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
const SingleEntryDependency = require("webpack/lib/dependencies/SingleEntryDependency");


module.exports = class DojoAMDModuleFactoryPlugin {
	constructor(options) {
		this.options = options;
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

	processAbsMidQueryArgs(factory, data) {
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
						factory.applyPlugins("add absMid", data, absMid);
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

	apply(compiler) {
		compiler.plugin("normal-module-factory", (factory) => {

			factory.plugin("add absMid", (data, absMid) => {
				this.addAbsMid(data, absMid);
			});

			factory.plugin("filter absMids", (data, callback) => {
				this.filterAbsMids(data, callback);
			});

			/*
			 * Determines the absMid aliases for this module and adds them to the data object.  An absMid can
			 * be derived from the request identifier path, or from query args in the request identiier.
			 * absMid aliases allow the module to be accessed at runtime using Dojo's synchonous require
			 * by referencing the alias name.
			 */
			factory.plugin("add absMids from request", data => {
				if (data) {
					this.processAbsMidQueryArgs(factory, data);
					if (data.dependencies) {
						data.dependencies.some(dep => {
							if (dep instanceof SingleEntryDependency || dep instanceof DojoAMDRequireItemDependency) {
								if (!path.isAbsolute(data.request)) {
									const context = dep.issuerModule && (dep.issuerModule.absMid || dep.issuerModule.request);
									var dojoRequire = compiler.applyPluginsBailResult("get dojo require");
									const absMid = this.toAbsMid(data.request, context, dojoRequire);
									if (absMid.charAt(0) !== '.') {
										factory.applyPlugins("add absMid", data, data.request = absMid);
									}
								}
								return true;
							}
						});
					}
				}
			});

			factory.plugin("before-resolve", function(data, callback) {
				if (data.request === "require" || data.request === "module") {
					data.request = require.resolve("./NoModule").replace(/\\/g, "/");
				} else {
					this.applyPluginsWaterfall("add absMids from request", data);
					data.absMidifiedRequest = data.request; // remember that we already dojoified this request
				}
				return callback(null, data);
			});

			factory.plugin("resolver", (resolver) => {
				return (data, callback) => {
					// Avoid invoking 'add absMids' more than once for the same request identifier
					// (for efficiencies sake more than anything else).  We may need to invoke
					// 'add absMid' again if the request has been modified by the
					// NormalModuleReplacementPlugin.  Note that we do it both here and in 'before-resolve'
					// so that we get the absMid aliases for both pre- and post- replaced module identifiers.
					// This allows the same module to be referenced at runtime by either name
					// (e.g. 'dojo/selector/_loader!default' and 'dojo/selector/lite').
					if (data.absMidifiedRequest !== data.request) {
						factory.applyPluginsWaterfall("add absMids from request", data);
					}
					return resolver(data, (err, result) => {
						if (result) {
							["absMid", "absMidAliases", "rawRequest"].forEach(prop => {
								if (prop in data) result[prop] = data[prop];
							});
						}
						callback(err, result);
					});
				};
			});

			factory.plugin("create-module", (data) => {
				const module =  new NormalModule(
					data.request,
					data.userRequest,
					data.rawRequest,
					data.loaders,
					data.resource,
					data.parser
				);
				if (data.absMid) {
					module.absMid = data.absMid;
					module.absMidAliases = data.absMidAliases;
				}
				return module;
			});

			compiler.plugin("compilation", compilation => {
				factory.plugin("module", function(module) {
					// If the module already exists in the compilation, then copy the absMid data from
					// this module to the existing module since this module will be discarded
					const existing = compilation.findModule(module.request);
					if (existing && module.absMid) {
						this.applyPlugins("add absMid", existing, module.absMid);
						(module.absMidAliases||[]).forEach(absMid => {
							this.applyPlugins("add absMid", existing, absMid);
						});
					}
					// Add functions to the module object for adding/filtering absMids (for use by loaders)
					module.addAbsMid = function(absMid) {
						factory.applyPlugins("add absMid", module, absMid);
					};
					module.filterAbsMids = function(callback) {
						factory.applyPlugins("filter absMids", module, callback);
					};
					return module;
				});
			});
		});
	}
};
