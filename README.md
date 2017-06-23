# Introduction

**dojo-webpack-plugin** is a [Webpack](https://webpack.github.io/) plugin that supports using Webpack 1.x to build Dojo 1.x applications that use Asyncronous Module Definition (AMD).  This plugin has been tested with Webpack 1.15 and Dojo 1.10.  Features include:

* Support for Dojo loader config properties, including `baseUrl`, `paths`, `packages`, `map` and `aliases`
* Support for client-side synchronous and asynchronous `require()` calls for packed modules.
* Webpack loader implementations of standard Dojo loaders (e.g. `dojo/has`, `dojo/i18n`).
* Limited support for client side execution of some Dojo loaders.

# The Dojo loader

**dojo-webpack-plugin** uses the Dojo loader (dojo.js) at build time to resolve modules based on the properties specified in the Dojo loader config.  In addition, a stripped-down build of the loader, as well as the loader config, are embedded in the packed application to support client-side execution of `require()` calls that have not been transformed by Webpack at build time (i.e. `require()` calls that reference non-stactic variables).  Synchronous `require()` (e.g. `require('foo')`), which returns a reference to an already loaded module or else throws an exception, is supported, as are the `require.toAbsMid()` and `require.toUrl()` functions.

This package does not include the Dojo loader.  A custom build of the Dojo loader is built by Webpack based on the location of Dojo specified in the Dojo loader config.  Alternatively, the location of a previously built loader may be specified using the `loader` option.  See [Building the Dojo loader](#building-the-dojo-loader).  

# The Dojo loader config

The loader config defines properties used in resolving module identifiers as described in [Configuring Dojo with dojoConfig](https://dojotoolkit.org/documentation/tutorials/1.7/dojo_config/).  Note that not all properties in the loader config are used by Webpack.  Only properties relating to module name/path resolution are used.  These include `baseUrl`, `packages`, `paths`, `map` and `aliases`.  The loader config may also specify a `has` map of feature-name/value pairs. The `has` features are used in resolving `dojo/has` loader conditionals at build time, and to provide the initial values for the run-time has.js feature detection functionality provided by `dojo/has`.  The loader config is specified by the `loaderConfig` options property:

    plugins: [
      new requre("dojo-webpack-plugin")({
          loaderConfig: require("./loaderConfig"),
          locales: ["en", "es", "fr"]
      }),
    ]

Because the loader config is used to resolve module paths both at build time, and on the client, you may need to conditionally specify some properties, such as `baseUrl`, depending on whether the current environment is node or a browser.  This may be necessary if you need `require.toUrl()` to return a valid URLs on the client.

The loader config may be specified as an object, or as a string which represents the name of a CommonJS module that exports the config.  If you need to do conditional processing within the config on the client, then specify it as a module name, otherwise, all processing will be evaluated at build time.

# Dojo loader extensions

Loader extensions are used to provide special processing when loading modules.  Loader extensions prefix the module being loaded, separated by the `!` character.  Both Dojo and Webpack have the concept of loader extensions and use similar syntax, but the implementation are very different, and they use conflicting terminology.  Dojo refers to them as plugins and Webpack refers to them as loaders.  To avoid confusion, we refer to them both in this document as loader extensions.

Dojo loader extensions generally cannot be used with Webpack.  There are several config only approaches to dealing with Dojo loader extensions that don't require changing your application's code.

* Replace the Dojo loader extension with a compatible Webpack extension.  For example, the `dojo/text` loader extension can be replaced with the Webpack `raw` loader extension.  This can be done with code similar to the following in your `webpack.config.js`.

        plugins: {
            new require("dojo-webpack-plugin)({...}),
            new webpack.NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
                data.request = data.request.replace(/^dojo\/text!/, "raw!");
            })
        }
    This replacement (among others) is automatically configured for you, so you don't need to include this in your webpack.config.js.  It is provided here as an example of what you could do with other loader extensions.


* Replace the entire module expression with the desired module.  Some Dojo loader extensions are used to dynamically load one module or another based on runtime conditions.  An example is the gfx loader, which loads the rendering engine supported by the client.  Since all modern browsers support the `canvas` rendering engine, you can replace the module expression that includes the loader with the module expression for the target module.

        new NormalModuleReplacementPlugin(/^dojox\/gfx\/renderer!/, "dojox/gfx/canvas")

* Implement the Dojo loader extension as a Webpack loader extension.  This is what has been done with the `dojo/i18n` loader extension.

* Use the `dojo/loaderProxy` Webpack loader extension provided by this package to proxy Dojo loader extensions on the client.  More information on this is provided in [The loaderProxy loader extension](#the-loaderproxy-loader-extension).

**dojo-webpack-plugin** defines the following loader extension replacements:

          new webpack.NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!/, "dojo/selector/lite"),
          new webpack.NormalModuleReplacementPlugin(/^dojo\/request\/default!/, "dojo/request/xhr"),
          new webpack.NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
              data.request = data.request.replace(/^dojo\/text!/, "!!raw!");
          })

