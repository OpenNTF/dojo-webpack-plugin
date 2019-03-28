/*
 * (C) Copyright HCL Technologies Ltd. 2019
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
	"dojo/promise/Promise",
	"dojo/promise/all",
	"dojo/promise/first",
	"dojo/_base/lang",
	"dojo/_base/array"
], function(
	Deferred,
	DojoPromise,
	all,
	first,
	lang,
	array
) {
	"use strict";

	var Promise;

	function wrap(dojoPromise) {
		return new Promise(dojoPromise);
	}

	function newAsyncCallback(dojoPromise, cb) {
		if (typeof cb !== 'function') return cb;
		if (!dojoPromise.isFulfilled()) return cb;
		return function() {
			var args = arguments;
			var dfd = new Deferred();
			setTimeout(function() {
				try {
					dfd.resolve(cb.apply(null, args));
				} catch (err) {
					dfd.reject(err);
				}
			}, 0);
			return dfd.promise;
		};
	}
	Promise = lang.extend(function PromiseWrapper(executor) {
		if (executor instanceof DojoPromise) {
			// wrapping an existing Dojo promise
			this.promise = executor;
		} else {
			// Create a new dojo/Deferred
			var dfd = new Deferred();
			this.promise = dfd.promise;
			executor(
				function(value) { dfd.resolve(value, false); },
				function (reason) { dfd.reject(reason, false); }
			);
		}
	}, {
		'catch': function(onRejected) {
			return wrap(this.promise.otherwise(
				newAsyncCallback(this.promise, onRejected)
			));
		},
		then: function(onFullfilled, onRejected) {
			return wrap(this.promise.then(
				newAsyncCallback(this.promise, onFullfilled),
				newAsyncCallback(this.promise, onRejected)
			));
		},
		finally: function(onSettled) {
			return wrap(this.promise.always(
				newAsyncCallback(this.promise, onSettled)
			));
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
