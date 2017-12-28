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
 * A thin wrapper that implements an ES6 Promise polyfill using Dojo promises.
 * Much smaller than other Promise polyfills if the Dojo modules are already
 * being used.
 */
 define([
	"dojo/Deferred",
	"dojo/promise/all",
	"dojo/promise/first",
	"dojo/_base/lang",
	"dojo/_base/array"
], function(
	Deferred,
	all,
	first,
	lang,
	array
) {
	"use strict";

	var Promise, freezeObject = Object.freeze || function(){};

	function wrap(dojoPromise) {
		var result = new Promise();
		result.promise = dojoPromise;
		freezeObject(result);
		return result;
	}

	Promise = lang.extend(function PromiseWrapper(executor) {
		// Create a new dojo/Deferred
		var dfd = new Deferred();
		this.promise = dfd.promise;
		executor(
			function(value) { dfd.resolve(value, false); },
			function (reason) { dfd.reject(reason, false); }
		);
		freezeObject(this);
	}, {
		'catch': function(onRejected) {
			return wrap(this.promise.otherwise(onRejected));
		},
		then: function(onFullfilled, onRejected) {
			return wrap(this.promise.then(onFullfilled, onRejected));
		}
	});
	Promise.all = function(iterable) {
		return wrap(all(array.map(iterable, function(wrapped) {return wrapped.promise;})));
	};
	Promise.race = function(iterable) {
		return wrap(first(array.map(iterable, function(wrapped) {return wrapped.promise;})));
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
