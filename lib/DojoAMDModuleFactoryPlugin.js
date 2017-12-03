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

	processAbsMids(factory, data) {
		// Parse and remove absMid query args from request if any
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
						factory.addAbsMid(data, absMid);
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

	apply(compiler) {
		compiler.plugin("normal-module-factory", (factory) => {

			factory.__proto__.addAbsMid = function(data, absMid) {
				if (absMid.startsWith(".")) {
					throw new Error(`Illegal absMid: ${absMid} must not be relative`);
				}
				data.absMidAliases = data.absMidAliases || [];
				if (!data.absMid) {
					data.absMid = absMid;
				} else if (path.isAbsolute(data.absMid)) {
					// prefer non-absolute paths for absMid
					data.absMidAliases.push(data.absMid);
					data.absMid = absMid;
				} else {
					data.absMidAliases.push(absMid);
				}
			};

			factory.plugin("before-resolve", (data, callback) => {
				if (data) {
					this.processAbsMids(factory, data);
					if (data.request === "require" || data.request === "module") {
						data.request = require.resolve("./NoModule").replace(/\\/g, "/");
					} else if (data.dependencies) {
						data.dependencies.some(dep => {
							if (dep instanceof SingleEntryDependency || dep instanceof DojoAMDRequireItemDependency) {
								if (!path.isAbsolute(data.request)) {
									// dojo/has loader plugin syntax is not compatible with webpack loader syntax, so need
									// to evaluate dojo/has loader conditionals here
									const context = dep.issuerModule && (dep.issuerModule.absMid || dep.issuerModule.request);
									var dojoRequire = compiler.applyPluginsBailResult("get dojo require");
									const absMid = this.toAbsMid(data.request, context, dojoRequire);
									if (absMid.charAt(0) !== '.') {
										data.rawRequest = data.request;
										factory.addAbsMid(data, data.request = absMid);
									}
								}
								return true;
							}
						});
					}
				}
				return callback(null, data);
			});

			factory.plugin("resolver", (resolver) => {
				return (data, callback) => {
					return resolver(data, (err, result) => {
						if (result && data.absMid) {
							result.absMid = data.absMid;
							result.absMidAliases = data.absMidAliases;
							result.rawRequest = data.rawRequest;
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
					// If the module already exists in the compiler, then copy the absMid data from
					// this module to the existing module since this module will be discarded
					const existing = compilation.findModule(module.request);
					if (existing && module.absMid) {
						this.addAbsMid(existing, module.absMid);
						(module.absMidAliases||[]).forEach(absMid => {
							this.addAbsMid(existing, absMid);
						});
					}
					return module;
				});
			});
		});
	}
};
