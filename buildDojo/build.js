var path = require("path");
var fork = require("child_process").fork;

var dojoPath = global.process.argv.length > 2 && global.process.argv[2];
var releaseDir = global.process.argv.length > 3 && global.process.argv[3];
if (!dojoPath) {
	throw Error("Path to dojo not specified");
}
if (!releaseDir) {
	throw Error("Target path not specified");
}
var ls = fork(
	path.resolve(dojoPath), 
	[
		"load=build", 
		"--profile", 
		path.join(__dirname, "loader.profile.js"), 
		"--release", 
		"--releaseDir", 
		path.resolve(releaseDir)
	]
);

ls.on('close', function(code) {
  console.log('child process exited with code ' + code);
});
