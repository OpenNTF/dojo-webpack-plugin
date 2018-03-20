if (parseInt(require("webpack/package.json").version.split(".")[0]) >= 4) {
	const {Tapable, reg, tap, callSync, callSyncBail} = require("../lib/pluginCompat").for("pluginHelper.test");
	describe("pluginHelper tests", function() {
		it("tap should throw error for missing hook", function(done) {
			try {
				const obj = new Tapable();
				reg(obj, {"foo" : ["Sync"]});
				tap(obj, {"missing": ()=>0});
				done(new Error("Shouldn't get here"));
			} catch (e) {
				e.message.should.containEql("No hook for missing");
				done();
			}
		});
		it("call should throw error for missing hook", function(done) {
			try {
				const obj = new Tapable();
				reg(obj, {"foo" : ["Sync"]});
				callSync(obj, "missing");
				done(new Error("Shouldn't get here"));
			} catch (e) {
				e.message.should.containEql("No hook for missing");
				done();
			}
		});
		it("call should throw error for wrong hook type", function(done) {
			try {
				const obj = new Tapable();
				reg(obj, {"foo" : ["Sync"]});
				callSyncBail(obj, "foo");
				done(new Error("Shouldn't get here"));
			} catch (e) {
				e.message.should.containEql("Attempt to call SyncHook from a SyncBailHook");
				done();
			}
		});
		it("should throw unsupported hook type error", function(done) {
			try {
				const obj = new Tapable();
				reg(obj, {"foo" : ["foo"]});
				done(new Error("Shouldn't get here"));
			} catch (e) {
				e.message.should.containEql("Unsupported hook type foo");
				done();
			}
		});
		it("should throw already registered error", function(done) {
			try {
				const obj = new Tapable();
				reg(obj, {"foo" : ["Sync"]});
				reg(obj, {"foo" : ["SyncBail"]});
			} catch (e) {
				e.message.should.containEql("already registered");
				done();
			}
		});
	});
}