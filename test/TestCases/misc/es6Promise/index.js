define(['amd/dojoES6Promise.js'], function(Promise) {

	it("Promise should resolve.", function(done) {
		var check = false;
		var promise = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve");
			}, 10);
		});
		promise.then(function(data) {
			data.should.be.eql("resolve");
			check.should.be.eql(true);
			done();
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
		check = true;
	});

	it("Promise should reject.", function(done) {
		var check = false;
		var promise = new Promise(function(resolve__, reject) {
			window.setTimeout(function() {
				reject(new Error("rejected"));
			}, 10);
		});
		promise.then(function() {
			done(new Error("Promise should reject"));
		}).catch(function(err) {
			check.should.be.eql(true);
			err.message.should.be.eql("rejected");
			done();
		});
		check = true;
	});

	it("Promise.resolve should return resolved promise", function(done) {
		var check = false;
		var promise = Promise.resolve("resolved");
		promise.then(function(data) {
			data.should.be.eql("resolved");
			check.should.be.eql(true);
			done();
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
		check = true;
	});

	it("Promise.reject should return a rejected promise", function(done) {
		var check = false;
		var promise = Promise.reject(new Error("rejected"));
		promise.then(function() {
			done(new Error("Promise should reject"));
		}).catch(function(err) {
			err.message.should.be.eql("rejected");
			check.should.be.eql(true);
			done();
		});
		check = true;
	});

	it("Promise.race should resolve correctly", function(done) {
		var check = false;
		var promise1 = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve1");
			}, 10);
		});
		var promise2 = new Promise(function() {});
		Promise.race([promise1, promise2]).then(function(data) {
			data.should.be.eql("resolve1");
			check.should.be.eql(true);
			done();
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
		check = true;
	});

	it("Promise.all should resolve correctly" , function(done) {
		var promise1 = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve1");
			}, 10);
		});
		var promise2 = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve2");
			}, 100);
		});
		Promise.all([promise1, promise2]).then(function(data) {
			data[0].should.be.eql("resolve1");
			data[1].should.be.eql("resolve2");
			done();
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
	});

	it("Promise.finally should be called on resolved promises", function(done) {
		var promise = Promise.resolve("resolved");
		var check = false, cbCalled = false;
		promise.then(function(data) {
			cbCalled = true;
			data.should.be.eql("resolved");
			check.should.be.eql(true);
		}).catch(function() {
			done(new Error("Promise rejected"));
		}).finally(function() {
			cbCalled.should.be.eql(true);
			done();
		});
		check = true;
	});

	it("Promise.finally should be called on rejected promises", function(done) {
		var promise = Promise.reject(new Error("rejected"));
		var check = false, cbCalled = false;
		promise.then(function() {
			done(new Error("Promise rejected"));
		}).catch(function(err) {
			cbCalled = true;
			err.message.should.be.eql("rejected");
			check.should.be.eql(true);
		}).finally(function() {
			cbCalled.should.be.eql(true);
			done();
		});
		check = true;
	});

	it("Promise.finally should be called when it's the only handler", function(done) {
		var promise = Promise.reject(new Error("rejected"));
		var check = false;
		promise.finally(function() {
			check.should.be.eql(true);
			done();
		});
		check = true;
	});

});
