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

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * ATTENTION!!! If you make changes to this file that affect the generated code,
 * be sure to update the hash generation function at the end of the file.
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

const ConcatSource = require("webpack-sources").ConcatSource;

module.exports = class DojoAMDChunkTemplatePlugin {
	apply(compiler) {
		compiler.plugin("compilation", compilation => {
			compilation.chunkTemplate.plugin("render", function(source, chunk) {
				const jsonpFunction = this.outputOptions.jsonpFunction;
				const buf = [];
				buf.push(jsonpFunction + ".registerAbsMids({");
				buf.push(this.applyPluginsWaterfall("render absMids", "", chunk));
				buf.push("});");
				buf.push("");
				const replacementSource = new ConcatSource();
				replacementSource.add(this.asString(buf));
				replacementSource.add(source);
				return replacementSource;
			});

			compilation.chunkTemplate.plugin("render absMids", function(source, chunk) {
				var modules = chunk.getModules ? chunk.getModules() : /* istanbul ignore next */ chunk.modules;
				const buf = [], renderedAbsMids = [];
				if (source) {
					buf.push(source);
				}
				var lastEntry;
				modules.forEach((module) => {
					if (module.absMid) {
						if (!renderedAbsMids.includes()) {
							renderedAbsMids.push(module.absMid);
							if (typeof(lastEntry) !== 'undefined') {
								buf[lastEntry] += ",";
							}
							buf.push(this.indent(`'${module.absMid}':${JSON.stringify(module.id)}`));
							lastEntry = buf.length-1;
						}
						if (module.absMidAliases) {
							module.absMidAliases.forEach((alias) => {
								if (!renderedAbsMids.includes(alias)) {
									renderedAbsMids.push(alias);
									if (typeof(lastEntry) !== 'undefined') {
										buf[lastEntry] += ",";
									}
									buf.push(this.indent(`'${alias}':${JSON.stringify(module.id)}`));
									lastEntry = buf.length-1;
								}
							});
						}
					} else {
						buf.push(this.indent(`// ${module.rawRequest} = ${JSON.stringify(module.id)}`));
					}
				});
				return this.asString(buf);
			});
			compilation.chunkTemplate.plugin("hash", (hash) => {
				hash.update("DojoAMDChunkTemplate");
				hash.update("2");		// Increment this whenever the template code above changes
			});
		});
	};
};
