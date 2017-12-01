var strings1 = require("dojo/i18n!./nls/stringsNoRoot");
var strings2 = require("dojo/i18n!./nls/strings");
it("should load the strings", function() {
	strings1.hello.should.be.eql("Hello");
	strings2.goodby.should.be.eql("Good by");
});
module.exports = {};
