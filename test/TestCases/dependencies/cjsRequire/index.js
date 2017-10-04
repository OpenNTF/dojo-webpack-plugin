/* global cjsRequire */
define(["./amdModule"], function(amd) {
	it("should load CommonJS modules using cjsRequire", function() {
		amd.should.be.eql("amd");
		cjsRequire("./cjsModule").should.be.eql("cjs");
	});
});
