var should = require("should");
define(["exports", "module", "./dep"], function(exports, module, dep) {
	it("should compile", function(done) {
		done();
	});

	it("require scoping", function(done) {
		// verify require function hasn't been renamed
		var name = "req";
		name += "uire";
		eval(name).should.be.eql(require);
		(typeof require.toUrl).should.be.eql("function");
		(typeof require.toAbsMid).should.be.eql("function");
		done();
	});

	it("defined vars" , function(done) {
		module.exports.should.be.eql(exports);
		module.id.should.be.eql('test/index');
		done();
	});

	it("require", function(done) {
		require('test/dep').should.be.eql(dep);
		var exceptionThrown;
		try {
			require('test/asyncDep');
		} catch(e) {
			exceptionThrown = true;
		}
		exceptionThrown.should.be.true;
		require(['require', 'module', 'exports', './asyncDep'], function(require, reqModule, reqExports, asyncDep) {
			reqModule.id.should.be.eql(module.id);
			reqExports.should.be.eql(exports);
			asyncDep.should.be.eql("asyncDep");
			// context require
			require("./asyncDep").should.be.eql(asyncDep);
			require('test/asyncDep').should.be.eql(asyncDep);
			done();
		});
	});

	it("runtime require failures", function(done) {
		var notTrue;
		if (notTrue) {
			// async require we don't execute just so webpack knows about the dependency
			require(["test/asyncDep2"], function() {});
		}
		// Synchronous require should fail
		try {
			require('test/asyncDep2');
			should.fail("Expected exception thrown");
		} catch(ignore) {}

		var waitForError = new Promise(function(resolve) {
			var handle = require.on("error", function(error) {
				handle.remove();
				error.info.length.should.be.eql(2);
				resolve();
			});
		});
		// Runtime async require should fail because the chunk hasn't been loaded yet.
		var deps = ["missing", "test/asyncDep2"];
		require(deps, function() {
			done(new Error("rutime require callback should not be called"));
		});

		waitForError.then(function() {
			// Call webpack's require.ensure to load the chunk containing test/asyncDep2
			require.ensure(["test/asyncDep2"], function() {
				// Synchonous require should still fail because module hasn't been defined.
				try {
					require('test/asyncDep2');
					should.fail("Expected exception thrown");
				} catch(ignore) {}

				waitForError = new Promise(function(resolve) {
					var handle = require.on("error", function(error) {
						handle.remove();
						error.info.length.should.be.eql(1);
						error.info[0].mid.should.be.eql("missing");
						resolve();
					});
				});
				// This time, runtime async require should succeed because chunk is loaded
				require(deps, function() {
					done(new Error("rutime require callback should not be called"));
				});
				waitForError.then(function() {
					require("test/asyncDep2").should.be.eql("asyncDep2");
					done();
				});

			});
		});
	});

	dep.runTests();

});
