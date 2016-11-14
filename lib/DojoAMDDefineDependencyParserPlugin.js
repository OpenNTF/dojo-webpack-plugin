/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var util = require("util");
var DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
var CommonJsRequireDependency = require("webpack/lib/dependencies/CommonJsRequireDependency");
var ConstDependency = require("webpack/lib/dependencies/ConstDependency");
var DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
var AMDRequireArrayDependency = require("webpack/lib/dependencies/AMDRequireArrayDependency");
var LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
var LocalModulesHelpers = require("webpack/lib/dependencies/LocalModulesHelpers");
var AMDDefineDependency = require("webpack/lib/dependencies/AMDDefineDependency");

function DojoAMDDefineDependencyParserPlugin(options, dojoRequire) {
	this.options = options;
	this.dojoRequire = dojoRequire;
}

module.exports = DojoAMDDefineDependencyParserPlugin;

DojoAMDDefineDependencyParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	var dojoRequire = this.dojoRequire;
	
	parser.plugin("call define", function(expr) {
		if (expr.dojoSkipFlag) return;
		expr.dojoSkipFlag = true;
		
		if (!this.dojoLoaderDependenciesAdded) {
			var loaderConfig = util.isString(options.loaderConfig) ? require(options.loaderConfig) : options.loaderConfig;
			this.state.current.addDependency(new CommonJsRequireDependency(options.loader));
			if (util.isString(options.loaderConfig)) {
				this.state.current.addDependency(new CommonJsRequireDependency(options.loaderConfig));
			}
			this.dojoLoaderDependenciesAdded = true;
		}
		this.state.current.isAMD = true;
		var result = this.applyPluginsBailResult("call define", expr);
		delete expr.dojoSkipFlag;
		
		if (result) {
			// This is pretty hacky.  We want to avoid duplicating the implementation of the 'call define' plugin handler in 
			// AMDDefineDependencyParserPlugin, but it doesn't provide the ability to override the define dependency object
			// creation so instead, we reach into the module's dependencies to find the instance of the AMDDefineDependency
			// object and replace it our own.  There should only be one AMDDefineDependency of any given module.
			var deps = this.state.current.dependencies;
			for (var i = deps.length-1; i >= 0; i--) {
				var dep = deps[i];
				if (dep instanceof AMDDefineDependency) {
					var newDep = new DojoAMDDefineDependency(dep.range, dep.arrayRange, dep.functionRange, dep.objectRange);
					newDep.loc = dep.loc;
					newDep.localModule = dep.localModule;
					deps[i] = newDep;
					break;
				}
			}
		}
		return result;
	});
	
	parser.plugin("call define:amd:array", function(expr, param, identifiers, namedModule) {
		if(param.isConstArray()) {
			var deps = [];
			param.array.forEach(function(request, idx) {
				var dep, localModule;
				if(request === "require") {
					identifiers[idx] = request;
					dep = this.state.module.absMid ? ("__webpack_require__.dj.c(\"" + this.state.module.absMid + "\")") : "__webpack_require__";
				} else if (request === "module") {
					identifiers[idx] = request;
					dep = "(function(){__webpack_require__.dj.m(module, \"" + this.state.module.absMid +  "\")";
				} else if(request === "exports") {
					identifiers[idx] = request;
					dep = request;
				} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, request)) { // eslint-disable-line no-cond-assign
					dep = new LocalModuleDependency(localModule);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
				} else {
					var props = {options: options, require: dojoRequire};
					dep = new DojoAMDRequireItemDependency(request, this.state.module, props);
					dep.loc = expr.loc;
					dep.optional = !!this.scope.inTry;
					this.state.current.addDependency(dep);
				}
				deps.push(dep);
			}, this);
			var dep = new AMDRequireArrayDependency(deps, param.range);
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	});
	parser.plugin("call define:amd:item", function(expr, param, namedModule) {
		if(param.isString()) {
			var dep, localModule;
			if(param.string === "require") {
				dep = new ConstDependency(this.state.module.absMid ? ("__webpack_require__.dj.c(\"" + this.state.module.absMid + "\")") : "__webpack_require__", param.range);
			} else if (param.string === "module") {
				dep = new ConstDependency("__webpack_require__.dj.m(module, \"" + this.state.module.absMid +  "\")", param.range);
			} else if (param.string === "exports") {
				dep = new ConstDependency(param.string, param.range);
			} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, param.string, namedModule)) { // eslint-disable-line no-cond-assign
				dep = new LocalModuleDependency(localModule, param.range);
			} else {
				var props = {options: options, require:dojoRequire};
				dep = new DojoAMDRequireItemDependency(param.string, this.state.module, props, param.range);
			}
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	});
};
