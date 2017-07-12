/*
 * (C) Copyright IBM Corp. 2017 All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * A thin wrapper that implements ES6 promises using Dojo Deferred.  Much smaller than a polyfill if the
 * Dojo modules are already being used and support for ES6 Promises needs to be provided for non-Dojo code
 * (e.g. Webpack 2.x bootstrap code)
 */
 define([
  "dojo/Deferred",
  "dojo/promise/all",
  "dojo/promise/first",
  "dojo/_base/declare"
], function(Deferred, all, first, declare) {
  "use strict";

  var Promise, freezeObject = Object.freeze || function(){};

  function wrap(dojoPromise) {
    var result = new Promise();
    result.promise = dojoPromise;
    freezeObject(result);
    return result;
  }

  Promise = declare([], {
    constructor: function(executor) {
      if (executor) {
        // Create a new dojo/Deferred
        var dfd = new Deferred();
        this.promise = dfd.promise;
        try {
          executor(dfd.resolve, dfd.reject);
        } catch (err) {
          dfd.reject(err);
        }
        freezeObject(this);
      }
    },
    catch: function(onRejected) {
      return wrap(this.promise.otherwise(onRejected));
    },
    then: function(onFullfilled, onRejected) {
      return wrap(this.promise.then(onFullfilled, onRejected));
    },
  });
  Promise.all = function(iterable) {
    return wrap(all(iterable));
  };
  Promise.race = function(iterable) {
    return wrap(first(iterable));
  };
  Promise.reject = function(reason) {
    return wrap((new Deferred()).reject(reason));
  };
  Promise.resolve = function(value) {
    return wrap((new Deferred()).resolve(value));
  };
  if (!window.Promise) {
    window.Promise = Promise;
  };
  return Promise;
});
