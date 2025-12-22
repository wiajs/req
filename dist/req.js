/*!
  * @wia/req v1.7.33
  * (c) 2024-2025 Sibyl Yu, Matt Zabriskie and contributors
  * Released under the MIT License.
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.req = factory());
})(this, (function () { 'use strict';

  function bind$1(fn, thisArg) {
      return function wrap() {
          return fn.apply(thisArg, arguments);
      };
  }

  // utils is a library of generic helper functions non-specific to axios
  const { toString: toString$1 } = Object.prototype;
  const { getPrototypeOf: getPrototypeOf$1 } = Object;
  const kindOf$1 = ((cache)=>(thing)=>{
          const str = toString$1.call(thing);
          return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
      })(Object.create(null));
  const kindOfTest$1 = (type)=>{
      type = type.toLowerCase();
      return (thing)=>kindOf$1(thing) === type;
  };
  const typeOfTest$1 = (type)=>(thing)=>typeof thing === type;
  /**
   * Determine if a value is an Array
   *
   * @param {Object} val The value to test
   *
   * @returns {boolean} True if value is an Array, otherwise false
   */ const { isArray: isArray$1 } = Array;
  /**
   * Determine if a value is undefined
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if the value is undefined, otherwise false
   */ const isUndefined$1 = typeOfTest$1('undefined');
  /**
   * Determine if a value is a Buffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Buffer, otherwise false
   */ function isBuffer$1(val) {
      return val !== null && !isUndefined$1(val) && val.constructor !== null && !isUndefined$1(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
  }
  /**
   * Determine if a value is an ArrayBuffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is an ArrayBuffer, otherwise false
   */ const isArrayBuffer$1 = kindOfTest$1('ArrayBuffer');
  /**
   * Determine if a value is a view on an ArrayBuffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
   */ function isArrayBufferView$1(val) {
      let result;
      if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
          result = ArrayBuffer.isView(val);
      } else {
          result = val && val.buffer && isArrayBuffer$1(val.buffer);
      }
      return result;
  }
  /**
   * Determine if a value is a String
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a String, otherwise false
   */ const isString$1 = typeOfTest$1('string');
  /**
   * Determine if a value is a Function
   *
   * @param {*} val The value to test
   * @returns {boolean} True if value is a Function, otherwise false
   */ const isFunction$1 = typeOfTest$1('function');
  /**
   * Determine if a value is a Number
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Number, otherwise false
   */ const isNumber$1 = typeOfTest$1('number');
  /**
   * Determine if a value is an Object
   *
   * @param {*} thing The value to test
   *
   * @returns {boolean} True if value is an Object, otherwise false
   */ const isObject$1 = (thing)=>thing !== null && typeof thing === 'object';
  /**
   * Determine if a value is a Boolean
   *
   * @param {*} thing The value to test
   * @returns {boolean} True if value is a Boolean, otherwise false
   */ const isBoolean$1 = (thing)=>thing === true || thing === false;
  /**
   * Determine if a value is a plain Object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a plain Object, otherwise false
   */ const isPlainObject$1 = (val)=>{
      if (kindOf$1(val) !== 'object') {
          return false;
      }
      const prototype = getPrototypeOf$1(val);
      return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
  };
  /**
   * Determine if a value is a Date
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Date, otherwise false
   */ const isDate$1 = kindOfTest$1('Date');
  /**
   * Determine if a value is a File
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a File, otherwise false
   */ const isFile$1 = kindOfTest$1('File');
  /**
   * Determine if a value is a Blob
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Blob, otherwise false
   */ const isBlob$1 = kindOfTest$1('Blob');
  /**
   * Determine if a value is a FileList
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a File, otherwise false
   */ const isFileList$1 = kindOfTest$1('FileList');
  /**
   * Determine if a value is a Stream
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Stream, otherwise false
   */ const isStream$1 = (val)=>isObject$1(val) && isFunction$1(val.pipe);
  /**
   * Determine if a value is a FormData
   *
   * @param {*} thing The value to test
   *
   * @returns {boolean} True if value is an FormData, otherwise false
   */ const isFormData$1 = (thing)=>{
      let kind;
      return thing && (typeof FormData === 'function' && thing instanceof FormData || isFunction$1(thing.append) && ((kind = kindOf$1(thing)) === 'formdata' || // detect form-data instance
      kind === 'object' && isFunction$1(thing.toString) && thing.toString() === '[object FormData]'));
  };
  /**
   * Determine if a value is a URLSearchParams object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a URLSearchParams object, otherwise false
   */ const isURLSearchParams$1 = kindOfTest$1('URLSearchParams');
  const [isReadableStream$1, isRequest$1, isResponse$1, isHeaders$1] = [
      'ReadableStream',
      'Request',
      'Response',
      'Headers'
  ].map(kindOfTest$1);
  /**
   * Trim excess whitespace off the beginning and end of a string
   *
   * @param {String} str The String to trim
   *
   * @returns {String} The String freed of excess whitespace
   */ const trim$1 = (str)=>str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  /**
   * Iterate over an Array or an Object invoking a function for each item.
   *
   * If `obj` is an Array callback will be called passing
   * the value, index, and complete array for each item.
   *
   * If 'obj' is an Object callback will be called passing
   * the value, key, and complete object for each property.
   *
   * @param {Object|Array} obj The object to iterate
   * @param {Function} fn The callback to invoke for each item
   *
   * @param {Boolean} [allOwnKeys = false]
   * @returns {any}
   */ function forEach$1(obj, fn, { allOwnKeys = false } = {}) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
          return;
      }
      let i;
      let l;
      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
          /*eslint no-param-reassign:0*/ obj = [
              obj
          ];
      }
      if (isArray$1(obj)) {
          // Iterate over array values
          for(i = 0, l = obj.length; i < l; i++){
              fn.call(null, obj[i], i, obj);
          }
      } else {
          // Iterate over object keys
          const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
          const len = keys.length;
          let key;
          for(i = 0; i < len; i++){
              key = keys[i];
              fn.call(null, obj[key], key, obj);
          }
      }
  }
  function findKey$1(obj, key) {
      key = key.toLowerCase();
      const keys = Object.keys(obj);
      let i = keys.length;
      let _key;
      while(i-- > 0){
          _key = keys[i];
          if (key === _key.toLowerCase()) {
              return _key;
          }
      }
      return null;
  }
  const _global$1 = (()=>{
      /*eslint no-undef:0*/ if (typeof globalThis !== "undefined") return globalThis;
      return typeof self !== "undefined" ? self : typeof window !== 'undefined' ? window : global;
  })();
  const isContextDefined$1 = (context)=>!isUndefined$1(context) && context !== _global$1;
  /**
   * Accepts varargs expecting each argument to be an object, then
   * immutably merges the properties of each object and returns result.
   *
   * When multiple objects contain the same key the later object in
   * the arguments list will take precedence.
   *
   * Example:
   *
   * ```js
   * var result = merge({foo: 123}, {foo: 456});
   * console.log(result.foo); // outputs 456
   * ```
   *
   * @param {Object} obj1 Object to merge
   *
   * @returns {Object} Result of all merge properties
   */ function merge$1() {
      const { caseless } = isContextDefined$1(this) && this || {};
      const result = {};
      const assignValue = (val, key)=>{
          const targetKey = caseless && findKey$1(result, key) || key;
          if (isPlainObject$1(result[targetKey]) && isPlainObject$1(val)) {
              result[targetKey] = merge$1(result[targetKey], val);
          } else if (isPlainObject$1(val)) {
              result[targetKey] = merge$1({}, val);
          } else if (isArray$1(val)) {
              result[targetKey] = val.slice();
          } else {
              result[targetKey] = val;
          }
      };
      for(let i = 0, l = arguments.length; i < l; i++){
          arguments[i] && forEach$1(arguments[i], assignValue);
      }
      return result;
  }
  /**
   * Extends object a by mutably adding to it the properties of object b.
   *
   * @param {Object} a The object to be extended
   * @param {Object} b The object to copy properties from
   * @param {Object} thisArg The object to bind function to
   *
   * @param {Boolean} [allOwnKeys]
   * @returns {Object} The resulting value of object a
   */ const extend$1 = (a, b, thisArg, { allOwnKeys } = {})=>{
      forEach$1(b, (val, key)=>{
          if (thisArg && isFunction$1(val)) {
              a[key] = bind$1(val, thisArg);
          } else {
              a[key] = val;
          }
      }, {
          allOwnKeys
      });
      return a;
  };
  /**
   * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
   *
   * @param {string} content with BOM
   *
   * @returns {string} content value without BOM
   */ const stripBOM$1 = (content)=>{
      if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1);
      }
      return content;
  };
  /**
   * Inherit the prototype methods from one constructor into another
   * @param {function} constructor
   * @param {function} superConstructor
   * @param {object} [props]
   * @param {object} [descriptors]
   *
   * @returns {void}
   */ const inherits$1 = (constructor, superConstructor, props, descriptors)=>{
      constructor.prototype = Object.create(superConstructor.prototype, descriptors);
      constructor.prototype.constructor = constructor;
      Object.defineProperty(constructor, 'super', {
          value: superConstructor.prototype
      });
      props && Object.assign(constructor.prototype, props);
  };
  /**
   * Resolve object with deep prototype chain to a flat object
   * @param {Object} sourceObj source object
   * @param {Object} [destObj]
   * @param {Function|Boolean} [filter]
   * @param {Function} [propFilter]
   *
   * @returns {Object}
   */ const toFlatObject$1 = (sourceObj, destObj, filter, propFilter)=>{
      let props;
      let i;
      let prop;
      const merged = {};
      destObj = destObj || {};
      // eslint-disable-next-line no-eq-null,eqeqeq
      if (sourceObj == null) return destObj;
      do {
          props = Object.getOwnPropertyNames(sourceObj);
          i = props.length;
          while(i-- > 0){
              prop = props[i];
              if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
                  destObj[prop] = sourceObj[prop];
                  merged[prop] = true;
              }
          }
          sourceObj = filter !== false && getPrototypeOf$1(sourceObj);
      }while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype)
      return destObj;
  };
  /**
   * Determines whether a string ends with the characters of a specified string
   *
   * @param {String} str
   * @param {String} searchString
   * @param {Number} [position= 0]
   *
   * @returns {boolean}
   */ const endsWith$1 = (str, searchString, position)=>{
      str = String(str);
      if (position === undefined || position > str.length) {
          position = str.length;
      }
      position -= searchString.length;
      const lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
  /**
   * Returns new array from array like object or null if failed
   *
   * @param {*} [thing]
   *
   * @returns {?Array}
   */ const toArray$1 = (thing)=>{
      if (!thing) return null;
      if (isArray$1(thing)) return thing;
      let i = thing.length;
      if (!isNumber$1(i)) return null;
      const arr = new Array(i);
      while(i-- > 0){
          arr[i] = thing[i];
      }
      return arr;
  };
  /**
   * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
   * thing passed in is an instance of Uint8Array
   *
   * @param {TypedArray}
   *
   * @returns {Array}
   */ // eslint-disable-next-line func-names
  const isTypedArray$1 = ((TypedArray)=>{
      // eslint-disable-next-line func-names
      return (thing)=>{
          return TypedArray && thing instanceof TypedArray;
      };
  })(typeof Uint8Array !== 'undefined' && getPrototypeOf$1(Uint8Array));
  /**
   * For each entry in the object, call the function with the key and value.
   *
   * @param {Object<any, any>} obj - The object to iterate over.
   * @param {Function} fn - The function to call for each entry.
   *
   * @returns {void}
   */ const forEachEntry$1 = (obj, fn)=>{
      const generator = obj && obj[Symbol.iterator];
      const iterator = generator.call(obj);
      let result;
      while((result = iterator.next()) && !result.done){
          const pair = result.value;
          fn.call(obj, pair[0], pair[1]);
      }
  };
  /**
   * It takes a regular expression and a string, and returns an array of all the matches
   *
   * @param {string} regExp - The regular expression to match against.
   * @param {string} str - The string to search.
   *
   * @returns {Array<boolean>}
   */ const matchAll$1 = (regExp, str)=>{
      let matches;
      const arr = [];
      while((matches = regExp.exec(str)) !== null){
          arr.push(matches);
      }
      return arr;
  };
  /* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */ const isHTMLForm$1 = kindOfTest$1('HTMLFormElement');
  const toCamelCase$1 = (str)=>{
      return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
          return p1.toUpperCase() + p2;
      });
  };
  /* Creating a function that will check if an object has a property. */ const hasOwnProperty$1 = (({ hasOwnProperty })=>(obj, prop)=>hasOwnProperty.call(obj, prop))(Object.prototype);
  /**
   * Determine if a value is a RegExp object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a RegExp object, otherwise false
   */ const isRegExp$1 = kindOfTest$1('RegExp');
  const reduceDescriptors$1 = (obj, reducer)=>{
      const descriptors = Object.getOwnPropertyDescriptors(obj);
      const reducedDescriptors = {};
      forEach$1(descriptors, (descriptor, name)=>{
          let ret;
          if ((ret = reducer(descriptor, name, obj)) !== false) {
              reducedDescriptors[name] = ret || descriptor;
          }
      });
      Object.defineProperties(obj, reducedDescriptors);
  };
  /**
   * Makes all methods read-only
   * @param {Object} obj
   */ const freezeMethods$1 = (obj)=>{
      reduceDescriptors$1(obj, (descriptor, name)=>{
          // skip restricted props in strict mode
          if (isFunction$1(obj) && [
              'arguments',
              'caller',
              'callee'
          ].indexOf(name) !== -1) {
              return false;
          }
          const value = obj[name];
          if (!isFunction$1(value)) return;
          descriptor.enumerable = false;
          if ('writable' in descriptor) {
              descriptor.writable = false;
              return;
          }
          if (!descriptor.set) {
              descriptor.set = ()=>{
                  throw Error('Can not rewrite read-only method \'' + name + '\'');
              };
          }
      });
  };
  const toObjectSet$1 = (arrayOrString, delimiter)=>{
      const obj = {};
      const define = (arr)=>{
          arr.forEach((value)=>{
              obj[value] = true;
          });
      };
      isArray$1(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
      return obj;
  };
  const noop$1 = ()=>{};
  const toFiniteNumber$1 = (value, defaultValue)=>{
      return value != null && Number.isFinite(value = +value) ? value : defaultValue;
  };
  const ALPHA$1 = 'abcdefghijklmnopqrstuvwxyz';
  const DIGIT$1 = '0123456789';
  const ALPHABET$1 = {
      DIGIT: DIGIT$1,
      ALPHA: ALPHA$1,
      ALPHA_DIGIT: ALPHA$1 + ALPHA$1.toUpperCase() + DIGIT$1
  };
  const generateString$1 = (size = 16, alphabet = ALPHABET$1.ALPHA_DIGIT)=>{
      let str = '';
      const { length } = alphabet;
      while(size--){
          str += alphabet[Math.random() * length | 0];
      }
      return str;
  };
  /**
   * If the thing is a FormData object, return true, otherwise return false.
   *
   * @param {unknown} thing - The thing to check.
   *
   * @returns {boolean}
   */ function isSpecCompliantForm$1(thing) {
      return !!(thing && isFunction$1(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
  }
  const toJSONObject$1 = (obj)=>{
      const stack = new Array(10);
      const visit = (source, i)=>{
          if (isObject$1(source)) {
              if (stack.indexOf(source) >= 0) {
                  return;
              }
              if (!('toJSON' in source)) {
                  stack[i] = source;
                  const target = isArray$1(source) ? [] : {};
                  forEach$1(source, (value, key)=>{
                      const reducedValue = visit(value, i + 1);
                      !isUndefined$1(reducedValue) && (target[key] = reducedValue);
                  });
                  stack[i] = undefined;
                  return target;
              }
          }
          return source;
      };
      return visit(obj, 0);
  };
  const isAsyncFn$1 = kindOfTest$1('AsyncFunction');
  const isThenable$1 = (thing)=>thing && (isObject$1(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);
  // original code
  // https://github.com/DigitalBrainJS/AxiosPromise/blob/16deab13710ec09779922131f3fa5954320f83ab/lib/utils.js#L11-L34
  const _setImmediate$1 = ((setImmediateSupported, postMessageSupported)=>{
      if (setImmediateSupported) {
          return setImmediate;
      }
      return postMessageSupported ? ((token, callbacks)=>{
          _global$1.addEventListener("message", ({ source, data })=>{
              if (source === _global$1 && data === token) {
                  callbacks.length && callbacks.shift()();
              }
          }, false);
          return (cb)=>{
              callbacks.push(cb);
              _global$1.postMessage(token, "*");
          };
      })(`axios@${Math.random()}`, []) : (cb)=>setTimeout(cb);
  })(typeof setImmediate === 'function', isFunction$1(_global$1.postMessage));
  const asap$1 = typeof queueMicrotask !== 'undefined' ? queueMicrotask.bind(_global$1) : typeof process !== 'undefined' && process.nextTick || _setImmediate$1;
  function createErrorType$1(code, message, baseClass) {
      // Create constructor
      function CustomError(properties) {
          Error.captureStackTrace(this, this.constructor);
          Object.assign(this, properties || {});
          this.code = code;
          this.message = this.cause ? `${message}: ${this.cause.message}` : message;
      }
      // Attach constructor and set default properties
      CustomError.prototype = new (baseClass || Error)();
      CustomError.prototype.constructor = CustomError;
      CustomError.prototype.name = `Error [${code}]`;
      return CustomError;
  }
  // *********************
  var utils$2 = {
      isArray: isArray$1,
      isArrayBuffer: isArrayBuffer$1,
      isBuffer: isBuffer$1,
      isFormData: isFormData$1,
      isArrayBufferView: isArrayBufferView$1,
      isString: isString$1,
      isNumber: isNumber$1,
      isBoolean: isBoolean$1,
      isObject: isObject$1,
      isPlainObject: isPlainObject$1,
      isReadableStream: isReadableStream$1,
      isRequest: isRequest$1,
      isResponse: isResponse$1,
      isHeaders: isHeaders$1,
      isUndefined: isUndefined$1,
      isDate: isDate$1,
      isFile: isFile$1,
      isBlob: isBlob$1,
      isRegExp: isRegExp$1,
      isFunction: isFunction$1,
      isStream: isStream$1,
      isURLSearchParams: isURLSearchParams$1,
      isTypedArray: isTypedArray$1,
      isFileList: isFileList$1,
      forEach: forEach$1,
      merge: merge$1,
      extend: extend$1,
      trim: trim$1,
      stripBOM: stripBOM$1,
      inherits: inherits$1,
      toFlatObject: toFlatObject$1,
      kindOf: kindOf$1,
      kindOfTest: kindOfTest$1,
      endsWith: endsWith$1,
      toArray: toArray$1,
      forEachEntry: forEachEntry$1,
      matchAll: matchAll$1,
      isHTMLForm: isHTMLForm$1,
      hasOwnProperty: hasOwnProperty$1,
      hasOwnProp: hasOwnProperty$1,
      reduceDescriptors: reduceDescriptors$1,
      freezeMethods: freezeMethods$1,
      toObjectSet: toObjectSet$1,
      toCamelCase: toCamelCase$1,
      noop: noop$1,
      toFiniteNumber: toFiniteNumber$1,
      findKey: findKey$1,
      global: _global$1,
      isContextDefined: isContextDefined$1,
      ALPHABET: ALPHABET$1,
      generateString: generateString$1,
      isSpecCompliantForm: isSpecCompliantForm$1,
      toJSONObject: toJSONObject$1,
      isAsyncFn: isAsyncFn$1,
      isThenable: isThenable$1,
      setImmediate: _setImmediate$1,
      asap: asap$1,
      createErrorType: createErrorType$1
  };

  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */ function AxiosError$1(message, code, config, request, response) {
      Error.call(this);
      if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
      } else {
          this.stack = new Error().stack;
      }
      this.message = message;
      this.name = 'AxiosError';
      code && (this.code = code);
      config && (this.config = config);
      request && (this.request = request);
      if (response) {
          this.response = response;
          this.status = response.status ? response.status : null;
      }
  }
  utils$2.inherits(AxiosError$1, Error, {
      toJSON: function toJSON() {
          return {
              // Standard
              message: this.message,
              name: this.name,
              // Microsoft
              description: this.description,
              number: this.number,
              // Mozilla
              fileName: this.fileName,
              lineNumber: this.lineNumber,
              columnNumber: this.columnNumber,
              stack: this.stack,
              // Axios
              config: utils$2.toJSONObject(this.config),
              code: this.code,
              status: this.status
          };
      }
  });
  const prototype$3 = AxiosError$1.prototype;
  const descriptors$1 = {};
  [
      'ERR_BAD_OPTION_VALUE',
      'ERR_BAD_OPTION',
      'ECONNABORTED',
      'ETIMEDOUT',
      'ERR_NETWORK',
      'ERR_FR_TOO_MANY_REDIRECTS',
      'ERR_DEPRECATED',
      'ERR_BAD_RESPONSE',
      'ERR_BAD_REQUEST',
      'ERR_CANCELED',
      'ERR_NOT_SUPPORT',
      'ERR_INVALID_URL'
  ].forEach((code)=>{
      descriptors$1[code] = {
          value: code
      };
  });
  Object.defineProperties(AxiosError$1, descriptors$1);
  Object.defineProperty(prototype$3, 'isAxiosError', {
      value: true
  });
  // eslint-disable-next-line func-names
  AxiosError$1.from = (error, code, config, request, response, customProps)=>{
      const axiosError = Object.create(prototype$3);
      utils$2.toFlatObject(error, axiosError, function filter(obj) {
          return obj !== Error.prototype;
      }, (prop)=>{
          return prop !== 'isAxiosError';
      });
      AxiosError$1.call(axiosError, error.message, code, config, request, response);
      axiosError.cause = error;
      axiosError.name = error.name;
      customProps && Object.assign(axiosError, customProps);
      return axiosError;
  };

  // eslint-disable-next-line strict
  var HttpAdapter = null;

  /**
   * Determines if the given thing is a array or js object.
   *
   * @param {string} thing - The object or array to be visited.
   *
   * @returns {boolean}
   */ function isVisitable$1(thing) {
      return utils$2.isPlainObject(thing) || utils$2.isArray(thing);
  }
  /**
   * It removes the brackets from the end of a string
   *
   * @param {string} key - The key of the parameter.
   *
   * @returns {string} the key without the brackets.
   */ function removeBrackets$1(key) {
      return utils$2.endsWith(key, '[]') ? key.slice(0, -2) : key;
  }
  /**
   * It takes a path, a key, and a boolean, and returns a string
   *
   * @param {string} path - The path to the current key.
   * @param {string} key - The key of the current object being iterated over.
   * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
   *
   * @returns {string} The path to the current key.
   */ function renderKey$1(path, key, dots) {
      if (!path) return key;
      return path.concat(key).map(function each(token, i) {
          // eslint-disable-next-line no-param-reassign
          token = removeBrackets$1(token);
          return !dots && i ? '[' + token + ']' : token;
      }).join(dots ? '.' : '');
  }
  /**
   * If the array is an array and none of its elements are visitable, then it's a flat array.
   *
   * @param {Array<any>} arr - The array to check
   *
   * @returns {boolean}
   */ function isFlatArray$1(arr) {
      return utils$2.isArray(arr) && !arr.some(isVisitable$1);
  }
  const predicates$1 = utils$2.toFlatObject(utils$2, {}, null, function filter(prop) {
      return /^is[A-Z]/.test(prop);
  });
  /**
   * Convert a data object to FormData
   *
   * @param {Object} obj
   * @param {?Object} [formData]
   * @param {?Object} [options]
   * @param {Function} [options.visitor]
   * @param {Boolean} [options.metaTokens = true]
   * @param {Boolean} [options.dots = false]
   * @param {?Boolean} [options.indexes = false]
   *
   * @returns {Object}
   **/ /**
   * It converts an object into a FormData object
   *
   * @param {Object<any, any>} obj - The object to convert to form data.
   * @param {string} formData - The FormData object to append to.
   * @param {Object<string, any>} options
   *
   * @returns
   */ function toFormData$1(obj, formData, options) {
      if (!utils$2.isObject(obj)) {
          throw new TypeError('target must be an object');
      }
      // eslint-disable-next-line no-param-reassign
      formData = formData || new (FormData)();
      // eslint-disable-next-line no-param-reassign
      options = utils$2.toFlatObject(options, {
          metaTokens: true,
          dots: false,
          indexes: false
      }, false, function defined(option, source) {
          // eslint-disable-next-line no-eq-null,eqeqeq
          return !utils$2.isUndefined(source[option]);
      });
      const metaTokens = options.metaTokens;
      // eslint-disable-next-line no-use-before-define
      const visitor = options.visitor || defaultVisitor;
      const dots = options.dots;
      const indexes = options.indexes;
      const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
      const useBlob = _Blob && utils$2.isSpecCompliantForm(formData);
      if (!utils$2.isFunction(visitor)) {
          throw new TypeError('visitor must be a function');
      }
      function convertValue(value) {
          if (value === null) return '';
          if (utils$2.isDate(value)) {
              return value.toISOString();
          }
          if (!useBlob && utils$2.isBlob(value)) {
              throw new AxiosError$1('Blob is not supported. Use a Buffer instead.');
          }
          if (utils$2.isArrayBuffer(value) || utils$2.isTypedArray(value)) {
              return useBlob && typeof Blob === 'function' ? new Blob([
                  value
              ]) : Buffer.from(value);
          }
          return value;
      }
      /**
     * Default visitor.
     *
     * @param {*} value
     * @param {String|Number} key
     * @param {Array<String|Number>} path
     * @this {FormData}
     *
     * @returns {boolean} return true to visit the each prop of the value recursively
     */ function defaultVisitor(value, key, path) {
          let arr = value;
          if (value && !path && typeof value === 'object') {
              if (utils$2.endsWith(key, '{}')) {
                  // eslint-disable-next-line no-param-reassign
                  key = metaTokens ? key : key.slice(0, -2);
                  // eslint-disable-next-line no-param-reassign
                  value = JSON.stringify(value);
              } else if (utils$2.isArray(value) && isFlatArray$1(value) || (utils$2.isFileList(value) || utils$2.endsWith(key, '[]')) && (arr = utils$2.toArray(value))) {
                  // eslint-disable-next-line no-param-reassign
                  key = removeBrackets$1(key);
                  arr.forEach(function each(el, index) {
                      !(utils$2.isUndefined(el) || el === null) && formData.append(// eslint-disable-next-line no-nested-ternary
                      indexes === true ? renderKey$1([
                          key
                      ], index, dots) : indexes === null ? key : key + '[]', convertValue(el));
                  });
                  return false;
              }
          }
          if (isVisitable$1(value)) {
              return true;
          }
          formData.append(renderKey$1(path, key, dots), convertValue(value));
          return false;
      }
      const stack = [];
      const exposedHelpers = Object.assign(predicates$1, {
          defaultVisitor,
          convertValue,
          isVisitable: isVisitable$1
      });
      function build(value, path) {
          if (utils$2.isUndefined(value)) return;
          if (stack.indexOf(value) !== -1) {
              throw Error('Circular reference detected in ' + path.join('.'));
          }
          stack.push(value);
          utils$2.forEach(value, function each(el, key) {
              const result = !(utils$2.isUndefined(el) || el === null) && visitor.call(formData, el, utils$2.isString(key) ? key.trim() : key, path, exposedHelpers);
              if (result === true) {
                  build(el, path ? path.concat(key) : [
                      key
                  ]);
              }
          });
          stack.pop();
      }
      if (!utils$2.isObject(obj)) {
          throw new TypeError('data must be an object');
      }
      build(obj);
      return formData;
  }

  /**
   * It encodes a string by replacing all characters that are not in the unreserved set with
   * their percent-encoded equivalents
   *
   * @param {string} str - The string to encode.
   *
   * @returns {string} The encoded string.
   */ function encode$2(str) {
      const charMap = {
          '!': '%21',
          "'": '%27',
          '(': '%28',
          ')': '%29',
          '~': '%7E',
          '%20': '+',
          '%00': '\x00'
      };
      return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
          return charMap[match];
      });
  }
  /**
   * It takes a params object and converts it to a FormData object
   *
   * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
   * @param {Object<string, any>} options - The options object passed to the Axios constructor.
   *
   * @returns {void}
   */ function AxiosURLSearchParams$1(params, options) {
      this._pairs = [];
      params && toFormData$1(params, this, options);
  }
  const prototype$2 = AxiosURLSearchParams$1.prototype;
  prototype$2.append = function append(name, value) {
      this._pairs.push([
          name,
          value
      ]);
  };
  prototype$2.toString = function toString(encoder) {
      const _encode = encoder ? function(value) {
          return encoder.call(this, value, encode$2);
      } : encode$2;
      return this._pairs.map(function each(pair) {
          return _encode(pair[0]) + '=' + _encode(pair[1]);
      }, '').join('&');
  };

  /**
   * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
   * URI encoded counterparts
   *
   * @param {string} val The value to be encoded.
   *
   * @returns {string} The encoded value.
   */ function encode$1(val) {
      return encodeURIComponent(val).replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, '+').replace(/%5B/gi, '[').replace(/%5D/gi, ']');
  }
  /**
   * Build a URL by appending params to the end
   *
   * @param {string} url The base of the url (e.g., http://www.google.com)
   * @param {object} [params] The params to be appended
   * @param {?object} options
   *
   * @returns {string} The formatted url
   */ function buildURL(url, params, options) {
      /*eslint no-param-reassign:0*/ if (!params) {
          return url;
      }
      const _encode = options && options.encode || encode$1;
      const serializeFn = options && options.serialize;
      let serializedParams;
      if (serializeFn) {
          serializedParams = serializeFn(params, options);
      } else {
          serializedParams = utils$2.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams$1(params, options).toString(_encode);
      }
      if (serializedParams) {
          const hashmarkIndex = url.indexOf("#");
          if (hashmarkIndex !== -1) {
              url = url.slice(0, hashmarkIndex);
          }
          url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }
      return url;
  }

  let InterceptorManager = class InterceptorManager {
      /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */ use(fulfilled, rejected, options) {
          this.handlers.push({
              fulfilled,
              rejected,
              synchronous: options ? options.synchronous : false,
              runWhen: options ? options.runWhen : null
          });
          return this.handlers.length - 1;
      }
      /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     *
     * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
     */ eject(id) {
          if (this.handlers[id]) {
              this.handlers[id] = null;
          }
      }
      /**
     * Clear all interceptors from the stack
     *
     * @returns {void}
     */ clear() {
          if (this.handlers) {
              this.handlers = [];
          }
      }
      /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     *
     * @returns {void}
     */ forEach(fn) {
          utils$2.forEach(this.handlers, function forEachHandler(h) {
              if (h !== null) {
                  fn(h);
              }
          });
      }
      constructor(){
          this.handlers = [];
      }
  };
  var InterceptorManager$1 = InterceptorManager;

  var transitionalDefaults = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
  };

  function bind(fn, thisArg) {
      return function wrap() {
          return fn.apply(thisArg, arguments);
      };
  }

  // utils is a library of generic helper functions non-specific to axios
  const { toString } = Object.prototype;
  const { getPrototypeOf } = Object;
  const kindOf = ((cache)=>(thing)=>{
          const str = toString.call(thing);
          return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
      })(Object.create(null));
  const kindOfTest = (type)=>{
      type = type.toLowerCase();
      return (thing)=>kindOf(thing) === type;
  };
  const typeOfTest = (type)=>(thing)=>typeof thing === type;
  /**
   * Determine if a value is an Array
   *
   * @param {Object} val The value to test
   *
   * @returns {boolean} True if value is an Array, otherwise false
   */ const { isArray } = Array;
  /**
   * Determine if a value is undefined
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if the value is undefined, otherwise false
   */ const isUndefined = typeOfTest('undefined');
  /**
   * Determine if a value is a Buffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Buffer, otherwise false
   */ function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
  }
  /**
   * Determine if a value is an ArrayBuffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is an ArrayBuffer, otherwise false
   */ const isArrayBuffer = kindOfTest('ArrayBuffer');
  /**
   * Determine if a value is a view on an ArrayBuffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
   */ function isArrayBufferView(val) {
      let result;
      if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
          result = ArrayBuffer.isView(val);
      } else {
          result = val && val.buffer && isArrayBuffer(val.buffer);
      }
      return result;
  }
  /**
   * Determine if a value is a String
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a String, otherwise false
   */ const isString = typeOfTest('string');
  /**
   * Determine if a value is a Function
   *
   * @param {*} val The value to test
   * @returns {boolean} True if value is a Function, otherwise false
   */ const isFunction = typeOfTest('function');
  /**
   * Determine if a value is a Number
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Number, otherwise false
   */ const isNumber = typeOfTest('number');
  /**
   * Determine if a value is an Object
   *
   * @param {*} thing The value to test
   *
   * @returns {boolean} True if value is an Object, otherwise false
   */ const isObject = (thing)=>thing !== null && typeof thing === 'object';
  /**
   * Determine if a value is a Boolean
   *
   * @param {*} thing The value to test
   * @returns {boolean} True if value is a Boolean, otherwise false
   */ const isBoolean = (thing)=>thing === true || thing === false;
  /**
   * Determine if a value is a plain Object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a plain Object, otherwise false
   */ const isPlainObject = (val)=>{
      if (kindOf(val) !== 'object') {
          return false;
      }
      const prototype = getPrototypeOf(val);
      return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
  };
  /**
   * Determine if a value is a Date
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Date, otherwise false
   */ const isDate = kindOfTest('Date');
  /**
   * Determine if a value is a File
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a File, otherwise false
   */ const isFile = kindOfTest('File');
  /**
   * Determine if a value is a Blob
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Blob, otherwise false
   */ const isBlob = kindOfTest('Blob');
  /**
   * Determine if a value is a FileList
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a File, otherwise false
   */ const isFileList = kindOfTest('FileList');
  /**
   * Determine if a value is a Stream
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Stream, otherwise false
   */ const isStream = (val)=>isObject(val) && isFunction(val.pipe);
  /**
   * Determine if a value is a FormData
   *
   * @param {*} thing The value to test
   *
   * @returns {boolean} True if value is an FormData, otherwise false
   */ const isFormData = (thing)=>{
      let kind;
      return thing && (typeof FormData === 'function' && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === 'formdata' || // detect form-data instance
      kind === 'object' && isFunction(thing.toString) && thing.toString() === '[object FormData]'));
  };
  /**
   * Determine if a value is a URLSearchParams object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a URLSearchParams object, otherwise false
   */ const isURLSearchParams = kindOfTest('URLSearchParams');
  const [isReadableStream, isRequest, isResponse, isHeaders] = [
      'ReadableStream',
      'Request',
      'Response',
      'Headers'
  ].map(kindOfTest);
  /**
   * Trim excess whitespace off the beginning and end of a string
   *
   * @param {String} str The String to trim
   *
   * @returns {String} The String freed of excess whitespace
   */ const trim = (str)=>str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  /**
   * Iterate over an Array or an Object invoking a function for each item.
   *
   * If `obj` is an Array callback will be called passing
   * the value, index, and complete array for each item.
   *
   * If 'obj' is an Object callback will be called passing
   * the value, key, and complete object for each property.
   *
   * @param {Object|Array} obj The object to iterate
   * @param {Function} fn The callback to invoke for each item
   *
   * @param {Boolean} [allOwnKeys = false]
   * @returns {any}
   */ function forEach(obj, fn, { allOwnKeys = false } = {}) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
          return;
      }
      let i;
      let l;
      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
          /*eslint no-param-reassign:0*/ obj = [
              obj
          ];
      }
      if (isArray(obj)) {
          // Iterate over array values
          for(i = 0, l = obj.length; i < l; i++){
              fn.call(null, obj[i], i, obj);
          }
      } else {
          // Iterate over object keys
          const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
          const len = keys.length;
          let key;
          for(i = 0; i < len; i++){
              key = keys[i];
              fn.call(null, obj[key], key, obj);
          }
      }
  }
  function findKey(obj, key) {
      key = key.toLowerCase();
      const keys = Object.keys(obj);
      let i = keys.length;
      let _key;
      while(i-- > 0){
          _key = keys[i];
          if (key === _key.toLowerCase()) {
              return _key;
          }
      }
      return null;
  }
  const _global = (()=>{
      /*eslint no-undef:0*/ if (typeof globalThis !== "undefined") return globalThis;
      return typeof self !== "undefined" ? self : typeof window !== 'undefined' ? window : global;
  })();
  const isContextDefined = (context)=>!isUndefined(context) && context !== _global;
  /**
   * Accepts varargs expecting each argument to be an object, then
   * immutably merges the properties of each object and returns result.
   *
   * When multiple objects contain the same key the later object in
   * the arguments list will take precedence.
   *
   * Example:
   *
   * ```js
   * var result = merge({foo: 123}, {foo: 456});
   * console.log(result.foo); // outputs 456
   * ```
   *
   * @param {Object} obj1 Object to merge
   *
   * @returns {Object} Result of all merge properties
   */ function merge() {
      const { caseless } = isContextDefined(this) && this || {};
      const result = {};
      const assignValue = (val, key)=>{
          const targetKey = caseless && findKey(result, key) || key;
          if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
              result[targetKey] = merge(result[targetKey], val);
          } else if (isPlainObject(val)) {
              result[targetKey] = merge({}, val);
          } else if (isArray(val)) {
              result[targetKey] = val.slice();
          } else {
              result[targetKey] = val;
          }
      };
      for(let i = 0, l = arguments.length; i < l; i++){
          arguments[i] && forEach(arguments[i], assignValue);
      }
      return result;
  }
  /**
   * Extends object a by mutably adding to it the properties of object b.
   *
   * @param {Object} a The object to be extended
   * @param {Object} b The object to copy properties from
   * @param {Object} thisArg The object to bind function to
   *
   * @param {Boolean} [allOwnKeys]
   * @returns {Object} The resulting value of object a
   */ const extend = (a, b, thisArg, { allOwnKeys } = {})=>{
      forEach(b, (val, key)=>{
          if (thisArg && isFunction(val)) {
              a[key] = bind(val, thisArg);
          } else {
              a[key] = val;
          }
      }, {
          allOwnKeys
      });
      return a;
  };
  /**
   * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
   *
   * @param {string} content with BOM
   *
   * @returns {string} content value without BOM
   */ const stripBOM = (content)=>{
      if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1);
      }
      return content;
  };
  /**
   * Inherit the prototype methods from one constructor into another
   * @param {function} constructor
   * @param {function} superConstructor
   * @param {object} [props]
   * @param {object} [descriptors]
   *
   * @returns {void}
   */ const inherits = (constructor, superConstructor, props, descriptors)=>{
      constructor.prototype = Object.create(superConstructor.prototype, descriptors);
      constructor.prototype.constructor = constructor;
      Object.defineProperty(constructor, 'super', {
          value: superConstructor.prototype
      });
      props && Object.assign(constructor.prototype, props);
  };
  /**
   * Resolve object with deep prototype chain to a flat object
   * @param {Object} sourceObj source object
   * @param {Object} [destObj]
   * @param {Function|Boolean} [filter]
   * @param {Function} [propFilter]
   *
   * @returns {Object}
   */ const toFlatObject = (sourceObj, destObj, filter, propFilter)=>{
      let props;
      let i;
      let prop;
      const merged = {};
      destObj = destObj || {};
      // eslint-disable-next-line no-eq-null,eqeqeq
      if (sourceObj == null) return destObj;
      do {
          props = Object.getOwnPropertyNames(sourceObj);
          i = props.length;
          while(i-- > 0){
              prop = props[i];
              if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
                  destObj[prop] = sourceObj[prop];
                  merged[prop] = true;
              }
          }
          sourceObj = filter !== false && getPrototypeOf(sourceObj);
      }while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype)
      return destObj;
  };
  /**
   * Determines whether a string ends with the characters of a specified string
   *
   * @param {String} str
   * @param {String} searchString
   * @param {Number} [position= 0]
   *
   * @returns {boolean}
   */ const endsWith = (str, searchString, position)=>{
      str = String(str);
      if (position === undefined || position > str.length) {
          position = str.length;
      }
      position -= searchString.length;
      const lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
  /**
   * Returns new array from array like object or null if failed
   *
   * @param {*} [thing]
   *
   * @returns {?Array}
   */ const toArray = (thing)=>{
      if (!thing) return null;
      if (isArray(thing)) return thing;
      let i = thing.length;
      if (!isNumber(i)) return null;
      const arr = new Array(i);
      while(i-- > 0){
          arr[i] = thing[i];
      }
      return arr;
  };
  /**
   * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
   * thing passed in is an instance of Uint8Array
   *
   * @param {TypedArray}
   *
   * @returns {Array}
   */ // eslint-disable-next-line func-names
  const isTypedArray = ((TypedArray)=>{
      // eslint-disable-next-line func-names
      return (thing)=>{
          return TypedArray && thing instanceof TypedArray;
      };
  })(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));
  /**
   * For each entry in the object, call the function with the key and value.
   *
   * @param {Object<any, any>} obj - The object to iterate over.
   * @param {Function} fn - The function to call for each entry.
   *
   * @returns {void}
   */ const forEachEntry = (obj, fn)=>{
      const generator = obj && obj[Symbol.iterator];
      const iterator = generator.call(obj);
      let result;
      while((result = iterator.next()) && !result.done){
          const pair = result.value;
          fn.call(obj, pair[0], pair[1]);
      }
  };
  /**
   * It takes a regular expression and a string, and returns an array of all the matches
   *
   * @param {string} regExp - The regular expression to match against.
   * @param {string} str - The string to search.
   *
   * @returns {Array<boolean>}
   */ const matchAll = (regExp, str)=>{
      let matches;
      const arr = [];
      while((matches = regExp.exec(str)) !== null){
          arr.push(matches);
      }
      return arr;
  };
  /* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */ const isHTMLForm = kindOfTest('HTMLFormElement');
  const toCamelCase = (str)=>{
      return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
          return p1.toUpperCase() + p2;
      });
  };
  /* Creating a function that will check if an object has a property. */ const hasOwnProperty = (({ hasOwnProperty })=>(obj, prop)=>hasOwnProperty.call(obj, prop))(Object.prototype);
  /**
   * Determine if a value is a RegExp object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a RegExp object, otherwise false
   */ const isRegExp = kindOfTest('RegExp');
  const reduceDescriptors = (obj, reducer)=>{
      const descriptors = Object.getOwnPropertyDescriptors(obj);
      const reducedDescriptors = {};
      forEach(descriptors, (descriptor, name)=>{
          let ret;
          if ((ret = reducer(descriptor, name, obj)) !== false) {
              reducedDescriptors[name] = ret || descriptor;
          }
      });
      Object.defineProperties(obj, reducedDescriptors);
  };
  /**
   * Makes all methods read-only
   * @param {Object} obj
   */ const freezeMethods = (obj)=>{
      reduceDescriptors(obj, (descriptor, name)=>{
          // skip restricted props in strict mode
          if (isFunction(obj) && [
              'arguments',
              'caller',
              'callee'
          ].indexOf(name) !== -1) {
              return false;
          }
          const value = obj[name];
          if (!isFunction(value)) return;
          descriptor.enumerable = false;
          if ('writable' in descriptor) {
              descriptor.writable = false;
              return;
          }
          if (!descriptor.set) {
              descriptor.set = ()=>{
                  throw Error('Can not rewrite read-only method \'' + name + '\'');
              };
          }
      });
  };
  const toObjectSet = (arrayOrString, delimiter)=>{
      const obj = {};
      const define = (arr)=>{
          arr.forEach((value)=>{
              obj[value] = true;
          });
      };
      isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
      return obj;
  };
  const noop = ()=>{};
  const toFiniteNumber = (value, defaultValue)=>{
      return value != null && Number.isFinite(value = +value) ? value : defaultValue;
  };
  const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  const DIGIT = '0123456789';
  const ALPHABET = {
      DIGIT,
      ALPHA,
      ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
  };
  const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT)=>{
      let str = '';
      const { length } = alphabet;
      while(size--){
          str += alphabet[Math.random() * length | 0];
      }
      return str;
  };
  /**
   * If the thing is a FormData object, return true, otherwise return false.
   *
   * @param {unknown} thing - The thing to check.
   *
   * @returns {boolean}
   */ function isSpecCompliantForm(thing) {
      return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
  }
  const toJSONObject = (obj)=>{
      const stack = new Array(10);
      const visit = (source, i)=>{
          if (isObject(source)) {
              if (stack.indexOf(source) >= 0) {
                  return;
              }
              if (!('toJSON' in source)) {
                  stack[i] = source;
                  const target = isArray(source) ? [] : {};
                  forEach(source, (value, key)=>{
                      const reducedValue = visit(value, i + 1);
                      !isUndefined(reducedValue) && (target[key] = reducedValue);
                  });
                  stack[i] = undefined;
                  return target;
              }
          }
          return source;
      };
      return visit(obj, 0);
  };
  const isAsyncFn = kindOfTest('AsyncFunction');
  const isThenable = (thing)=>thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
  // original code
  // https://github.com/DigitalBrainJS/AxiosPromise/blob/16deab13710ec09779922131f3fa5954320f83ab/lib/utils.js#L11-L34
  const _setImmediate = ((setImmediateSupported, postMessageSupported)=>{
      if (setImmediateSupported) {
          return setImmediate;
      }
      return postMessageSupported ? ((token, callbacks)=>{
          _global.addEventListener("message", ({ source, data })=>{
              if (source === _global && data === token) {
                  callbacks.length && callbacks.shift()();
              }
          }, false);
          return (cb)=>{
              callbacks.push(cb);
              _global.postMessage(token, "*");
          };
      })(`axios@${Math.random()}`, []) : (cb)=>setTimeout(cb);
  })(typeof setImmediate === 'function', isFunction(_global.postMessage));
  const asap = typeof queueMicrotask !== 'undefined' ? queueMicrotask.bind(_global) : typeof process !== 'undefined' && process.nextTick || _setImmediate;
  function createErrorType(code, message, baseClass) {
      // Create constructor
      function CustomError(properties) {
          Error.captureStackTrace(this, this.constructor);
          Object.assign(this, properties || {});
          this.code = code;
          this.message = this.cause ? `${message}: ${this.cause.message}` : message;
      }
      // Attach constructor and set default properties
      CustomError.prototype = new (baseClass || Error)();
      CustomError.prototype.constructor = CustomError;
      CustomError.prototype.name = `Error [${code}]`;
      return CustomError;
  }
  // *********************
  var utils$1 = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData,
      isArrayBufferView,
      isString,
      isNumber,
      isBoolean,
      isObject,
      isPlainObject,
      isReadableStream,
      isRequest,
      isResponse,
      isHeaders,
      isUndefined,
      isDate,
      isFile,
      isBlob,
      isRegExp,
      isFunction,
      isStream,
      isURLSearchParams,
      isTypedArray,
      isFileList,
      forEach,
      merge,
      extend,
      trim,
      stripBOM,
      inherits,
      toFlatObject,
      kindOf,
      kindOfTest,
      endsWith,
      toArray,
      forEachEntry,
      matchAll,
      isHTMLForm,
      hasOwnProperty,
      hasOwnProp: hasOwnProperty,
      reduceDescriptors,
      freezeMethods,
      toObjectSet,
      toCamelCase,
      noop,
      toFiniteNumber,
      findKey,
      global: _global,
      isContextDefined,
      ALPHABET,
      generateString,
      isSpecCompliantForm,
      toJSONObject,
      isAsyncFn,
      isThenable,
      setImmediate: _setImmediate,
      asap,
      createErrorType
  };

  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */ function AxiosError(message, code, config, request, response) {
      Error.call(this);
      if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
      } else {
          this.stack = new Error().stack;
      }
      this.message = message;
      this.name = 'AxiosError';
      code && (this.code = code);
      config && (this.config = config);
      request && (this.request = request);
      if (response) {
          this.response = response;
          this.status = response.status ? response.status : null;
      }
  }
  utils$1.inherits(AxiosError, Error, {
      toJSON: function toJSON() {
          return {
              // Standard
              message: this.message,
              name: this.name,
              // Microsoft
              description: this.description,
              number: this.number,
              // Mozilla
              fileName: this.fileName,
              lineNumber: this.lineNumber,
              columnNumber: this.columnNumber,
              stack: this.stack,
              // Axios
              config: utils$1.toJSONObject(this.config),
              code: this.code,
              status: this.status
          };
      }
  });
  const prototype$1 = AxiosError.prototype;
  const descriptors = {};
  [
      'ERR_BAD_OPTION_VALUE',
      'ERR_BAD_OPTION',
      'ECONNABORTED',
      'ETIMEDOUT',
      'ERR_NETWORK',
      'ERR_FR_TOO_MANY_REDIRECTS',
      'ERR_DEPRECATED',
      'ERR_BAD_RESPONSE',
      'ERR_BAD_REQUEST',
      'ERR_CANCELED',
      'ERR_NOT_SUPPORT',
      'ERR_INVALID_URL'
  ].forEach((code)=>{
      descriptors[code] = {
          value: code
      };
  });
  Object.defineProperties(AxiosError, descriptors);
  Object.defineProperty(prototype$1, 'isAxiosError', {
      value: true
  });
  // eslint-disable-next-line func-names
  AxiosError.from = (error, code, config, request, response, customProps)=>{
      const axiosError = Object.create(prototype$1);
      utils$1.toFlatObject(error, axiosError, function filter(obj) {
          return obj !== Error.prototype;
      }, (prop)=>{
          return prop !== 'isAxiosError';
      });
      AxiosError.call(axiosError, error.message, code, config, request, response);
      axiosError.cause = error;
      axiosError.name = error.name;
      customProps && Object.assign(axiosError, customProps);
      return axiosError;
  };

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  /* eslint-env browser */

  var browser = typeof self == 'object' ? self.FormData : window.FormData;

  var FormData$2 = /*@__PURE__*/getDefaultExportFromCjs(browser);

  /**
   * Determines if the given thing is a array or js object.
   *
   * @param {string} thing - The object or array to be visited.
   *
   * @returns {boolean}
   */ function isVisitable(thing) {
      return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
  }
  /**
   * It removes the brackets from the end of a string
   *
   * @param {string} key - The key of the parameter.
   *
   * @returns {string} the key without the brackets.
   */ function removeBrackets(key) {
      return utils$1.endsWith(key, '[]') ? key.slice(0, -2) : key;
  }
  /**
   * It takes a path, a key, and a boolean, and returns a string
   *
   * @param {string} path - The path to the current key.
   * @param {string} key - The key of the current object being iterated over.
   * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
   *
   * @returns {string} The path to the current key.
   */ function renderKey(path, key, dots) {
      if (!path) return key;
      return path.concat(key).map(function each(token, i) {
          // eslint-disable-next-line no-param-reassign
          token = removeBrackets(token);
          return !dots && i ? '[' + token + ']' : token;
      }).join(dots ? '.' : '');
  }
  /**
   * If the array is an array and none of its elements are visitable, then it's a flat array.
   *
   * @param {Array<any>} arr - The array to check
   *
   * @returns {boolean}
   */ function isFlatArray(arr) {
      return utils$1.isArray(arr) && !arr.some(isVisitable);
  }
  const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
      return /^is[A-Z]/.test(prop);
  });
  /**
   * Convert a data object to FormData
   *
   * @param {Object} obj
   * @param {?Object} [formData]
   * @param {?Object} [options]
   * @param {Function} [options.visitor]
   * @param {Boolean} [options.metaTokens = true]
   * @param {Boolean} [options.dots = false]
   * @param {?Boolean} [options.indexes = false]
   *
   * @returns {Object}
   **/ /**
   * It converts an object into a FormData object
   *
   * @param {Object<any, any>} obj - The object to convert to form data.
   * @param {string} formData - The FormData object to append to.
   * @param {Object<string, any>} options
   *
   * @returns
   */ function toFormData(obj, formData, options) {
      if (!utils$1.isObject(obj)) {
          throw new TypeError('target must be an object');
      }
      // eslint-disable-next-line no-param-reassign
      formData = formData || new (FormData$2 || FormData)();
      // eslint-disable-next-line no-param-reassign
      options = utils$1.toFlatObject(options, {
          metaTokens: true,
          dots: false,
          indexes: false
      }, false, function defined(option, source) {
          // eslint-disable-next-line no-eq-null,eqeqeq
          return !utils$1.isUndefined(source[option]);
      });
      const metaTokens = options.metaTokens;
      // eslint-disable-next-line no-use-before-define
      const visitor = options.visitor || defaultVisitor;
      const dots = options.dots;
      const indexes = options.indexes;
      const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
      const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
      if (!utils$1.isFunction(visitor)) {
          throw new TypeError('visitor must be a function');
      }
      function convertValue(value) {
          if (value === null) return '';
          if (utils$1.isDate(value)) {
              return value.toISOString();
          }
          if (!useBlob && utils$1.isBlob(value)) {
              throw new AxiosError('Blob is not supported. Use a Buffer instead.');
          }
          if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
              return useBlob && typeof Blob === 'function' ? new Blob([
                  value
              ]) : Buffer.from(value);
          }
          return value;
      }
      /**
     * Default visitor.
     *
     * @param {*} value
     * @param {String|Number} key
     * @param {Array<String|Number>} path
     * @this {FormData}
     *
     * @returns {boolean} return true to visit the each prop of the value recursively
     */ function defaultVisitor(value, key, path) {
          let arr = value;
          if (value && !path && typeof value === 'object') {
              if (utils$1.endsWith(key, '{}')) {
                  // eslint-disable-next-line no-param-reassign
                  key = metaTokens ? key : key.slice(0, -2);
                  // eslint-disable-next-line no-param-reassign
                  value = JSON.stringify(value);
              } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, '[]')) && (arr = utils$1.toArray(value))) {
                  // eslint-disable-next-line no-param-reassign
                  key = removeBrackets(key);
                  arr.forEach(function each(el, index) {
                      !(utils$1.isUndefined(el) || el === null) && formData.append(indexes === true ? renderKey([
                          key
                      ], index, dots) : indexes === null ? key : key + '[]', convertValue(el));
                  });
                  return false;
              }
          }
          if (isVisitable(value)) {
              return true;
          }
          formData.append(renderKey(path, key, dots), convertValue(value));
          return false;
      }
      const stack = [];
      const exposedHelpers = Object.assign(predicates, {
          defaultVisitor,
          convertValue,
          isVisitable
      });
      function build(value, path) {
          if (utils$1.isUndefined(value)) return;
          if (stack.indexOf(value) !== -1) {
              throw Error('Circular reference detected in ' + path.join('.'));
          }
          stack.push(value);
          utils$1.forEach(value, function each(el, key) {
              const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(formData, el, utils$1.isString(key) ? key.trim() : key, path, exposedHelpers);
              if (result === true) {
                  build(el, path ? path.concat(key) : [
                      key
                  ]);
              }
          });
          stack.pop();
      }
      if (!utils$1.isObject(obj)) {
          throw new TypeError('data must be an object');
      }
      build(obj);
      return formData;
  }

  /**
   * It encodes a string by replacing all characters that are not in the unreserved set with
   * their percent-encoded equivalents
   *
   * @param {string} str - The string to encode.
   *
   * @returns {string} The encoded string.
   */ function encode(str) {
      const charMap = {
          '!': '%21',
          "'": '%27',
          '(': '%28',
          ')': '%29',
          '~': '%7E',
          '%20': '+',
          '%00': '\x00'
      };
      return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
          return charMap[match];
      });
  }
  /**
   * It takes a params object and converts it to a FormData object
   *
   * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
   * @param {Object<string, any>} options - The options object passed to the Axios constructor.
   *
   * @returns {void}
   */ function AxiosURLSearchParams(params, options) {
      this._pairs = [];
      params && toFormData(params, this, options);
  }
  const prototype = AxiosURLSearchParams.prototype;
  prototype.append = function append(name, value) {
      this._pairs.push([
          name,
          value
      ]);
  };
  prototype.toString = function toString(encoder) {
      const _encode = encoder ? function(value) {
          return encoder.call(this, value, encode);
      } : encode;
      return this._pairs.map(function each(pair) {
          return _encode(pair[0]) + '=' + _encode(pair[1]);
      }, '').join('&');
  };

  var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

  var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

  var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

  var platform$1 = {
      isBrowser: true,
      classes: {
          URLSearchParams: URLSearchParams$1,
          FormData: FormData$1,
          Blob: Blob$1
      },
      protocols: [
          'http',
          'https',
          'file',
          'blob',
          'url',
          'data'
      ]
  };

  const hasBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';
  const _navigator = typeof navigator === 'object' && navigator || undefined;
  /**
   * Determine if we're running in a standard browser environment
   *
   * This allows axios to run in a web worker, and react-native.
   * Both environments support XMLHttpRequest, but not fully standard globals.
   *
   * web workers:
   *  typeof window -> undefined
   *  typeof document -> undefined
   *
   * react-native:
   *  navigator.product -> 'ReactNative'
   * nativescript
   *  navigator.product -> 'NativeScript' or 'NS'
   *
   * @returns {boolean}
   */ const hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || [
      'ReactNative',
      'NativeScript',
      'NS'
  ].indexOf(_navigator.product) < 0);
  /**
   * Determine if we're running in a standard browser webWorker environment
   *
   * Although the `isStandardBrowserEnv` method indicates that
   * `allows axios to run in a web worker`, the WebWorker will still be
   * filtered out due to its judgment standard
   * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
   * This leads to a problem when axios post `FormData` in webWorker
   */ const hasStandardBrowserWebWorkerEnv = (()=>{
      return typeof WorkerGlobalScope !== 'undefined' && // eslint-disable-next-line no-undef
      self instanceof WorkerGlobalScope && typeof self.importScripts === 'function';
  })();
  const origin = hasBrowserEnv && window.location.href || 'http://localhost';

  var utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    hasBrowserEnv: hasBrowserEnv,
    hasStandardBrowserEnv: hasStandardBrowserEnv,
    hasStandardBrowserWebWorkerEnv: hasStandardBrowserWebWorkerEnv,
    navigator: _navigator,
    origin: origin
  });

  var platform = {
      ...utils,
      ...platform$1
  };

  function toURLEncodedForm(data, options) {
      return toFormData$1(data, new platform.classes.URLSearchParams(), Object.assign({
          visitor: function(value, key, path, helpers) {
              if (platform.isNode && utils$2.isBuffer(value)) {
                  this.append(key, value.toString('base64'));
                  return false;
              }
              return helpers.defaultVisitor.apply(this, arguments);
          }
      }, options));
  }

  /**
   * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
   *
   * @param {string} name - The name of the property to get.
   *
   * @returns An array of strings.
   */ function parsePropPath(name) {
      // foo[x][y][z]
      // foo.x.y.z
      // foo-x-y-z
      // foo x y z
      return utils$2.matchAll(/\w+|\[(\w*)]/g, name).map((match)=>{
          return match[0] === '[]' ? '' : match[1] || match[0];
      });
  }
  /**
   * Convert an array to an object.
   *
   * @param {Array<any>} arr - The array to convert to an object.
   *
   * @returns An object with the same keys and values as the array.
   */ function arrayToObject(arr) {
      const obj = {};
      const keys = Object.keys(arr);
      let i;
      const len = keys.length;
      let key;
      for(i = 0; i < len; i++){
          key = keys[i];
          obj[key] = arr[key];
      }
      return obj;
  }
  /**
   * It takes a FormData object and returns a JavaScript object
   *
   * @param {string} formData The FormData object to convert to JSON.
   *
   * @returns {Object<string, any> | null} The converted object.
   */ function formDataToJSON(formData) {
      function buildPath(path, value, target, index) {
          let name = path[index++];
          if (name === '__proto__') return true;
          const isNumericKey = Number.isFinite(+name);
          const isLast = index >= path.length;
          name = !name && utils$2.isArray(target) ? target.length : name;
          if (isLast) {
              if (utils$2.hasOwnProp(target, name)) {
                  target[name] = [
                      target[name],
                      value
                  ];
              } else {
                  target[name] = value;
              }
              return !isNumericKey;
          }
          if (!target[name] || !utils$2.isObject(target[name])) {
              target[name] = [];
          }
          const result = buildPath(path, value, target[name], index);
          if (result && utils$2.isArray(target[name])) {
              target[name] = arrayToObject(target[name]);
          }
          return !isNumericKey;
      }
      if (utils$2.isFormData(formData) && utils$2.isFunction(formData.entries)) {
          const obj = {};
          utils$2.forEachEntry(formData, (name, value)=>{
              buildPath(parsePropPath(name), value, obj, 0);
          });
          return obj;
      }
      return null;
  }

  /**
   * It takes a string, tries to parse it, and if it fails, it returns the stringified version
   * of the input
   *
   * @param {any} rawValue - The value to be stringified.
   * @param {Function} parser - A function that parses a string into a JavaScript object.
   * @param {Function} encoder - A function that takes a value and returns a string.
   *
   * @returns {string} A stringified version of the rawValue.
   */ function stringifySafely(rawValue, parser, encoder) {
      if (utils$2.isString(rawValue)) {
          try {
              (parser || JSON.parse)(rawValue);
              return utils$2.trim(rawValue);
          } catch (e) {
              if (e.name !== 'SyntaxError') {
                  throw e;
              }
          }
      }
      return (encoder || JSON.stringify)(rawValue);
  }
  const defaults = {
      transitional: transitionalDefaults,
      adapter: [
          'xhr',
          'http',
          'fetch'
      ],
      transformRequest: [
          function transformRequest(data, headers) {
              const contentType = headers.getContentType() || '';
              const hasJSONContentType = contentType.indexOf('application/json') > -1;
              const isObjectPayload = utils$2.isObject(data);
              if (isObjectPayload && utils$2.isHTMLForm(data)) {
                  data = new FormData(data);
              }
              const isFormData = utils$2.isFormData(data);
              if (isFormData) {
                  return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
              }
              if (utils$2.isArrayBuffer(data) || utils$2.isBuffer(data) || utils$2.isStream(data) || utils$2.isFile(data) || utils$2.isBlob(data) || utils$2.isReadableStream(data)) {
                  return data;
              }
              if (utils$2.isArrayBufferView(data)) {
                  return data.buffer;
              }
              if (utils$2.isURLSearchParams(data)) {
                  headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
                  return data.toString();
              }
              let isFileList;
              if (isObjectPayload) {
                  if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
                      return toURLEncodedForm(data, this.formSerializer).toString();
                  }
                  if ((isFileList = utils$2.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
                      const _FormData = this.env && this.env.FormData;
                      return toFormData$1(isFileList ? {
                          'files[]': data
                      } : data, _FormData && new _FormData(), this.formSerializer);
                  }
              }
              if (isObjectPayload || hasJSONContentType) {
                  headers.setContentType('application/json', false);
                  return stringifySafely(data);
              }
              return data;
          }
      ],
      transformResponse: [
          function transformResponse(data) {
              const transitional = this.transitional || defaults.transitional;
              const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
              const JSONRequested = this.responseType === 'json';
              if (utils$2.isResponse(data) || utils$2.isReadableStream(data)) {
                  return data;
              }
              if (data && utils$2.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
                  const silentJSONParsing = transitional && transitional.silentJSONParsing;
                  const strictJSONParsing = !silentJSONParsing && JSONRequested;
                  try {
                      return JSON.parse(data);
                  } catch (e) {
                      if (strictJSONParsing) {
                          if (e.name === 'SyntaxError') {
                              throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, this.response);
                          }
                          throw e;
                      }
                  }
              }
              return data;
          }
      ],
      /**
     * A timeout in milliseconds to abort a request. If set to 0 (default) a
     * timeout is not created.
     */ timeout: 0,
      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',
      maxContentLength: -1,
      maxBodyLength: -1,
      env: {
          FormData: platform.classes.FormData,
          Blob: platform.classes.Blob
      },
      validateStatus: function validateStatus(status) {
          return status >= 200 && status < 300;
      },
      headers: {
          common: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': undefined
          }
      }
  };
  utils$2.forEach([
      'delete',
      'get',
      'head',
      'post',
      'put',
      'patch'
  ], (method)=>{
      defaults.headers[method] = {};
  });
  var defaults$1 = defaults;

  // RawAxiosHeaders whose duplicates are ignored by node
  // c.f. https://nodejs.org/api/http.html#http_message_headers
  const ignoreDuplicateOf = utils$2.toObjectSet([
      'age',
      'authorization',
      'content-length',
      'content-type',
      'etag',
      'expires',
      'from',
      'host',
      'if-modified-since',
      'if-unmodified-since',
      'last-modified',
      'location',
      'max-forwards',
      'proxy-authorization',
      'referer',
      'retry-after',
      'user-agent'
  ]);
  /**
   * Parse headers into an object
   *
   * ```
   * Date: Wed, 27 Aug 2014 08:58:49 GMT
   * Content-Type: application/json
   * Connection: keep-alive
   * Transfer-Encoding: chunked
   * ```
   *
   * @param {String} rawHeaders Headers needing to be parsed
   *
   * @returns {Object} Headers parsed into an object
   */ var parseHeaders = ((rawHeaders)=>{
      const parsed = {};
      let key;
      let val;
      let i;
      rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
          i = line.indexOf(':');
          key = line.substring(0, i).trim().toLowerCase();
          val = line.substring(i + 1).trim();
          if (!key || parsed[key] && ignoreDuplicateOf[key]) {
              return;
          }
          if (key === 'set-cookie') {
              if (parsed[key]) {
                  parsed[key].push(val);
              } else {
                  parsed[key] = [
                      val
                  ];
              }
          } else {
              parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
      });
      return parsed;
  });

  const $internals = Symbol('internals');
  function normalizeHeader(header) {
      return header && String(header).trim().toLowerCase();
  }
  function normalizeValue(value) {
      if (value === false || value == null) {
          return value;
      }
      return utils$2.isArray(value) ? value.map(normalizeValue) : String(value);
  }
  function parseTokens(str) {
      const tokens = Object.create(null);
      const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
      let match;
      while(match = tokensRE.exec(str)){
          tokens[match[1]] = match[2];
      }
      return tokens;
  }
  const isValidHeaderName = (str)=>/^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
  function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
      if (utils$2.isFunction(filter)) {
          return filter.call(this, value, header);
      }
      if (isHeaderNameFilter) {
          value = header;
      }
      if (!utils$2.isString(value)) return;
      if (utils$2.isString(filter)) {
          return value.indexOf(filter) !== -1;
      }
      if (utils$2.isRegExp(filter)) {
          return filter.test(value);
      }
  }
  function formatHeader(header) {
      return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str)=>{
          return char.toUpperCase() + str;
      });
  }
  function buildAccessors(obj, header) {
      const accessorName = utils$2.toCamelCase(' ' + header);
      [
          'get',
          'set',
          'has'
      ].forEach((methodName)=>{
          Object.defineProperty(obj, methodName + accessorName, {
              value: function(arg1, arg2, arg3) {
                  return this[methodName].call(this, header, arg1, arg2, arg3);
              },
              configurable: true
          });
      });
  }
  let AxiosHeaders = class AxiosHeaders {
      /**
     *
     * @param {*} header
     * @param {*} valueOrRewrite
     * @param {*} rewrite true：无论源值是否存在均赋值，false：源值如存在不覆盖，
     * undefined：源值不为 false 直接赋值，false 不赋值
     * @returns
     */ set(header, valueOrRewrite, rewrite) {
          const self = this;
          function setHeader(_value, _header, _rewrite) {
              const lHeader = normalizeHeader(_header);
              if (!lHeader) {
                  throw new Error('header name must be a non-empty string');
              }
              const key = utils$2.findKey(self, lHeader);
              if (!key || self[key] === undefined || _rewrite === true || _rewrite === undefined && self[key] !== false) {
                  self[key || _header] = normalizeValue(_value);
              }
          }
          const setHeaders = (headers, _rewrite)=>utils$2.forEach(headers, (_value, _header)=>setHeader(_value, _header, _rewrite));
          if (utils$2.isPlainObject(header) || header instanceof this.constructor) {
              setHeaders(header, valueOrRewrite);
          } else if (utils$2.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
              setHeaders(parseHeaders(header), valueOrRewrite);
          } else if (utils$2.isHeaders(header)) {
              for (const [key, value] of header.entries()){
                  setHeader(value, key, rewrite);
              }
          } else {
              header != null && setHeader(valueOrRewrite, header, rewrite);
          }
          return this;
      }
      get(header, parser) {
          header = normalizeHeader(header);
          if (header) {
              const key = utils$2.findKey(this, header);
              if (key) {
                  const value = this[key];
                  if (!parser) {
                      return value;
                  }
                  if (parser === true) {
                      return parseTokens(value);
                  }
                  if (utils$2.isFunction(parser)) {
                      return parser.call(this, value, key);
                  }
                  if (utils$2.isRegExp(parser)) {
                      return parser.exec(value);
                  }
                  throw new TypeError('parser must be boolean|regexp|function');
              }
          }
      }
      has(header, matcher) {
          header = normalizeHeader(header);
          if (header) {
              const key = utils$2.findKey(this, header);
              return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
          }
          return false;
      }
      delete(header, matcher) {
          const self = this;
          let deleted = false;
          function deleteHeader(_header) {
              _header = normalizeHeader(_header);
              if (_header) {
                  const key = utils$2.findKey(self, _header);
                  if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
                      delete self[key];
                      deleted = true;
                  }
              }
          }
          if (utils$2.isArray(header)) {
              header.forEach(deleteHeader);
          } else {
              deleteHeader(header);
          }
          return deleted;
      }
      clear(matcher) {
          const keys = Object.keys(this);
          let i = keys.length;
          let deleted = false;
          while(i--){
              const key = keys[i];
              if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
                  delete this[key];
                  deleted = true;
              }
          }
          return deleted;
      }
      normalize(format) {
          const self = this;
          const headers = {};
          utils$2.forEach(this, (value, header)=>{
              const key = utils$2.findKey(headers, header);
              if (key) {
                  self[key] = normalizeValue(value);
                  delete self[header];
                  return;
              }
              const normalized = format ? formatHeader(header) : String(header).trim();
              if (normalized !== header) {
                  delete self[header];
              }
              self[normalized] = normalizeValue(value);
              headers[normalized] = true;
          });
          return this;
      }
      concat(...targets) {
          return this.constructor.concat(this, ...targets);
      }
      toJSON(asStrings) {
          const obj = Object.create(null);
          utils$2.forEach(this, (value, header)=>{
              value != null && value !== false && (obj[header] = asStrings && utils$2.isArray(value) ? value.join(', ') : value);
          });
          return obj;
      }
      [Symbol.iterator]() {
          return Object.entries(this.toJSON())[Symbol.iterator]();
      }
      toString() {
          return Object.entries(this.toJSON()).map(([header, value])=>header + ': ' + value).join('\n');
      }
      get [Symbol.toStringTag]() {
          return 'AxiosHeaders';
      }
      static from(thing) {
          return thing instanceof this ? thing : new this(thing);
      }
      static concat(first, ...targets) {
          const computed = new this(first);
          targets.forEach((target)=>computed.set(target));
          return computed;
      }
      static accessor(header) {
          const internals = this[$internals] = this[$internals] = {
              accessors: {}
          };
          const accessors = internals.accessors;
          const prototype = this.prototype;
          function defineAccessor(_header) {
              const lHeader = normalizeHeader(_header);
              if (!accessors[lHeader]) {
                  buildAccessors(prototype, _header);
                  accessors[lHeader] = true;
              }
          }
          utils$2.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
          return this;
      }
      constructor(headers){
          headers && this.set(headers);
      }
  };
  AxiosHeaders.accessor([
      'Content-Type',
      'Content-Length',
      'Accept',
      'Accept-Encoding',
      'User-Agent',
      'Authorization'
  ]);
  // reserved names hotfix
  utils$2.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key)=>{
      let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
      return {
          get: ()=>value,
          set (headerValue) {
              this[mapped] = headerValue;
          }
      };
  });
  utils$2.freezeMethods(AxiosHeaders);
  var AxiosHeaders$1 = AxiosHeaders;

  /**
   * Transform the data for a request or a response
   *
   * @param {Array|Function} fns A single function or Array of functions
   * @param {?Object} response The response object
   *
   * @returns {*} The resulting transformed data
   */ function transformData(fns, response) {
      const config = this || defaults$1;
      const context = response || config;
      const headers = AxiosHeaders$1.from(context.headers);
      let data = context.data;
      utils$2.forEach(fns, function transform(fn) {
          data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
      });
      headers.normalize();
      return data;
  }

  function isCancel(value) {
      return !!(value && value.__CANCEL__);
  }

  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */ function CanceledError(message, config, request) {
      // eslint-disable-next-line no-eq-null,eqeqeq
      AxiosError$1.call(this, message == null ? 'canceled' : message, AxiosError$1.ERR_CANCELED, config, request);
      this.name = 'CanceledError';
  }
  utils$2.inherits(CanceledError, AxiosError$1, {
      __CANCEL__: true
  });

  /**
   * Determines whether the specified URL is absolute
   *
   * @param {string} url The URL to test
   *
   * @returns {boolean} True if the specified URL is absolute, otherwise false
   */ function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
  }

  /**
   * Creates a new URL by combining the specified URLs
   *
   * @param {string} baseURL The base URL
   * @param {string} relativeURL The relative URL
   *
   * @returns {string} The combined URL
   */ function combineURLs(baseURL, relativeURL) {
      return relativeURL ? baseURL.replace(/\/?\/$/, '') + '/' + relativeURL.replace(/^\/+/, '') : baseURL;
  }

  /**
   * Creates a new URL by combining the baseURL with the requestedURL,
   * only when the requestedURL is not already an absolute URL.
   * If the requestURL is absolute, this function returns the requestedURL untouched.
   *
   * @param {string} baseURL The base URL
   * @param {string} requestedURL Absolute or relative URL to combine
   *
   * @returns {string} The combined full path
   */ function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
          return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
  }

  const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';
  let XhrAdapter = class XhrAdapter {
      init(config) {}
      request() {}
      stream() {}
      constructor(config){
          this.init(config);
      }
  };
  var XhrAdapter$1 = isXHRAdapterSupported && XhrAdapter;

  const knownAdapters = {
      http: HttpAdapter,
      xhr: XhrAdapter$1
  };
  /**
   * define adapter's name and adapterName to http or xhr
   * browser: httpAdapter is null!
   */ utils$2.forEach(knownAdapters, (val, key)=>{
      if (val) {
          try {
              Object.defineProperty(val, 'name', {
                  value: key
              });
          } catch (e) {
          // eslint-disable-next-line no-empty
          }
          Object.defineProperty(val, 'adapterName', {
              value: key
          });
      }
  });
  var adapters = {
      /**
     * get http or xhr adapter
     * @param {*} adapters user pass or ['xhr', 'http']
     * @returns
     */ getAdapter: (adapters)=>{
          adapters = utils$2.isArray(adapters) ? adapters : [
              adapters
          ];
          const { length } = adapters;
          let nameOrAdapter;
          let adapter;
          // find not null adapter
          for(let i = 0; i < length; i++){
              nameOrAdapter = adapters[i];
              if (adapter = utils$2.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter) {
                  break;
              }
          }
          if (!adapter) {
              if (adapter === false) {
                  throw new AxiosError$1(`Adapter ${nameOrAdapter} is not supported by the environment`, 'ERR_NOT_SUPPORT');
              }
              throw new Error(utils$2.hasOwnProp(knownAdapters, nameOrAdapter) ? `Adapter '${nameOrAdapter}' is not available in the build` : `Unknown adapter '${nameOrAdapter}'`);
          }
          if (!utils$2.isFunction(adapter)) {
              throw new TypeError('adapter is not a function');
          }
          return adapter;
      },
      adapters: knownAdapters
  };

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   *
   * @param {Object} config The config that is to be used for the request
   *
   * @returns {void}
   */ function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
          config.cancelToken.throwIfRequested();
      }
      if (config.signal && config.signal.aborted) {
          throw new CanceledError(null, config);
      }
  }
  /**
   * Dispatch a request to the server using the configured adapter.
   * 请求如有异常，需向外抛出异常，不拦截
   * @param {object} config The config that is to be used for the request
   *
   * @returns {Promise<*>} The Promise to be fulfilled
   */ function dispatchRequest(config) {
      let R;
      throwIfCancellationRequested(config);
      config.headers = AxiosHeaders$1.from(config.headers);
      // Transform request data
      config.data = transformData.call(config, config.transformRequest);
      if ([
          'post',
          'put',
          'patch'
      ].indexOf(config.method) !== -1) {
          config.headers.setContentType('application/x-www-form-urlencoded', false);
      }
      const Adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);
      const adapter = new Adapter(config);
      if (config.stream) R = adapter.request(this);
      else {
          R = adapter.request(this).then((response)=>{
              throwIfCancellationRequested(config);
              // Transform response data
              response.data = transformData.call(config, config.transformResponse, response);
              // ! body === data
              Object.defineProperty(response, 'body', {
                  get () {
                      return response.data;
                  }
              });
              // if (response.data && !response.body) response.body = response.data
              response.headers = AxiosHeaders$1.from(response.headers);
              return response;
          }, (reason)=>{
              if (!isCancel(reason)) {
                  throwIfCancellationRequested(config);
                  // Transform response data
                  if (reason && reason.response) {
                      reason.response.data = transformData.call(config, config.transformResponse, reason.response);
                      // body === data
                      if (reason.response.data && !reason.response.body) reason.response.body = reason.response.data;
                      reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
                  }
              }
              return Promise.reject(reason);
          });
      }
      return R;
  }

  const headersToObject = (thing)=>thing instanceof AxiosHeaders$1 ? {
          ...thing
      } : thing;
  /**
   * Config-specific merge-function which creates a new config-object
   * by merging two configuration objects together.
   *
   * @param {Object} config1
   * @param {Object} config2
   *
   * @returns {Object} New object resulting from merging config2 to config1
   */ function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      const config = {};
      function getMergedValue(target, source, caseless) {
          if (utils$2.isPlainObject(target) && utils$2.isPlainObject(source)) {
              return utils$2.merge.call({
                  caseless
              }, target, source);
          } else if (utils$2.isPlainObject(source)) {
              return utils$2.merge({}, source);
          } else if (utils$2.isArray(source)) {
              return source.slice();
          }
          return source;
      }
      // eslint-disable-next-line consistent-return
      function mergeDeepProperties(a, b, caseless) {
          if (!utils$2.isUndefined(b)) {
              return getMergedValue(a, b, caseless);
          } else if (!utils$2.isUndefined(a)) {
              return getMergedValue(undefined, a, caseless);
          }
      }
      // eslint-disable-next-line consistent-return
      function valueFromConfig2(a, b) {
          if (!utils$2.isUndefined(b)) {
              return getMergedValue(undefined, b);
          }
      }
      // eslint-disable-next-line consistent-return
      function defaultToConfig2(a, b) {
          if (!utils$2.isUndefined(b)) {
              return getMergedValue(undefined, b);
          } else if (!utils$2.isUndefined(a)) {
              return getMergedValue(undefined, a);
          }
      }
      // eslint-disable-next-line consistent-return
      function mergeDirectKeys(a, b, prop) {
          if (prop in config2) {
              return getMergedValue(a, b);
          } else if (prop in config1) {
              return getMergedValue(undefined, a);
          }
      }
      const mergeMap = {
          url: valueFromConfig2,
          method: valueFromConfig2,
          data: valueFromConfig2,
          baseURL: defaultToConfig2,
          transformRequest: defaultToConfig2,
          transformResponse: defaultToConfig2,
          paramsSerializer: defaultToConfig2,
          timeout: defaultToConfig2,
          timeoutMessage: defaultToConfig2,
          withCredentials: defaultToConfig2,
          withXSRFToken: defaultToConfig2,
          adapter: defaultToConfig2,
          responseType: defaultToConfig2,
          xsrfCookieName: defaultToConfig2,
          xsrfHeaderName: defaultToConfig2,
          onUploadProgress: defaultToConfig2,
          onDownloadProgress: defaultToConfig2,
          decompress: defaultToConfig2,
          maxContentLength: defaultToConfig2,
          maxBodyLength: defaultToConfig2,
          beforeRedirect: defaultToConfig2,
          transport: defaultToConfig2,
          httpAgent: defaultToConfig2,
          httpsAgent: defaultToConfig2,
          cancelToken: defaultToConfig2,
          socketPath: defaultToConfig2,
          responseEncoding: defaultToConfig2,
          validateStatus: mergeDirectKeys,
          headers: (a, b)=>mergeDeepProperties(headersToObject(a), headersToObject(b), true)
      };
      utils$2.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
          const merge = mergeMap[prop] || mergeDeepProperties;
          const configValue = merge(config1[prop], config2[prop], prop);
          utils$2.isUndefined(configValue) && merge !== mergeDirectKeys || (config[prop] = configValue);
      });
      return config;
  }

  const VERSION = "1.7.7";

  const validators$1 = {};
  // eslint-disable-next-line func-names
  [
      'object',
      'boolean',
      'number',
      'function',
      'string',
      'symbol'
  ].forEach((type, i)=>{
      validators$1[type] = function validator(thing) {
          return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
      };
  });
  const deprecatedWarnings = {};
  /**
   * Transitional option validator
   *
   * @param {function|boolean?} validator - set to false if the transitional option has been removed
   * @param {string?} version - deprecated version / removed since version
   * @param {string?} message - some message with additional info
   *
   * @returns {function}
   */ validators$1.transitional = function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
          return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
      }
      // eslint-disable-next-line func-names
      return (value, opt, opts)=>{
          if (validator === false) {
              throw new AxiosError$1(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')), AxiosError$1.ERR_DEPRECATED);
          }
          if (version && !deprecatedWarnings[opt]) {
              deprecatedWarnings[opt] = true;
              // eslint-disable-next-line no-console
              console.warn(formatMessage(opt, ' has been deprecated since v' + version + ' and will be removed in the near future'));
          }
          return validator ? validator(value, opt, opts) : true;
      };
  };
  validators$1.spelling = function spelling(correctSpelling) {
      return (value, opt)=>{
          // eslint-disable-next-line no-console
          console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
          return true;
      };
  };
  /**
   * Assert object's properties type
   *
   * @param {object} options
   * @param {object} schema
   * @param {boolean?} allowUnknown
   *
   * @returns {object}
   */ function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== 'object') {
          throw new AxiosError$1('options must be an object', AxiosError$1.ERR_BAD_OPTION_VALUE);
      }
      const keys = Object.keys(options);
      let i = keys.length;
      while(i-- > 0){
          const opt = keys[i];
          const validator = schema[opt];
          if (validator) {
              const value = options[opt];
              const result = value === undefined || validator(value, opt, options);
              if (result !== true) {
                  throw new AxiosError$1('option ' + opt + ' must be ' + result, AxiosError$1.ERR_BAD_OPTION_VALUE);
              }
              continue;
          }
          if (allowUnknown !== true) {
              throw new AxiosError$1('Unknown option ' + opt, AxiosError$1.ERR_BAD_OPTION);
          }
      }
  }
  var validator = {
      assertOptions,
      validators: validators$1
  };

  const { validators } = validator;
  /**
   * Create a new instance of Axios
   *
   * @param {Object} instanceConfig The default config for the instance
   *
   * @return {Axios} A new instance of Axios
   */ let Axios = class Axios {
      /**
     * !+++
     * config 属性直接挂在到实例上，方便读取、设置、修改
     * 需注意，不要与其属性、方法冲突！！！
      request(config)
      get(url[, config])
      delete(url[, config])
      head(url[, config])
      options(url[, config])
      post(url[, data[, config]])
      put(url[, data[, config]])
      patch(url[, data[, config]])
      getUri([config])
     */ init() {
          const m = this;
          [
              'url',
              'method',
              'baseURL',
              'transformRequest',
              'transformResponse',
              'headers',
              'params',
              'paramsSerializer',
              'body',
              'data',
              'timeout',
              'withCredentials',
              'adapter',
              'auth',
              'responseType',
              'responseEncoding',
              'xsrfCookieName',
              'xsrfHeaderName',
              'onUploadProgress',
              'onDownloadProgress',
              'maxContentLength',
              'maxBodyLength',
              'validateStatus',
              'maxRedirects',
              'beforeRedirect',
              'socketPath',
              'httpAgent',
              'httpsAgent',
              'agent',
              'cancelToken',
              'signal',
              'decompress',
              'insecureHTTPParser',
              'transitional',
              'env',
              'formSerializer',
              'maxRate'
          ].forEach((p)=>Object.defineProperty(m, p, {
                  enumerable: true,
                  get () {
                      return m.config[p];
                  },
                  set (value) {
                      m.config[p] = value;
                  }
              }));
      }
      /**
     * Dispatch a request
     * 启动执行请求，返回 Promise 实例
     * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
     * @param {?Object} config
     * @returns {Promise} The Promise to be fulfilled
     */ async request(configOrUrl, config) {
          try {
              return await this._request(configOrUrl, config);
          } catch (err) {
              if (err instanceof Error) {
                  let dummy = {};
                  Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
                  // slice off the Error: ... line
                  const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, '') : '';
                  try {
                      if (!err.stack) {
                          err.stack = stack;
                      // match without the 2 top stack lines
                      } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ''))) {
                          err.stack += '\n' + stack;
                      }
                  } catch (e) {
                  // ignore the case where "stack" is an un-writable property
                  }
              }
              throw err // 抛出异常
              ;
          }
      }
      /**
     * 执行请求
     * @param {*} configOrUrl
     * @param {*} config
     * @param {boolean} [stream = false] - 是否返回 stream
     * @returns
     */ _request(configOrUrl, config, stream = false) {
          let R = null;
          /* eslint no-param-reassign:0 */ // Allow for axios('example/url'[, config]) a la fetch API
          if (typeof configOrUrl === 'string') {
              config = config || {};
              config.url = configOrUrl;
          } else {
              config = configOrUrl || {};
          }
          // ! body as data alias, body ==> data，内部保持data不变
          if (!config.data && config.body) {
              config.data = config.body;
          // config.body = undefined;
          }
          config = mergeConfig(this.defaults, config);
          const { transitional, paramsSerializer, headers } = config;
          if (transitional !== undefined) {
              validator.assertOptions(transitional, {
                  silentJSONParsing: validators.transitional(validators.boolean),
                  forcedJSONParsing: validators.transitional(validators.boolean),
                  clarifyTimeoutError: validators.transitional(validators.boolean)
              }, false);
          }
          if (paramsSerializer) {
              if (utils$2.isFunction(paramsSerializer)) {
                  config.paramsSerializer = {
                      serialize: paramsSerializer
                  };
              } else {
                  validator.assertOptions(paramsSerializer, {
                      encode: validators.function,
                      serialize: validators.function
                  }, true);
              }
          }
          validator.assertOptions(config, {
              baseUrl: validators.spelling('baseURL'),
              withXsrfToken: validators.spelling('withXSRFToken')
          }, true);
          // Set config.method
          config.method = (config.method || this.defaults.method || 'get').toLowerCase();
          // Flatten headers，方法头覆盖通用头
          const contextHeaders = headers && utils$2.merge(headers.common, headers[config.method]);
          headers && utils$2.forEach([
              'delete',
              'get',
              'head',
              'post',
              'put',
              'patch',
              'common'
          ], (method)=>{
              delete headers[method];
          });
          // 源值存在，则不覆盖，contextHeaders 优先于 headers
          config.headers = AxiosHeaders$1.concat(contextHeaders, headers);
          // filter out skipped interceptors
          const requestInterceptorChain = [] // 请求拦截器，hook
          ;
          let synchronousRequestInterceptors = true;
          this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
              if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
                  return;
              }
              synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
              requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
          });
          const responseInterceptorChain = [] // 响应拦截器，hook
          ;
          this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
              responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
          });
          let promise;
          let i = 0;
          let len;
          debugger;
          // 执行dispatchRequest
          // !+++ stream
          if (stream) {
              config.stream = true;
              R = dispatchRequest.call(this, config) // not promise
              ;
          } else if (!synchronousRequestInterceptors) {
              // 异步拦截器
              const chain = [
                  dispatchRequest.bind(this),
                  undefined
              ] // dispatchRequest 放入运行链
              ;
              chain.unshift(...requestInterceptorChain) // !*** 插入头
              ;
              chain.push(...responseInterceptorChain) // !*** 加入尾
              ;
              len = chain.length;
              promise = Promise.resolve(config) // promise 对象
              ;
              // 传入config配置，按顺序执行
              while(i < len)promise = promise.then(chain[i++], chain[i++]);
              R = promise;
          } else {
              // 同步拦截器
              len = requestInterceptorChain.length;
              let newConfig = config;
              i = 0;
              // 按加入顺序运行 request 拦截器
              while(i < len){
                  const onFulfilled = requestInterceptorChain[i++];
                  const onRejected = requestInterceptorChain[i++];
                  try {
                      newConfig = onFulfilled(newConfig) // 执行
                      ;
                  } catch (error) {
                      onRejected.call(this, error);
                      break;
                  }
              }
              try {
                  promise = dispatchRequest.call(this, newConfig);
                  i = 0;
                  len = responseInterceptorChain.length;
                  // 按顺序执行响应 hook
                  while(i < len)promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
                  R = promise;
              } catch (error) {
                  R = Promise.reject(error);
              }
          }
          return R;
      }
      /**
     * !+++
     * 类似 request 库，返回 stream
     * stream 模式下，拦截器无效
     * 如需拦截器，请使用 responseType: 'stream'，data 为 stream 传出
     * 或者 将 stream 作为 data 传入
     * @param {*} configOrUrl
     * @param {*} config
     * @returns
     */ stream(configOrUrl, config) {
          return this._request(configOrUrl, config, true);
      }
      /**
     *
     * @param {*} config
     * @returns
     */ getUri(config) {
          config = mergeConfig(this.defaults, config);
          const fullPath = buildFullPath(config.baseURL, config.url);
          return buildURL(fullPath, config.params, config.paramsSerializer);
      }
      constructor(instanceConfig){
          this.defaults = instanceConfig;
          this.config = this.defaults // !+++
          ;
          this.interceptors = {
              request: new InterceptorManager$1(),
              response: new InterceptorManager$1()
          };
          this.init() // !+++
          ;
      }
  };
  // Provide aliases for supported request methods
  utils$2.forEach([
      'head',
      'options'
  ], function forEachMethodNoData(method) {
      /* eslint func-names:0 */ Axios.prototype[method] = function(url, config) {
          return this.request(mergeConfig(config || {}, {
              method,
              url,
              data: (config || {}).data
          }));
      };
  });
  // delete、get, 与 axios不同，第二个参数为 params，而不是 data
  utils$2.forEach([
      'delete',
      'get'
  ], function forEachMethodNoData(method) {
      Axios.prototype[method] = function(url, params, config) {
          return this.request(mergeConfig(config || {}, {
              method,
              url,
              params
          }));
      };
  });
  utils$2.forEach([
      'post',
      'put',
      'patch'
  ], function forEachMethodWithData(method) {
      function generateHTTPMethod(isForm) {
          return function httpMethod(url, data, config) {
              return this.request(mergeConfig(config || {}, {
                  method,
                  headers: isForm ? {
                      'Content-Type': 'multipart/form-data'
                  } : {},
                  url,
                  data
              }));
          };
      }
      Axios.prototype[method] = generateHTTPMethod();
      Axios.prototype[`${method}Form`] = generateHTTPMethod(true);
  });
  // stream get, 与 axios不同，第二个参数为 params，而不是 data
  utils$2.forEach([
      'gets'
  ], function forEachMethodNoData(method) {
      Axios.prototype[method] = function(url, params, config) {
          return this.stream(mergeConfig(config || {}, {
              method,
              url,
              params,
              data: (config || {}).data
          }));
      };
  });
  // stream post put patch
  utils$2.forEach([
      'posts',
      'puts',
      'patchs'
  ], function forEachMethodWithData(method) {
      function generateStreamMethod(isForm) {
          return function httpMethod(url, data, config) {
              return this.stream(mergeConfig(config || {}, {
                  method,
                  headers: isForm ? {
                      'Content-Type': 'multipart/form-data'
                  } : {},
                  url,
                  data
              }));
          };
      }
      Axios.prototype[method] = generateStreamMethod();
      Axios.prototype[`${method}Forms`] = generateStreamMethod(true);
  });
  var Axios$1 = Axios;

  /**
   * A `CancelToken` is an object that can be used to request cancellation of an operation.
   *
   * @param {Function} executor The executor function.
   *
   * @returns {CancelToken}
   */ let CancelToken = class CancelToken {
      /**
     * Throws a `CanceledError` if cancellation has been requested.
     */ throwIfRequested() {
          if (this.reason) {
              throw this.reason;
          }
      }
      /**
     * Subscribe to the cancel signal
     */ subscribe(listener) {
          if (this.reason) {
              listener(this.reason);
              return;
          }
          if (this._listeners) {
              this._listeners.push(listener);
          } else {
              this._listeners = [
                  listener
              ];
          }
      }
      /**
     * Unsubscribe from the cancel signal
     */ unsubscribe(listener) {
          if (!this._listeners) {
              return;
          }
          const index = this._listeners.indexOf(listener);
          if (index !== -1) {
              this._listeners.splice(index, 1);
          }
      }
      toAbortSignal() {
          const controller = new AbortController();
          const abort = (err)=>{
              controller.abort(err);
          };
          this.subscribe(abort);
          controller.signal.unsubscribe = ()=>this.unsubscribe(abort);
          return controller.signal;
      }
      /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */ static source() {
          let cancel;
          const token = new CancelToken(function executor(c) {
              cancel = c;
          });
          return {
              token,
              cancel
          };
      }
      constructor(executor){
          if (typeof executor !== 'function') {
              throw new TypeError('executor must be a function.');
          }
          let resolvePromise;
          this.promise = new Promise(function promiseExecutor(resolve) {
              resolvePromise = resolve;
          });
          const token = this;
          // eslint-disable-next-line func-names
          this.promise.then((cancel)=>{
              if (!token._listeners) return;
              let i = token._listeners.length;
              while(i-- > 0){
                  token._listeners[i](cancel);
              }
              token._listeners = null;
          });
          // eslint-disable-next-line func-names
          this.promise.then = (onfulfilled)=>{
              let _resolve;
              // eslint-disable-next-line func-names
              const promise = new Promise((resolve)=>{
                  token.subscribe(resolve);
                  _resolve = resolve;
              }).then(onfulfilled);
              promise.cancel = function reject() {
                  token.unsubscribe(_resolve);
              };
              return promise;
          };
          executor(function cancel(message, config, request) {
              if (token.reason) {
                  // Cancellation has already been requested
                  return;
              }
              token.reason = new CanceledError(message, config, request);
              resolvePromise(token.reason);
          });
      }
  };
  var CancelToken$1 = CancelToken;

  /**
   * Syntactic sugar for invoking a function and expanding an array for arguments.
   *
   * Common use case would be to use `Function.prototype.apply`.
   *
   *  ```js
   *  function f(x, y, z) {}
   *  var args = [1, 2, 3];
   *  f.apply(null, args);
   *  ```
   *
   * With `spread` this example can be re-written.
   *
   *  ```js
   *  spread(function(x, y, z) {})([1, 2, 3]);
   *  ```
   *
   * @param {Function} callback
   *
   * @returns {Function}
   */ function spread(callback) {
      return function wrap(arr) {
          return callback.apply(null, arr);
      };
  }

  /**
   * Determines whether the payload is an error thrown by Axios
   *
   * @param {*} payload The value to test
   *
   * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
   */ function isAxiosError(payload) {
      return utils$2.isObject(payload) && payload.isAxiosError === true;
  }

  /**
   * Create an instance of Axios
   *
   * @param {Object} defaultConfig The default config for the instance
   *
   * @returns {Axios} A new instance of Axios
   */ function createInstance(defaultConfig) {
      const context = new Axios$1(defaultConfig);
      const instance = bind$1(Axios$1.prototype.request, context);
      // Copy axios.prototype to instance
      utils$2.extend(instance, Axios$1.prototype, context, {
          allOwnKeys: true
      });
      // Copy context to instance
      utils$2.extend(instance, context, null, {
          allOwnKeys: true
      });
      // Factory for creating new instances
      instance.create = function create(instanceConfig) {
          return createInstance(mergeConfig(defaultConfig, instanceConfig));
      };
      return instance;
  }
  // Create the default instance to be exported
  const req = createInstance(defaults$1);
  // Expose Axios class to allow class inheritance
  req.Axios = Axios$1;
  // Expose Cancel & CancelToken
  req.CanceledError = CanceledError;
  req.CancelToken = CancelToken$1;
  req.isCancel = isCancel;
  req.VERSION = VERSION;
  req.toFormData = toFormData$1;
  // Expose AxiosError class
  req.AxiosError = AxiosError$1;
  // alias for CanceledError for backward compatibility
  req.Cancel = req.CanceledError;
  // Expose all/spread
  req.all = (promises)=>Promise.all(promises);
  req.spread = spread;
  // Expose isAxiosError
  req.isAxiosError = isAxiosError;
  // Expose mergeConfig
  req.mergeConfig = mergeConfig;
  req.AxiosHeaders = AxiosHeaders$1;
  req.formToJSON = (thing)=>formDataToJSON(utils$2.isHTMLForm(thing) ? new FormData(thing) : thing);
  req.getAdapter = adapters.getAdapter;
  req.default = req;

  return req;

}));
