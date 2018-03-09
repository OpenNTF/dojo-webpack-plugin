/*
 * (C) Copyright IBM Corp. 2012, 2016 All Rights Reserved.
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
const {HookMap} = require("tapable");
const {
	Tapable,
	SyncHook,
	SyncBailHook,
	SyncWaterfallHook,
	AsyncSeriesWaterfallHook
} = require("tapable");

function canonicalizeName(name) {
	return name.replace(/[- ]([a-z])/g, str => str.substr(1).toUpperCase());
}
function getHook(obj, name) {
	const parts = name.split(' ');
  var hook = obj.hooks[canonicalizeName(name)];
  if (parts.length > 1) {
    if (obj.hooks[parts[0]] instanceof HookMap) {
      hook = obj.hooks[parts[0]].for(canonicalizeName(parts.slice(1).join(' ')));
    }
  }
  return hook;
};

module.exports = {
	isV4: true,
	Tapable: Tapable,
	evaluateIdentifierName: "evaluateIdentifier",
	evaluateTypeofName: "evaluateTypeof",
	moduleFactoryParserHookName: "parser javascript/auto",

	reg: function(obj, events) {
		events = Object.entries(events);
		events.forEach(event => {
			var name = event[0];
			if (!obj.hooks) {
				obj.hooks = {};
			}
			name = canonicalizeName(name);
			const hook = getHook(obj, name);
			if (hook) {
				throw new Error(`Hook ${name} already registered`);
			}
			const hookType = event[1][0];
			const args = event.slice(1);
			switch(hookType) {
				case "Sync": obj.hooks[name] = new SyncHook(args); break;
				case "SyncBail" : obj.hooks[name] = new SyncBailHook(args); break;
				case "SyncWaterfall" : obj.hooks[name] = new SyncWaterfallHook(args); break;
				case "AsyncSeriesWaterfall" : obj.hooks[name] = new AsyncSeriesWaterfallHook(args); break;

				default: {
					throw new Error(`Unsupported hook type ${hookType}`);
				};
			}
		});
	},

  tap: function(obj, events, context, options) {
		if (!Array.isArray(events)) {
      events = Object.entries(events);
		}
		events.forEach(event => {
      var names = event[0];
      if (!Array.isArray(names)) {
        names = [names];
      }
			names.forEach(name => {
        const hook = getHook(obj, name);
				if (!hook) {
			    throw new Error(`No hook for ${name} in object ${obj.constructor.name}`);
			  }
        var method = "tap";
        var callback = event[1];
				if (hook.constructor.name.startsWith("Async")) {
					method = "tapAsync";
				}
				var pluginName = module.exports.pluginName;
				if (options) {
					pluginName = Object.assign({}, options);
					pluginName.name = module.exports.pluginName;
				}
				hook[method](pluginName, context ?  callback.bind(context) : callback);
			});
		});
	},

  syncCallHook(hookClass, obj, name, ...args) {
    const hook = getHook(obj, name);
		if (!hook) {
	    throw new Error(`No hook for ${name} in object ${obj.constructor.name}`);
	  }
		if (!(hook instanceof hookClass)) {
			throw new Error(`Attempt to call ${hook.constructor.name} from a ${hookClass.name} call`);
		}
    return hook.call(...args);
  },
	callSync(obj, name, ...args) {
    return module.exports.syncCallHook(SyncHook, obj, name, ...args);
  },
  callSyncWaterfall(obj, name, ...args) {
    return module.exports.syncCallHook(SyncWaterfallHook, obj, name, ...args);
  },
  callSyncBail(obj, name, ...args) {
    return module.exports.syncCallHook(SyncBailHook, obj, name, ...args);
  },

	pluginName: "dojo-webpack-plugin"
};