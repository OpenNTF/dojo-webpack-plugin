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
const async = require("async");

module.exports = class DojoAMDResolverPlugin {
	constructor(dojoRequire) {
		this.dojoRequire = dojoRequire;
	}

	apply(resolver) {
		resolver.plugin('module', (request, callback) => {
			if (request.directory) return;
			const url = this.dojoRequire.toUrl(request.request, {mid: path.join(request.path, "x").replace(/\\/g, "/")});
			if (url && url != request.request) {
				let answer;
				async.each([url, url+".js"], (tryUrl, cb) =>{
					const obj = {
							path: tryUrl,
							query: request.query,
							directory: request.directory
					};
					const message = "Dojo resolve '" + request + "' in '" + path;
					resolver.doResolve(['file'], obj, message, (err, result) => {
						if (result) {
							answer = result;
						}
						cb();
					});
				}, function() {
					callback(null, answer);
				});
			} else {
				return callback();
			}
		});
	}
};
