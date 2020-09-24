/*
 * (C) Copyright HCL Technologies Ltd. 2019
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

/*
 * Evaluates a Dojo i18n resource bundle and returns the bundle object
 */
module.exports = function(bundle) {
	var result, isAmd;
	function define(arg1, arg2) {
		isAmd = true;

		if (!arg2) {
			// overwriting language files may define an easy object
			result = arg1;

		} else if (arg1.length === 0) {

			// without dependencies we can easily call the empty factory function
			result = arg2(); // call factory function

		} else if (arg1.length === 2 && arg1[0] === "require" && arg1[1] === "exports") {

			// Special case for typescript generated i18n files
			// tsc is adding virtual dependencies for require and exports
			// we need the latter as our result
			var exp = {};
			var requireFun = function() { throw new Error("require() is not supported in language files"); };
			arg2(requireFun, exp);
			result = exp;

		} else {
			throw new Error("define dependencies not supported in langauge files!");
		}
	}

	define.amd = true;
	eval(bundle);
	if (!isAmd) {
		throw new Error("Non-AMD nls bundles are not supported by dojo-webpack-plugin");
	}

	return result;
};
