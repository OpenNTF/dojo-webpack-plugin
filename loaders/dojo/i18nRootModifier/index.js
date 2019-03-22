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
const loaderUtils = require("loader-utils");
const i18nEval = require("../i18nEval");

/*
 * Modifies the available locales specified in "root" bundles to enable only those locales
 * specified in the bundleLocales query arg.  All other locales will be unavailable.
 */
module.exports = function(content) {
  this.cacheable && this.cacheable();
	const banner = `/*
 * This module was modified by dojo-webpack-plugin to disable some locales
 * that were excluded by the plugin's 'locales' option
 */
`;
  const query = this.query ? loaderUtils.parseQuery(this.query) : {};
	if (typeof query.bundledLocales === undefined) {
		return content;
	}

  var bundle = i18nEval(content);
  if (!bundle.root) {
    return content;
  }

  const bundledLocales = query.bundledLocales.split("|");
	let modified = false;
  Object.keys(bundle).forEach(availableLocale => {
    if (availableLocale === "root") return;
		if (bundle[availableLocale]) {
			if (!bundledLocales.includes(availableLocale)) {
				bundle[availableLocale] = false;
				modified = true;
			}
		}
  });
  return !modified ? content : `${banner}define(${JSON.stringify(bundle,null, 1)})`;
};

module.exports.seperable = true;
