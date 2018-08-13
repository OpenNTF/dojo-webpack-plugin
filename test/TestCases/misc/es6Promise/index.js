define(['amd/dojoES6Promise.js'], function(Promise) {

	it("Promise should resolve.", function(done) {
		var promise = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve");
			}, 10);
		});
		promise.then(function(data) {
			data.should.be.eql("resolve");
			done();
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
	});

	it("Promise should reject.", function(done) {
		var promise = new Promise(function(resolve__, reject) {
			window.setTimeout(function() {
				reject(new Error("rejected"));
			}, 10);
		});
		promise.then(function() {
			done(new Error("Promise should reject"));
		}).catch(function(err) {
			err.message.should.be.eql("rejected");
			done();
		});
	});

	it("Promise.resolve should return resolved promise", function(done) {
		var promise = Promise.resolve("resolved");
		promise.then(function(data) {
			data.should.be.eql("resolved");
			done();
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
	});

	it("Promise.reject should return a rejected promise", function(done) {
		var promise = Promise.reject(new Error("rejected"));
		promise.then(function() {
			done(new Error("Promise should reject"));
		}).catch(function(err) {
			err.message.should.be.eql("rejected");
			done();
		});
	});

	it("Promise.race should resolve correctly", function(done) {
		var promise1 = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve1");
			}, 10);
		});
		var promise2 = new Promise(function() {});
		Promise.race([promise1, promise2]).then(function(data) {
			data.should.be.eql("resolve1");
			done();
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
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
});
