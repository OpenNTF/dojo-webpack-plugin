[![npm][npm]][npm-url]
[![builds][builds]][builds-url]
[![coverage][cover]][cover-url]
[![licenses][licenses]][licenses-url]
[![Apache 2.0 License][apache2]][apache2-url]

<div align="center">
  <a href="https://dojotoolkit.org">
  <img width="200" height="200" vspace="" hspace="25" alt="Dojo" title="Dojo"
      src="https://cdn.worldvectorlogo.com/logos/dojo.svg">
  </a>
  <a href="https://github.com/webpack/webpack">
  <img width="200" height="200" vspace="" hspace="25" alt="webpack" title="webpack"
      src="https://cdn.worldvectorlogo.com/logos/webpack-icon.svg">
  </a>
  <h1>dojo-webpack-plugin</h1>
  <p>Build Dojo 1.x applications with webpack<p>
</div>


# Introduction

**dojo-webpack-plugin** is a [Webpack](https://webpack.github.io/) plugin that supports using Webpack to build Dojo 1.x applications that use Asyncronous Module Definition (AMD).  This version supports Webpack 2 and greater.  The plugin has been tested with Webpack 2.2.0 and 3.6.0, and Dojo versions 1.10 through 1.13.  For Webpack 1.x, use the v1 branch of this project.  Features include:

* Support for Dojo loader config properties, including `baseUrl`, `paths`, `packages`, `map` and `aliases`
* Support for client-side synchronous and asynchronous `require()` calls for packed modules.
* Webpack loader implementations of standard Dojo loaders (e.g. `dojo/has`, `dojo/i18n`).
* Limited support for client side execution of some Dojo loader extensions.

See the [Release Notes](#release-notes) for important information about upgrading to from earlier versions of this plugin to 2.1+.

# The Dojo loader

**dojo-webpack-plugin** uses the Dojo loader (dojo.js) at build time to resolve modules based on the properties specified in the Dojo loader config.  In addition, a stripped-down build of the loader, as well as the loader config, are embedded in the packed application to support client-side execution of `require()` calls that have not been transformed by Webpack at build time (i.e. `require()` calls that reference non-stactic variables), as well as Dojo's `require.toAbsMid()` and `require.toUrl()` functions.

Dojo supports a form of `require` (known as synchronous `require`) that has the same signature as CommonJS `require`.  In Dojo, synchronous `require` returns a reference to an already loaded module, or else throws an exception if the module has not already been loaded and initialized.  With this plugin, `require` calls matching the CommonJS/synchronous `require` signature which appear inside of AMD modules are treated as Dojo synchronous `require` calls.  If you wish to load a CommonJS module from within an AMD module, you may do so using the `cjsRequire` function that is supported by the plugin.

This package does not include the Dojo loader.  A custom build of the Dojo loader is built by Webpack based on the location of Dojo specified in the Dojo loader config.  Alternatively, the location of a previously built loader may be specified using the [loader](#loader) option.  See [Building the Dojo loader](#building-the-dojo-loader).  

# The Dojo loader config

The loader config defines properties used in resolving module identifiers as described in [Configuring Dojo with dojoConfig](https://dojotoolkit.org/documentation/tutorials/1.7/dojo_config/).  Note that not all properties in the loader config are used by Webpack.  Only properties relating to module name/path resolution are used.  These include `baseUrl`, `packages`, `paths`, `map` and `aliases`.  The loader config may also specify a `has` map of feature-name/value pairs. The `has` features are used in resolving `dojo/has` loader conditionals at build time, and to provide the initial values for the run-time has.js feature detection functionality provided by `dojo/has`.  The loader config is specified by the `loaderConfig` options property:

<!-- eslint-disable no-undef, semi, comma-dangle-->
```javascript
const DojoWebpackPlugin = require('dojo-webpack-plugin');
//...
plugins: [
	new DojoWebpackPlugin({
		loaderConfig: require("./loaderConfig"),
		locales: ["en", "es", "fr"]
	})
	//...
]
```

Because the loader config is used to resolve module paths both at build time, and on the client, you may need to conditionally specify some properties, such as `baseUrl`, depending on whether the current environment is node or a browser.  This may be necessary if you need `require.toUrl()` to return a valid URLs on the client or if you want to support non-packed versions of the app (e.g. for development).  See [js/loaderConfig.js](https://github.com/OpenNTF/dojo-webpack-plugin-sample/blob/master/js/loaderConfig.js) in the sample project for an example of a Dojo loader config that works both with and without webpack.

The loader config may be specified as an object, or as a string which represents the name of a CommonJS module that exports the config.  If specified as an object, then the config expressions are evaluated at build time and the config is exported to the client as a JSON object that is mixed with the `window.dojoConfig` property at application load time.  

If the config is specified as a module name, then the config module will be evaluated both at build-time (for the purpose of resolving modules for webpack), and then again at application run-time when the config module is loaded on the client.  Note that if you want webpack to process the config module (i.e. perform build time variable substitution, etc.) then you must specify the config as a module name.

In addition, instead of exporting the config, the module may export a function that returns the config.  The function will be called with the value of the [environment](#environment) option.  This mechanism allows for multi-compiler runs that use different configs.  

# Dojo loader extensions

Loader extensions are used to provide special processing when loading modules.  Loader extensions prefix the module being loaded, separated by the `!` character.  Both Dojo and Webpack have the concept of loader extensions and use similar syntax, but the implementation are very different, and they use conflicting terminology.  Dojo refers to them as plugins and Webpack refers to them as loaders.  To avoid confusion, we refer to them both in this document as loader extensions.

Dojo loader extensions generally cannot be used with Webpack.  There are several config only approaches to dealing with Dojo loader extensions that don't require changing your application's code.

* Use the NormalModuleReplacementPlugin to replace the Dojo loader extension with a compatible Webpack loader extension.  For example, the `dojo/text` loader extension can be replaced with the Webpack `raw` loader extension.  This can be done with code similar to the following in your `webpack.config.js`.

	<!-- eslint-disable no-undef, semi, comma-dangle -->
	```javascript
	const DojoWebpackPlugin = require('dojo-webpack-plugin');
	//...
	plugins: [
		new DojoWebpackPlugin({/*...*/}),
		new webpack.NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
			data.request = data.request.replace(/^dojo\/text!/, "!!raw!");
		}),
		//...
	]
	```

  This replacement (among others) is automatically configured for you, so you don't need to include this in your webpack.config.js.  It is provided here as an example of what you could do with other loader extensions.

* Use the NormalModuleReplacementPlugin to replace the entire module expression with the desired module.  Some Dojo loader extensions are used to dynamically load one module or another based on runtime conditions.  An example is the gfx loader, which loads the rendering engine supported by the client.  Since all modern browsers support the `canvas` rendering engine, you can replace the module expression that includes the loader with the module expression for the target module.

	<!-- eslint-disable no-undef, semi-->
	```javascript
	new NormalModuleReplacementPlugin(/^dojox\/gfx\/renderer!/, "dojox/gfx/canvas")
	```

* Implement the Dojo loader extension as a Webpack loader extension.  This is what has been done with the `dojo/i18n` loader extension.

* Use the NormalModuleReplacementPlugin with the `dojo/loaderProxy` loader extension provided by this package to proxy Dojo loader extensions on the client.  More information on this is provided in [The dojo/loaderProxy loader extension](#the-dojoloaderproxy-loader-extension).

**dojo-webpack-plugin** defines the following loader extension replacements:

<!-- eslint-disable no-undef, semi-->
```javascript
new webpack.NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!/, "dojo/selector/lite"),
new webpack.NormalModuleReplacementPlugin(/^dojo\/request\/default!/, "dojo/request/xhr"),
new webpack.NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
	data.request = data.request.replace(/^dojo\/text!/, "!!raw!");
}),
new NormalModuleReplacementPlugin(/^dojo\/query!/, data => {
	var match = /^dojo\/query!(.*)$/.exec(data.request);
	data.request = "dojo/loaderProxy?loader=dojo/query&name=" + match[1] + "!";
})
```

# The dojo/has loader extension

Dojo supports conditionally depending on modules using the `dojo/has` loader extension.  **dojo-webpack-plugin** supports both build-time and run-time resolution of `dojo/has` loader expressions.  Consider the following example:

<!-- eslint-disable no-undef, semi, no-unused-vars -->
```javascript
define(['dojo/has!foo?js/foo:js/bar'], function(foobar) {
	//...
});
```
	
In the above example, if the feature `foo` is truthy in the static `has` features that are defined in the dojo loader config, then the expression will be replaced with the module name `js/foo` at build time.  If `foo` is falsy, but not undefined, then it will be replaced with the module name `js/bar`.  If, on the other hand, the feature `foo` is not defined, then resolution of the expression will be deferred to when the application is loaded in the browser and the run-time value of the feature `foo` will be used to determine which module reference is provided.  Note that for client-side resolution, both resources, `js/foo` and `js/bar`, along with their nested dependencies, will be included in the packed assets.  

For complex feature expressions that contain a mixture of defined and undefined feature names at build time, the runtime expression will be simplified so that it contains only the undefined feature names, and only the modules needed for resolution of the simplified expression on the client will be included in the packed resources.  Modules that are excluded by build time evaluation of the expression with the static `has` features will not be include in the packed resources, unless they are otherwise include by other dependencies.

This plugin defines the `webpack` feature with a value of true if it is not already defined by the app.

The **dojo-webpack-plugin** option `coerceUndefinedToFalse` can be used to cause undefined features to evaluate to false at build time.  If this options is true, then there will be no conditional load expressions in the generated code.

You may use [webpack-hasjs-plugin](https://www.npmjs.com/package/webpack-hasjs-plugin) if you want to perform has.js filtering of source code at build time using statically defined features.  

# The dojo/loaderProxy loader extension

`dojo/loaderProxy` is a Webpack loader extension that enables Dojo loader extensions to run on the client.  Not all Dojo loader extensions may be used this way.  Webpack requires that loader extensions complete synchronously whereas Dojo uses an asynchronous architecture for loader extensions.  When using `dojo/loaderProcy` to proxy a Dojo loader extension in Webpack, the basic requirement is that the Dojo loader extension's `load` method invokes its callback in-line, before returning from the `load` method.  The most common use cases are loader extensions that delegate to `dojo/text` or another supported loader extension to load the resource before doing some processing on the result.  By ensuring that the delegated resources are included in the packed assets, `dojo/loaderProxy` is able to ensure that resolution of the delgated resources by the Dojo loader extension will occur synchronously.

Consider a simple svg loader extension that loads the specified svg file and fixes up the contents by removing the xml header in the content.  The implementation of the load method might look like this:

<!-- eslint-disable no-undef, no-unused-vars-->
```javascript
function load(name, req, callback) {
	req(["dojo/text!" + name], function(text) {
		callback(stripHeader(text).trim());
	});
}
```

Here, the load method delegates to a loader extension that is supported by Webpack to load the resource.  If the resource is included in the packed modules, then the `req` callback will be invoked in-line, and thus the `load` method's callback will be invoke in-line.  If the `load` method's callback is not invoked before the `load` method returns, then an exception will be thrown.

You can use `dojo/loaderProxy` with the Webpack NormalModuleReplacementPlugin as follows:

<!-- eslint-disable no-undef, semi, comma-dangle-->
```javascript
new webpack.NormalModuleReplacementPlugin(
	/^svg!/, function(data) {
		var match = /^svg!(.*)$/.exec(data.request);
		data.request = "dojo/loaderProxy?loader=svg&deps=dojo/text%21" + match[1] + "!" + match[1];
	}
)
```
	
The general syntax for the `dojo/loaderProxy` loader extension is `dojo/loaderProxy?loader=<loader>&deps=<dependencies>&name=<resource>!<resource>` where *loader* specifies the Dojo loader extension to run on the client and *dependencies* specifies a comma separated list of module dependencies to add to the packed resources.  In the example above, if the client code specifies the module as `svg!closeBtn.svg`, then the translated module will be `dojo/loaderProxy?loader=svg&deps=dojo/text%21closeBtn.svg!closeBtn.svg`.  Note the need to URL encode the `!` character so as not to trip up parsing.

Specifying `dojo/text!closeBtn.svg` as a dependency ensures that when it is required by the `svg` loader extension's load method on the client, then the dependency will be resolved in-line and the `load` method's callback will be invoked in-line as required.

The *name* query arg is optional and is provided for cases where the resource name (the text to the right of the "!") does not represent a module.  Since webpack requires the resource name to represent a valid module, you can use the *name* query arg to specify non-module resources.  For example, the loaderProxy URL for `dojo/query!css2` would be `dojo/loaderProxy?loader=dojo/query&name=css2!`. 

# Options

The plugin is instantiated with a properties map specifying the following options:

### loaderConfig

This property is required and specifies the Dojo loader config.  See [The Dojo loader config](#the-dojo-loader-config) for details.

### environment

Used only if the `loaderConfig` is a string specifying the name of a module and that module exports a function which returns the config.  The environment is passed to the function when it is called to get the config.  This should be a JSON type object because it gets stringified for export to the client.

### buildEnvironment

Simialr to `environment`, but used exclusively at build time.  If both are specified, then `buildEnvironment` will be passed to the `loaderConfig` function when building, and `environment` will be passed to the `loaderConfig` function when the built application is loaded in the browser.  This facilitates specifying different `loaderConfig` paths (e.g. `baseUrl`) for build vs. run.  If only `environment` is specified, then it is used for both.

### loader

This property is optional and specifies the module path of the built Dojo loader.  See [Building the Dojo loader](#building-the-dojo-loader) for details.  If not specified, then the loader will be built as part of the Webpack build.

### locales

This property is required and specifies which locale resources should be included in the build.  The property is specified as an array of strings.

### cjsRequirePatterns

This property is optional and specifies an array of regular expressions to use in identifying CommonJS module identifiers within AMD modules.

Dojo supports a form of require, called synchronous require, that can be used to synchronously obtain a reference to an already loaded module, but throws an exception if the module is not already loaded.  Dojo synchronous require has the exact same function signature as CommonJS require, making it impossible to differentiate them.  This is not normally an issue because CommonJS require calls do not typically appear inside of AMD modules, however, some Webpack plugins (e.g. ProvidePlugin) can inject CommonJS require statements directly into your AMD modules.  This property provides a mechanism for those modules to be loaded as CommonJS modules.  If any of the regular expressions specified match the module identifier in a candidate require call (within an AMD module), then the module will be loaded as a CommonJS module.  If none of the patterns match, then the require call will be processed as a Dojo synchronous require call.

If not specified, the default pattern `imports-loader|exports-loader)[?!]` is used.  This pattern will match many of the common use cases for the ProvidePlugin.  Note that if you specify this property, the values you specify **replaces** the default value.

### coerceUndefinedToFalse

This property is optional.  If the value is truthy, then undefined features will be treated as false for the purpose of dojo/has loader plugin feature evaluation at build time.  See [The dojo/has loader extension](#the-dojohas-loader-extension) for more information.

### noConsole

This property is optional.  If the value is truthy, then console output from building the Dojo loader will be suppressed.

# Building the Dojo loader

This plugin uses a custom build of the Dojo loader.  The built loader is packaged as a CommonJS module so that it may be more easily consumed by Webpack.  The loader build config specifies has.js features which exclude unneeded code (e.g. for loading modules) so that the loader embedded into the client is as small as possible (~4KB after uglify and gzip).  The Dojo loader builder requires that the Dojo util directory is a sibling of the `dojo` directory and is named either `util` or `dojo-util`.

If you do not want to build the Dojo loader every time Webpack is run, then you can build it manually and specify the location of the built loader using the `loader` option.  You can produce a manual build of the loader by running the build script in the buildDojo directory.

        node node_modules/dojo-webpack-plugin/buildDojo/build.js node_modules/dojo/dojo.js ./release

The example above will build the loader and place it in the `./release` directory, relative to the current directory.  

To have Webpack use the built loader, specify the location of the loader in the plugin options as follows:

<!-- eslint-disable no-undef, semi, comma-dangle-->
```javascript
plugins: [
	new requre("dojo-webpack-plugin")({
		loaderConfig: require("./loaderConfig"),
		locales: ["en"],
		loader: path.join(__directory, "./release/dojo/dojo.js")
	}),
]
```

# ES6 Promise dependency in Webpack 2.x

Webpack 2.x includes code in your packed application that uses ES6 Promise.  If you need to support browsers that lack ES6 Promise support (e.g. IE 11), then you will need to provide this capability in your application.  This plugin provides a tiny wrapper module named [dojoES6Promise](https://github.com/OpenNTF/dojo-webpack-plugin/blob/master/amd/dojoES6Promise.js) that implements ES6 Promise using dojo/Deferred.  All you need to do is include this module as an AMD dependency in your application.  See [bootstrap.js](https://github.com/OpenNTF/dojo-webpack-plugin-sample/blob/master/js/bootstrap.js) in the sample application for an example.

# Order of Plugin Registration

When using Webpack's NormalModuleReplacementPlugin, the order of the plugin registration relative to the **dojo-webpack-plugin** registration is significant.  **dojo-webpack-plugin** converts the module expressions to an absMid (relative paths resolved, maps and aliases applied), so if the NormalModuleReplacementPlugin is registered after **dojo-webpack-plugin**, then `data.request` will contain the absMid for the module and `data.originalRequest` will contain the original module expression before transformation by **dojo-webpack-plugin**.  If the NormalModuleReplacementPlugin is registered before **dojo-webpack-plugin** then the NormalModuleReplacementPlugin will get to modify the request before **dojo-webpack-plugin** applies its transformations.

# Client-side Execution of non-transformed Async require

Webpack normally transforms async `require()` calls into `__webpack_require__()` calls for the purpose of loading modules at application runtime.  However, if the call references dependencies which cannot be evaluated at build time, then the `require()` call will not be transformed.  Instead, `require()`, as implemented by this plugin, will be called at application runtime on the client and will complete synchronously (callback invoked prior to returning) provided the requested modules are available from chunks that have already been loaded in the client.  If any of the modules requested are not available, then an exception will be thrown.  This restriction is necessary because webpack uses a synchronous model for resolving dependencies at application runtime.  Only the loading of webpack chunks is allowed to complete asynchronously.

This can be an issue if your application utilizes the Dojo parser's [Auto-Require](https://dojotoolkit.org/documentation/tutorials/1.10/declarative/#auto-require) capability for loading modules of declaratively instanciated widgets.  Although useful for prototyping and demo purposes, Dojo itself recommends against using Auto-Require for production code because of it's negative performance consequences, and to instead be explicit about your application's dependencies.

# Dependency requirements

**dojo-webpack-plugin** has a peer dependency on webpack.  **dojo-webpack-plugin**'s webpack dependencies must resolve to the same modules as your applicaiton's webpack dependencies, otherwise you may encounter errors similar to the following when building.

```
Error: Cannot find module 'webpack-core/lib/ConcatSource'
```

The best way to ensure that the requirement is met is to make sure that both this plugin and webpack are installed in the same `node_modules` directory, and to use flat, rather than hierarchical, tree dependency resolution (the default for npm v3 and above) when using npm to install the packages.

# Related plugins

* [webpack-hasjs-plugin](https://www.npmjs.com/package/webpack-hasjs-plugin) - Performs has.js filtering of source code at build time based on statically defined features.

* [webpack-i18n-extractor-plugin](https://www.npmjs.com/package/webpack-i18n-extractor-plugin) - Extracts NLS resources from the application chunks and places them in language/chunk specific bundles that are automatically loaded as needed for the current locale.

# Sample application

See the sample application at https://github.com/OpenNTF/dojo-webpack-plugin-sample.

https://openntf.github.io/dojo-webpack-plugin-sample/test.html.

# Release Notes

The versions of Dojo listed below require version 2.1.0 of this plugin to work correctly.  Attempting to use earlier versions of this plugin with the listed versions of Dojo will result in the error "Dojo require not yet initialized" when building.

* 1.13.0 and later
* 1.12.3 and later
* 1.11.5 and later
* 1.10.9 and later

In addition, Dojo loaders built with earlier versions of the plugin will not work with 2.1.0 or later, even if you have not changed the version of Dojo you are building with.  If you are using a pre-built loader with the [loader](#loader) config option, then you will need to rebuild it when upgrading to 2.1.

[npm]: https://img.shields.io/npm/v/dojo-webpack-plugin.svg
[npm-url]: https://npmjs.com/package/dojo-webpack-plugin
[builds-url]: https://travis-ci.org/OpenNTF/dojo-webpack-plugin
[builds]: https://travis-ci.org/OpenNTF/dojo-webpack-plugin.svg?branch=master
[cover-url]: https://coveralls.io/github/OpenNTF/dojo-webpack-plugin?branch=master
[cover]: https://coveralls.io/repos/github/OpenNTF/dojo-webpack-plugin/badge.svg?branch=master
[licenses-url]: https://app.fossa.io/api/projects/git%2Bgithub.com%2FOpenNTF%2Fdojo-webpack-plugin
[licenses]: https://app.fossa.io/api/projects/git%2Bgithub.com%2FOpenNTF%2Fdojo-webpack-plugin.svg?type=shield
[apache2]: https://img.shields.io/badge/license-Apache%202-blue.svg
[apache2-url]: https://www.apache.org/licenses/LICENSE-2.0.txt
