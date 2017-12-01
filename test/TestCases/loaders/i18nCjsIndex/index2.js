var strings1 = require("dojo/i18n!test/nls/stringsNoRoot");
var strings2 = require("dojo/i18n!./nls/strings");
it("should load the strings", function() {
	strings1.hello.should.be.eql("Hello");
	strings2.goodby.should.be.eql("Bon par");
});
module.exports = {};
