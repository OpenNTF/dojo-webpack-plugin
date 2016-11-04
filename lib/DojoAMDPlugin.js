/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var fs = require('fs');
var mixin = require('node-mixin');
var rimraf = require('rimraf');
var DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
var LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
var NormalModuleReplacementPlugin = require("webpack/lib/NormalModuleReplacementPlugin");

var NullFactory = require("webpack/lib/NullFactory");

var DojoAMDRequireDependenciesBlockParserPlugin = require("./DojoAMDRequireDependenciesBlockParserPlugin");
var DojoAMDDefineDependencyParserPlugin = require("./DojoAMDDefineDependencyParserPlugin");
var DojoAMDMainTemplatePlugin = require("./DojoAMDMainTemplatePlugin");
var DojoAMDResolverPlugin = require("./DojoAMDResolverPlugin");
var DojoAMDModuleFactoryPlugin = require("./DojoAMDModuleFactoryPlugin");

function DojoAMDPlugin(options) {
	this.options = options;
}
module.exports = DojoAMDPlugin;

DojoAMDPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	
	// set baseUrl
	var nodeConfig = mixin({}, options.loaderConfig);
	nodeConfig.baseUrl = path.join(compiler.context, nodeConfig.baseUrl || ".").replace(/\\/g, "/");
	var loaderScope = {};
	var dojoLoader = getDojoLoader(nodeConfig.baseUrl, options);
	dojoLoader.call(loaderScope, nodeConfig, {hasCache:{'dojo-config-api':1, 'dojo-inject-api':1, 'host-node':0, 'dom':0, 'dojo-sniff':0}});


	compiler.plugin("compilation", function(compilation, params) {
		compilation.dojoRequire = loaderScope.require;		// make available on compiler object for loaders

		compilation.dependencyFactories.set(DojoAMDDefineDependency, new NullFactory());
		compilation.dependencyTemplates.set(DojoAMDDefineDependency, new DojoAMDDefineDependency.Template());
		
		compilation.dependencyFactories.set(LocalModuleDependency, new NullFactory());
		compilation.dependencyTemplates.set(LocalModuleDependency, new LocalModuleDependency.Template());
		
		compilation.apply(new DojoAMDMainTemplatePlugin(options));
		compiler.apply(
		);
	});
	
	compiler.plugin("normal-module-factory", function() {
		compiler.apply(
			new NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!/, "dojo/selector/lite"),
			new NormalModuleReplacementPlugin(/^dojo\/request\/default!/, "dojo/request/xhr"),
			new NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
				data.request = data.request.replace(/^dojo\/text!/, "raw!");
			})
		);
	});
	
	compiler.apply(
		new DojoAMDModuleFactoryPlugin(options, loaderScope.require)
	);
	
	compiler.parser.apply(
		new DojoAMDRequireDependenciesBlockParserPlugin(options),
		new DojoAMDDefineDependencyParserPlugin(options)
	);
	
	compiler.resolvers.normal.apply(
		new DojoAMDResolverPlugin("normal", loaderScope.require)
	);
	
	compiler.apply
	
	// Copy options to webpack options
	compiler.options.DojoAMDPlugin = mixin(compiler.options.dojoOptions || {}, options);

	// Add resolveLoader config entry
	var resolveLoader = compiler.options.resolveLoader = compiler.options.resolveLoader || {};
	var root = resolveLoader.root = resolveLoader.root || [];
	root = resolveLoader.root = Array.isArray(root) ? root : [root];
	root.push(path.join(__dirname, "..", "loaders"));
	
	function getDojoLoader(baseUrl, options) {
		var dojoLoader;
		if (options.loader) {
			dojoLoader = require(options.loader);
		} else {
			console.log("Dojo loader not specified in options.  Building the loader...");
			var execFileSync = require("child_process").execFileSync;
			var tmp = require("tmp");
			var dojoPath;
			if (!nodeConfig.packages.some(function(pkg) {
				if (pkg.name === "dojo") return (dojoPath = pkg.location);
			})) {
				callback("dojo package not defined in loader config");
			}
			// create temporary directory to hold output
			var tempDir = tmp.dirSync();
			compiler.plugin("done", function() {
				// delete the temporary directory
				rimraf(tempDir.name, function(e) {if(e) throw(e);});
			});
			var result = execFileSync(
				"node", // the executable to run
				[	// The arguments
					path.resolve(baseUrl, dojoPath, "./dojo"), 	// path to dojo.js
					"load=build", 
					"--profile", 
					path.join(__dirname, "../buildDojo/loader.profile.js"), // the build profile
					"--release",
					"--releaseDir",
					tempDir.name	// target location
				]
			);
			console.log(result.toString());
			options.loader = path.join(tempDir.name, "dojo/dojo.js");
			dojoLoader = require(path.join(options.loader));
		}
		return dojoLoader;
	}
};
