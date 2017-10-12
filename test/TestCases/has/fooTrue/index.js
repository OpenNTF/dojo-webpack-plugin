define(["dojo/has", "dojo/has!foo?./a:./b", "dojo/has!foo?:undef"], function(has, m1, undef) {
  it("should load true module", function(done) {
    has("webpack").should.be.true;
    m1.should.be.eql("a");
		(typeof undef === 'undefined').should.be.true;
    has.add("foo", false, true);
    require(["dojo/has!foo?./c:./d"], function(m2) {
      // module should have been set at build time and not changed just because foo changed
      has("foo").should.be.false;
      m2.should.be.eql("c");
      done();
    });
  });
});
