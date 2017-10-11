define(["dojo/_base/config", "dojo/i18n!./nls/strings1", "dojo/i18n!./nls/strings2"], function(config, strings1, strings2) {
	const lang = config.locale ? config.locale : "default";
	it(`should load strings for ${lang} language`, function() {
		strings1.hello.should.be.eql(lang === "fr" ? "Bonjoure" : lang === "es" ? "Hola" : "Hello");
		strings2.goodby.should.be.eql(lang === "fr" ? "Bon par" : lang === "de" ? "Auf Wiedersehen" : "Good by");
		it("should load locale specific strings", function(done) {
			// load a locale specific bundle
			require(["dojo/i18n!./nls/fr/strings1"], function(strings) {
				strings.hello.should.be.eql("Bonjoure");
				done();
			});
		});
	});
});