You can override these replacements by specifying your own replacements in the `plugins` property of your `webpack.config.js` file immediately following the registration of **dojo-webpack-plugin**.

# The dojo/has loader extension

Dojo supports conditionally depending on modules using the `dojo/has` loader extension.  **dojo-webpack-plugin** supports both build-time and run-time resolution of `dojo/has` loader expressions.  Consider the following example:

       define(['dojo/has!foo?js/foo:js/bar'], function(foobar) {
			...
       });

In the above example, if the feature `foo` is truthy in the static `has` features that are defined in the dojo loader config, then the expression will be replaced with the module name `js/foo` at build time.  If `foo` is falsy, but not undefined, then it will be replaced with the module name `js/bar`.  If, on the other hand, the feature `foo` is not defined, then resolution of the expression will be deferred to when the application is loaded in the browser and the run-time value of the feature `foo` will be used to determine which module reference is provided.  Note that for client-side resolution, both resources, `js/foo` and `js/bar`, along with their nested dependencies, will be included in the packed assets.  

For complex feature expressions that contain a mixture of defined and undefined feature names at build time, the runtime expression will be simplified so that it contains only the undefined feature names, and only the modules needed for resolution of the simplified expression on the client will be included in the packed resources.  Modules that are excluded by build time evaluation of the expression with the static `has` features will not be include in the packed resources, unless they are otherwise include by other dependencies.

The **dojo-webpack-plugin** option `coerceUndefinedToFalse` can be used to cause undefined features to evaluate to false at build time.  If this options is true, then there will be no conditional load expressions in the generated code.

# The loaderProxy loader extension

`dojo/loaderProxy` is a Webpack loader extension that enables Dojo loader extensions to run on the client.  Not all Dojo loader extensions may be used this way.  Webpack requires that loader extensions complete synchronously whereas Dojo uses an asynchronous architecture for loader extensions.  When using `dojo/loaderProcy` to proxy a Dojo loader extension in Webpack, the basic requirement is that the Dojo loader extension's `load` method invokes its callback in-line, before returning from the `load` method.  The most common use cases are loader extensions that delegate to `dojo/text` or another supported loader extension to load the resource before doing some processing on the result.  By ensuring that the delegated resources are included in the packed assets, `dojo/loaderProxy` is able to guarantee that resolution of the delgated resources by the Dojo loader extension will occur synchronously.

Consider a simple svg loader extension that loads the specified svg file and fixes up the contents by removing the xml header in the content.  The implementation of the load method might look like this:

        load: function (name, req, callback) {
          req(["dojo/text!" + name], function(text) {
            callback(stripHeader(text).trim());
          });
        }

Here, the load method delegates to a loader extension that is supported by Webpack to load the resource.  If the resource is included in the packed modules, then the `req` callback will be invoked in-line, and thus the `load` method's callback will be invoke in-line.  If the `load` method's callback is not invoked before the `load` method returns, then an exception will be thrown.

