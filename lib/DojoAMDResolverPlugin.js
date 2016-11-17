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
var path = require("path");

function DojoAMDResolverPlugin(type, dojoRequire) {
	this.type = type;
	this.dojoRequire = dojoRequire;
}
module.exports = DojoAMDResolverPlugin;

DojoAMDResolverPlugin.prototype.apply = function(resolver) {
	var dojoRequire = this.dojoRequire
	var type = this.type;
	resolver.plugin('module', function(request, callback) {
		if (request.directory) return;
		var url = dojoRequire.toUrl(request.request, {mid: path.join(request.path, "x").replace(/\\/g, "/")});
		if (url && url != request.request) {
			var obj = {
					path: request.path,
					request: url,
					query: request.query,
					directory: request.directory
			};
			this.doResolve(['file'], obj, function(err, result) {
				if (err) {
					return callback();
				} else {
					callback(null, result);
				}
			});
		} else {
			return callback();
		}
	});
};
