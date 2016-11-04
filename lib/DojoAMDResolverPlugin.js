
function DojoAMDResolverPlugin(type, dojoRequire) {
	this.type = type;
	this.dojoRequire = dojoRequire;
}
module.exports = DojoAMDResolverPlugin;

DojoAMDResolverPlugin.prototype.apply = function(resolver) {
	var dojoRequire = this.dojoRequire
	var type = this.type;
	resolver.plugin('module', function(request, callback) {
		if (request.directory) return;
		var url = dojoRequire.toUrl(request.request, {mid: request.path.replace(/\\/g, "/")});
		if (url && url != request.request) {
			var obj = {
					path: request.path,
					request: url,
					query: request.query,
					directory: request.directory
			};
			this.doResolve(['module'], obj, function(err, result) {
				if (err) {
					return callback();
				} else {
					callback(null, result);
				}
			});
		} else {
			return callback();
		}
	});
};
