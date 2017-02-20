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
var NormalModule = require("webpack/lib/NormalModule");
var DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
var SingleEntryDependency = require("webpack/lib/dependencies/SingleEntryDependency");
var path = require("path");

function DojoAMDModuleFactoryPlugin(options, dojoRequire) {
	this.options = options;
	this.dojoRequire = dojoRequire
}
module.exports = DojoAMDModuleFactoryPlugin;

DojoAMDModuleFactoryPlugin.prototype.apply = function(compiler) { 
	var dojoRequire = this.dojoRequire;
	var options = this.options;

	
	function toAbsMid(request, issuerAbsMid) {
		if (!request) return request;
		var segments = [];
		request.split("!").forEach(function(segment) { 
			segments.push(dojoRequire.toAbsMid(segment, issuerAbsMid ? {mid: issuerAbsMid} : null));
		});
		return segments.join("!");
	}
	
	compiler.plugin("normal-module-factory", function(factory) {
		factory.plugin("before-resolve", function(data, callback) {
			if (!data) return callback;
			var match = /^(.*)\?absMid=([^!]*)$/.exec(data.request);
			if (match && match.length === 3) {
				data.absMid = decodeURIComponent(match[2]);
				data.request = match[1];
			} else if (data.request === "require" || data.request === "module") {
				data.absMid = data.request;
				data.request = require.resolve("./NoModule").replace(/\\/g, "/");
			} else if (data.dependency instanceof SingleEntryDependency || data.dependency instanceof DojoAMDRequireItemDependency) {
				// dojo/has loader plugin syntax is not compatible with webpack loader syntax, so need
				// to evaluate dojo/has loader conditionals here
				var context = data.dependency.issuerModule && (data.dependency.issuerModule.absMid || data.dependency.issuerModule.request);
				var absMid = toAbsMid(data.request, context);
				if (absMid.charAt(0) !== '.') {
					data.rawRequest = data.request;
					data.request = data.absMid = absMid;
				}
				data.absMidAliases = [];
			}
			return callback(null, data);
		});	
		
		factory.plugin("resolver", function(resolver) {
			return function(data, callback) {
				return resolver(data, function(err, result) {
					if (result && data.absMid) {
						result.absMid = data.absMid;
						result.absMidAliases = data.absMidAliases;
						result.rawRequest = data.rawRequest;
					}
					callback(err, result);
				});
			}
		});
		
		factory.plugin("create-module", function(data) {
			var module =  new NormalModule(
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
	});		
};
