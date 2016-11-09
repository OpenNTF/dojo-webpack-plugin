var DojoWebpackPlugin = require(/*"dojo-webpack-plugin"*/ "../index.js");	// load locally

var loaderConfig = require("./js/loaderConfig");
var path = require("path");
var webpack = require("webpack");

module.exports = {
	context: __dirname,
    entry: "./entry.js",
    output: {
        path: path.join(__dirname, "release"),
        publicPath: "release/",
        pathinfo: true,
        filename: "bundle.js"
    },
    module: {
        loaders: [
      		{ test: /\.(png)|(gif)$/, loader: "url?limit=100000" }
        ]
    },
    plugins: [
        new DojoWebpackPlugin({
        	loaderConfig: loaderConfig,
        	locales: ["en"]
        }),
        // For plugins registered after the DojoAMDPlugin, data.request has been normalized and
        // resolved to an absMid and loader-config maps and aliases have been applied
		new webpack.NormalModuleReplacementPlugin(/^dojox\/gfx\/renderer!/, "dojox/gfx/canvas"),
        new webpack.NormalModuleReplacementPlugin(
        	/^js\/css!/, function(data) {
        		data.request = data.request.replace(/^js\/css!/, "!style!css!less!")
        	}
        ),
        new webpack.optimize.UglifyJsPlugin({
        	output: {comments: false}
        })
    ],
    resolveLoader: { 
    	root: path.join(__dirname, "../node_modules")
    },
    devtool: "#source-map"
}