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
  const query = this.query ? loaderUtils.parseQuery(this.query) : {};

  var bundle = i18nEval(content);
  if (!bundle.root || typeof query.bundledLocales === undefined) {
    return content;
  }
  const bundledLocales = query.bundledLocales.split("|");
  Object.keys(bundle).forEach(availableLocale => {
    if (availableLocale === "root") return;
    bundle[availableLocale] = bundle[availableLocale] && bundledLocales.includes(availableLocale);
  });
  return `define(${JSON.stringify(bundle,null, 1)})`;
};

module.exports.seperable = true;
