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
 * Dojo build profile for building the loader
 */
var nodeRequire = require.rawConfig.loaderPatch.nodeRequire;
var path = nodeRequire("path");
var profile = (function(){
	var profile, argv = global.process.argv;
	for (var i = 0; i < argv.length; i++) {
		if (argv[i] === "--profile") {
			profile = argv[i + 1]; 
		}
	}
	var profilePath = path.resolve(profile);
	console.log("Profile path = " + profilePath);
    return {
    	layerOptimize: false,
        releaseDir: "./release",
        
        packages:[{
            name:"dojo",
            location:dojo.baseUrl,
            trees: [[".", ".", /\.*/]]
        }],

        staticHasFeatures:{
            'dojo-config-api': 1,
            'dojo-inject-api': 1,
            'dojo-built': 1,
            'config-dojo-loader-catches': 0,
            'config-tlmSiblingOfDojo': 0,
            'dojo-log-api': 0,
            'dojo-sync-loader': 0,
            'dojo-timeout-api': 0,
            'dojo-sniff': 0,
            'dojo-cdn': 0,
            'dojo-loader-eval-hint-url': 0,
            'config-stripStrict': 0,
            'ie-event-behavior': 0,
            'dom': 0,
            'host-node': 0
        },

        layers: {
            "dojo/dojo": {
                include: [],
                customBase: 1
            }
        },
        transforms: {
            writeDojo: [path.join(profilePath, "..", "./transforms/writeDojo.js"), "write"]
        },
    };
})();