You can use `dojo/loaderProxy` with the Webpack NormalModuleReplacementPlugin as follows:

        new webpack.NormalModuleReplacementPlugin(
       	    /^svg!/, function(data) {
        	        var match = /^svg!(.*)$/.exec(data.request);
        	        data.request = "dojo/loaderProxy?loader=svg&deps=dojo/text%21" + match[1] + "!" + match[1];
            }
        )

The general syntax for the `dojo/loaderProxy` loader extension is `dojo/loaderProxy?loader=<loader>&deps=<dependencies>!<resource>` where *loader* specifies the Dojo loader extension to run on the client and *dependencies* specifies a comma separated list of module dependencies to add to the packed resources.  In the example above, if the client code specifies the module as `svg!closeBtn.svg`, then the translated module will be `dojo/loaderProxy?loader=svg&deps=dojo/text%21closeBtn.svg!closeBtn.svg`.  Note the need to URL encode the `!` character so as not to trip up parsing.

Specifying `dojo/text!closeBtn.svg` as a dependency ensures that when it is required by the `svg` loader extension's load method on the client, then the dependency will be resolved in-line and the `load` method's callback will be invoked in-line as required.

# Building the Dojo loader

This plugin uses a custom build of the Dojo loader.  The built loader is packaged as a CommonJS module so that it may be more easily consumed by Webpack.  The loader build config specifies has.js features which exclude unneeded code (e.g. for loading modules) so that the loader embedded into the client is as small as possible (~4KB after uglify and gzip).

The Dojo loader builder assumes that the Dojo `util` directory is a sibling of the `dojo` directory.  If you do not want to build the Dojo loader every time Webpack is run, then you can build it manually and specify the location of the built loader using the `loader` option.  You can produce a manual build of the loader by running the build script in the buildDojo directory.

        node node_modules/dojo-webpack-plugin/buildDojo/build.js ../dojo-release-1.10.0-src/dojo/dojo.js ./release

The example above will build the loader and place it in the `./release` directory, relative to the current directory.  Again, the Dojo util directory must be located at `../dojo-release-1.10.0-src/util` in this example in order for the build to succeed.

To have Webpack use the built loader, specify the location of the loader in the plugin options as follows:

        plugins: [
          new requre("dojo-webpack-plugin")({
              loaderConfig: require("./loaderConfig"),
              locales: ["en"],
              loader: path.join(__directory, "./release/dojo/dojo.js")
          }),
        ]

# Order of Plugin Registration

When using Webpack's NormalModuleReplacementPlugin, the order of the plugin registration relative to the **dojo-webpack-plugin** registration is significant.  **dojo-webpack-plugin** converts the module expressions to an absMid (relative paths resolved, maps and aliases applied), so if the NormalModuleReplacementPlugin is registered after **dojo-webpack-plugin**, then `data.request` will contain the absMid for the module and `data.originalRequest` will contain the original module expression before transformation by **dojo-webpack-plugin**.  If the NormalModuleReplacementPlugin is registered before **dojo-webpack-plugin** then the NormalModuleReplacementPlugin will get to modify the request before **dojo-webpack-plugin** applies its transformations.

# Client-side Execution of non-transformed Async require

Webpack normally transforms async `require()` calls into `__webpack_require__()` calls for the purpose of loading modules at application runtime.  However, if the call references dependencies which cannot be evaluated at build time, then the `require()` call will not be transformed.  Instead, `require()`, as implemented by this plugin, will be called at application runtime on the client and will complete synchronously provided the requested modules are available from chunks that have already been loaded in the client.  If any of the modules requested are not available, then an exception is thrown.

# Sample application

See the sample application at https://github.com/OpenNTF/dojo-webpack-plugin-sample.

https://openntf.github.io/dojo-webpack-plugin-sample/test.html.
