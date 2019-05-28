define(['require', '.'], function(require, main) {
	return function() {
		main.should.be.eql("bar/main");
		require('.').should.be.eql("bar/main");
		require.toUrl('foo/main').should.be.eql('sub/foo/../../sub/bar/main');
	};
});