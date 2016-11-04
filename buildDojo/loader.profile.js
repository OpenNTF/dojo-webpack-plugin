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