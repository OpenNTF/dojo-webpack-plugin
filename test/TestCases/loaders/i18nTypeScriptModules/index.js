define(["dojo/i18n!./nls/strings", "./nls/de-at/strings"], function(strings) {
	it("should load the strings if generated with typescript (require, exports)", function() {
		strings.hello.should.be.eql("xyz-de");
	});
});
