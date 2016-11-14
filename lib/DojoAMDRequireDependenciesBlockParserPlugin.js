/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
var AMDRequireArrayDependency = require("webpack/lib/dependencies/AMDRequireArrayDependency");
var LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
var LocalModulesHelpers = require("webpack/lib/dependencies/LocalModulesHelpers");
var ConstDependency = require("webpack/lib/dependencies/ConstDependency");

function DojoAMDRequireDependenciesBlockParserPlugin(options, dojoRequire) {
	this.options = options;
	this.dojoRequire = dojoRequire;
}

module.exports = DojoAMDRequireDependenciesBlockParserPlugin;

DojoAMDRequireDependenciesBlockParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	var dojoRequire = this.dojoRequire;
	
	parser.plugin("expression require", function(expr) {
		return true;
	});
	
	parser.plugin("call require", function(expr) {
		if (!this.state.module.isAMD) {
			return;
		}
		switch(expr.arguments.length) {
			case 1:
				if (expr.arguments[0].type !== "ArrayExpression") {
					return true;	// let client handle
				}
				return;
			case 2:
				if (expr.arguments[0].type !== "ArrayExpression") {
					return true;	// let client handle
				}
				return;
		}
	});
	parser.plugin("call require:amd:array", function(expr, param) {
		if(param.isConstArray()) {
			var deps = [];
			param.array.forEach(function(request) {
				var dep, localModule;
				if(request === "require") {
					dep = "__webpack_require__";
				} else if(["exports", "module"].indexOf(request) >= 0) {
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
	parser.plugin("call require:amd:item", function(expr, param) {
		 if(param.isString()) {
			var dep, localModule;
			if(param.string === "require") {
				dep = new ConstDependency(this.state.module.absMid ? ("__webpack_require__.dj.c(\"" + this.state.module.absMid + "\")") : "__webpack_require__", param.range);
			} else if (param.string === "module") {
				dep = new ConstDependency("__webpack_require.dj.m(module, \"" + this.state.module.absMid +  "\")", param.range);
			} else if (param.string === "exports") {
				dep = new ConstDependency(param.string, param.range);
			} else if(localModule = LocalModulesHelpers.getLocalModule(this.state, param.string)) { // eslint-disable-line no-cond-assign
				dep = new LocalModuleDependency(localModule, param.range);
			} else {
				var props = {options: options, require: dojoRequire};
				dep = new DojoAMDRequireItemDependency(param.string, this.state.module, props, param.range);
			}
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
		}
		return true;
	});
};
