/*!
  * @wia/req v1.7.7
  * (c) 2024 Sibyl Yu, Matt Zabriskie and contributors
  * Released under the MIT License.
  */
import FormData$1 from 'form-data';
import url from 'url';
import request from '@wiajs/request';
import Agent from '@wiajs/agent';
import { log as log$1, name } from '@wiajs/log';
import util from 'node:util';
import zlib from 'node:zlib';
import stream$1 from 'node:stream';
import stream, { Readable } from 'stream';
import { EventEmitter } from 'node:events';
import { TextEncoder } from 'util';

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
const utils$1 = {
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
utils$1.inherits(AxiosError$1, Error, {
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
const prototype$1 = AxiosError$1.prototype;
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
Object.defineProperties(AxiosError$1, descriptors);
Object.defineProperty(prototype$1, 'isAxiosError', {
    value: true
});
// eslint-disable-next-line func-names
AxiosError$1.from = (error, code, config, request, response, customProps)=>{
    const axiosError = Object.create(prototype$1);
    utils$1.toFlatObject(error, axiosError, function filter(obj) {
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
 */ function toFormData$1(obj, formData, options) {
    if (!utils$1.isObject(obj)) {
        throw new TypeError('target must be an object');
    }
    // eslint-disable-next-line no-param-reassign
    formData = formData || new (FormData$1 || FormData)();
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
            throw new AxiosError$1('Blob is not supported. Use a Buffer instead.');
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
                    !(utils$1.isUndefined(el) || el === null) && formData.append(// eslint-disable-next-line no-nested-ternary
                    indexes === true ? renderKey([
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
 */ function encode$1(str) {
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
    params && toFormData$1(params, this, options);
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
        return encoder.call(this, value, encode$1);
    } : encode$1;
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
 */ function encode(val) {
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
    const _encode = options && options.encode || encode;
    const serializeFn = options && options.serialize;
    let serializedParams;
    if (serializeFn) {
        serializedParams = serializeFn(params, options);
    } else {
        serializedParams = utils$1.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, options).toString(_encode);
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
    constructor(){
        this.handlers = [];
    }
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
        utils$1.forEach(this.handlers, function forEachHandler(h) {
            if (h !== null) {
                fn(h);
            }
        });
    }
};
const InterceptorManager$1 = InterceptorManager;

const transitionalDefaults = {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false
};

const URLSearchParams = url.URLSearchParams;

const platform$1 = {
    isNode: true,
    classes: {
        URLSearchParams,
        FormData: FormData$1,
        Blob: typeof Blob !== 'undefined' && Blob || null
    },
    protocols: [
        'http',
        'https',
        'file',
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

const utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    hasBrowserEnv: hasBrowserEnv,
    hasStandardBrowserEnv: hasStandardBrowserEnv,
    hasStandardBrowserWebWorkerEnv: hasStandardBrowserWebWorkerEnv,
    navigator: _navigator,
    origin: origin
});

const platform = {
    ...utils,
    ...platform$1
};

function toURLEncodedForm(data, options) {
    return toFormData$1(data, new platform.classes.URLSearchParams(), Object.assign({
        visitor: function(value, key, path, helpers) {
            if (platform.isNode && utils$1.isBuffer(value)) {
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
    return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match)=>{
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
        name = !name && utils$1.isArray(target) ? target.length : name;
        if (isLast) {
            if (utils$1.hasOwnProp(target, name)) {
                target[name] = [
                    target[name],
                    value
                ];
            } else {
                target[name] = value;
            }
            return !isNumericKey;
        }
        if (!target[name] || !utils$1.isObject(target[name])) {
            target[name] = [];
        }
        const result = buildPath(path, value, target[name], index);
        if (result && utils$1.isArray(target[name])) {
            target[name] = arrayToObject(target[name]);
        }
        return !isNumericKey;
    }
    if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
        const obj = {};
        utils$1.forEachEntry(formData, (name, value)=>{
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
    if (utils$1.isString(rawValue)) {
        try {
            (parser || JSON.parse)(rawValue);
            return utils$1.trim(rawValue);
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
            const isObjectPayload = utils$1.isObject(data);
            if (isObjectPayload && utils$1.isHTMLForm(data)) {
                data = new FormData(data);
            }
            const isFormData = utils$1.isFormData(data);
            if (isFormData) {
                return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
            }
            if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
                return data;
            }
            if (utils$1.isArrayBufferView(data)) {
                return data.buffer;
            }
            if (utils$1.isURLSearchParams(data)) {
                headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
                return data.toString();
            }
            let isFileList;
            if (isObjectPayload) {
                if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
                    return toURLEncodedForm(data, this.formSerializer).toString();
                }
                if ((isFileList = utils$1.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
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
            if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
                return data;
            }
            if (data && utils$1.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
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
utils$1.forEach([
    'delete',
    'get',
    'head',
    'post',
    'put',
    'patch'
], (method)=>{
    defaults.headers[method] = {};
});
const defaults$1 = defaults;

// RawAxiosHeaders whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
const ignoreDuplicateOf = utils$1.toObjectSet([
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
 */ const parseHeaders = ((rawHeaders)=>{
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

var _computedKey, _computedKey1;
const $internals = Symbol('internals');
function normalizeHeader(header) {
    return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
    if (value === false || value == null) {
        return value;
    }
    return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
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
    if (utils$1.isFunction(filter)) {
        return filter.call(this, value, header);
    }
    if (isHeaderNameFilter) {
        value = header;
    }
    if (!utils$1.isString(value)) return;
    if (utils$1.isString(filter)) {
        return value.indexOf(filter) !== -1;
    }
    if (utils$1.isRegExp(filter)) {
        return filter.test(value);
    }
}
function formatHeader(header) {
    return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str)=>{
        return char.toUpperCase() + str;
    });
}
function buildAccessors(obj, header) {
    const accessorName = utils$1.toCamelCase(' ' + header);
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
_computedKey = Symbol.iterator, _computedKey1 = Symbol.toStringTag;
let AxiosHeaders$1 = class AxiosHeaders {
    constructor(headers){
        headers && this.set(headers);
    }
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
            const key = utils$1.findKey(self, lHeader);
            if (!key || self[key] === undefined || _rewrite === true || _rewrite === undefined && self[key] !== false) {
                self[key || _header] = normalizeValue(_value);
            }
        }
        const setHeaders = (headers, _rewrite)=>utils$1.forEach(headers, (_value, _header)=>setHeader(_value, _header, _rewrite));
        if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
            setHeaders(header, valueOrRewrite);
        } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
            setHeaders(parseHeaders(header), valueOrRewrite);
        } else if (utils$1.isHeaders(header)) {
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
            const key = utils$1.findKey(this, header);
            if (key) {
                const value = this[key];
                if (!parser) {
                    return value;
                }
                if (parser === true) {
                    return parseTokens(value);
                }
                if (utils$1.isFunction(parser)) {
                    return parser.call(this, value, key);
                }
                if (utils$1.isRegExp(parser)) {
                    return parser.exec(value);
                }
                throw new TypeError('parser must be boolean|regexp|function');
            }
        }
    }
    has(header, matcher) {
        header = normalizeHeader(header);
        if (header) {
            const key = utils$1.findKey(this, header);
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
                const key = utils$1.findKey(self, _header);
                if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
                    delete self[key];
                    deleted = true;
                }
            }
        }
        if (utils$1.isArray(header)) {
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
        utils$1.forEach(this, (value, header)=>{
            const key = utils$1.findKey(headers, header);
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
        utils$1.forEach(this, (value, header)=>{
            value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(', ') : value);
        });
        return obj;
    }
    [_computedKey]() {
        return Object.entries(this.toJSON())[Symbol.iterator]();
    }
    toString() {
        return Object.entries(this.toJSON()).map(([header, value])=>header + ': ' + value).join('\n');
    }
    get [_computedKey1]() {
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
        utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
        return this;
    }
};
AxiosHeaders$1.accessor([
    'Content-Type',
    'Content-Length',
    'Accept',
    'Accept-Encoding',
    'User-Agent',
    'Authorization'
]);
// reserved names hotfix
utils$1.reduceDescriptors(AxiosHeaders$1.prototype, ({ value }, key)=>{
    let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
    return {
        get: ()=>value,
        set (headerValue) {
            this[mapped] = headerValue;
        }
    };
});
utils$1.freezeMethods(AxiosHeaders$1);
const AxiosHeaders$2 = AxiosHeaders$1;

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
    const headers = AxiosHeaders$2.from(context.headers);
    let data = context.data;
    utils$1.forEach(fns, function transform(fn) {
        data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
    });
    headers.normalize();
    return data;
}

function isCancel$1(value) {
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
 */ function CanceledError$1(message, config, request) {
    // eslint-disable-next-line no-eq-null,eqeqeq
    AxiosError$1.call(this, message == null ? 'canceled' : message, AxiosError$1.ERR_CANCELED, config, request);
    this.name = 'CanceledError';
}
utils$1.inherits(CanceledError$1, AxiosError$1, {
    __CANCEL__: true
});

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 *
 * @returns {object} The response.
 */ function settle(resolve, reject, response) {
    const validateStatus = response.config.validateStatus;
    if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
    } else {
        reject(new AxiosError$1('Request failed with status code ' + response.status, [
            AxiosError$1.ERR_BAD_REQUEST,
            AxiosError$1.ERR_BAD_RESPONSE
        ][Math.floor(response.status / 100) - 4], response.config, response.request, response));
    }
}

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

const VERSION$1 = "1.7.7";

function parseProtocol(url) {
    const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
    return match && match[1] || '';
}

const DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
/**
 * Parse data uri to a Buffer or Blob
 *
 * @param {String} uri
 * @param {?Boolean} asBlob
 * @param {?Object} options
 * @param {?Function} options.Blob
 *
 * @returns {Buffer|Blob}
 */ function fromDataURI(uri, asBlob, options) {
    const _Blob = options && options.Blob || platform.classes.Blob;
    const protocol = parseProtocol(uri);
    if (asBlob === undefined && _Blob) {
        asBlob = true;
    }
    if (protocol === 'data') {
        uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
        const match = DATA_URL_PATTERN.exec(uri);
        if (!match) {
            throw new AxiosError$1('Invalid URL', AxiosError$1.ERR_INVALID_URL);
        }
        const mime = match[1];
        const isBase64 = match[2];
        const body = match[3];
        const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? 'base64' : 'utf8');
        if (asBlob) {
            if (!_Blob) {
                throw new AxiosError$1('Blob is not supported', AxiosError$1.ERR_NOT_SUPPORT);
            }
            return new _Blob([
                buffer
            ], {
                type: mime
            });
        }
        return buffer;
    }
    throw new AxiosError$1('Unsupported protocol ' + protocol, AxiosError$1.ERR_NOT_SUPPORT);
}

const kInternals = Symbol('internals');
let AxiosTransformStream = class AxiosTransformStream extends stream.Transform {
    constructor(options){
        options = utils$1.toFlatObject(options, {
            maxRate: 0,
            chunkSize: 64 * 1024,
            minChunkSize: 100,
            timeWindow: 500,
            ticksRate: 2,
            samplesCount: 15
        }, null, (prop, source)=>{
            return !utils$1.isUndefined(source[prop]);
        });
        super({
            readableHighWaterMark: options.chunkSize
        });
        const internals = this[kInternals] = {
            timeWindow: options.timeWindow,
            chunkSize: options.chunkSize,
            maxRate: options.maxRate,
            minChunkSize: options.minChunkSize,
            bytesSeen: 0,
            isCaptured: false,
            notifiedBytesLoaded: 0,
            ts: Date.now(),
            bytes: 0,
            onReadCallback: null
        };
        this.on('newListener', (event)=>{
            if (event === 'progress') {
                if (!internals.isCaptured) {
                    internals.isCaptured = true;
                }
            }
        });
    }
    _read(size) {
        const internals = this[kInternals];
        if (internals.onReadCallback) {
            internals.onReadCallback();
        }
        return super._read(size);
    }
    _transform(chunk, encoding, callback) {
        const internals = this[kInternals];
        const maxRate = internals.maxRate;
        const readableHighWaterMark = this.readableHighWaterMark;
        const timeWindow = internals.timeWindow;
        const divider = 1000 / timeWindow;
        const bytesThreshold = maxRate / divider;
        const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
        const pushChunk = (_chunk, _callback)=>{
            const bytes = Buffer.byteLength(_chunk);
            internals.bytesSeen += bytes;
            internals.bytes += bytes;
            internals.isCaptured && this.emit('progress', internals.bytesSeen);
            if (this.push(_chunk)) {
                process.nextTick(_callback);
            } else {
                internals.onReadCallback = ()=>{
                    internals.onReadCallback = null;
                    process.nextTick(_callback);
                };
            }
        };
        const transformChunk = (_chunk, _callback)=>{
            const chunkSize = Buffer.byteLength(_chunk);
            let chunkRemainder = null;
            let maxChunkSize = readableHighWaterMark;
            let bytesLeft;
            let passed = 0;
            if (maxRate) {
                const now = Date.now();
                if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
                    internals.ts = now;
                    bytesLeft = bytesThreshold - internals.bytes;
                    internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
                    passed = 0;
                }
                bytesLeft = bytesThreshold - internals.bytes;
            }
            if (maxRate) {
                if (bytesLeft <= 0) {
                    // next time window
                    return setTimeout(()=>{
                        _callback(null, _chunk);
                    }, timeWindow - passed);
                }
                if (bytesLeft < maxChunkSize) {
                    maxChunkSize = bytesLeft;
                }
            }
            if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
                chunkRemainder = _chunk.subarray(maxChunkSize);
                _chunk = _chunk.subarray(0, maxChunkSize);
            }
            pushChunk(_chunk, chunkRemainder ? ()=>{
                process.nextTick(_callback, null, chunkRemainder);
            } : _callback);
        };
        transformChunk(chunk, function transformNextChunk(err, _chunk) {
            if (err) {
                return callback(err);
            }
            if (_chunk) {
                transformChunk(_chunk, transformNextChunk);
            } else {
                callback(null);
            }
        });
    }
};
const AxiosTransformStream$1 = AxiosTransformStream;

const { asyncIterator } = Symbol;
const readBlob = async function*(blob) {
    if (blob.stream) {
        yield* blob.stream();
    } else if (blob.arrayBuffer) {
        yield await blob.arrayBuffer();
    } else if (blob[asyncIterator]) {
        yield* blob[asyncIterator]();
    } else {
        yield blob;
    }
};
const readBlob$1 = readBlob;

const BOUNDARY_ALPHABET = utils$1.ALPHABET.ALPHA_DIGIT + '-_';
const textEncoder = new TextEncoder();
const CRLF = '\r\n';
const CRLF_BYTES = textEncoder.encode(CRLF);
const CRLF_BYTES_COUNT = 2;
let FormDataPart = class FormDataPart {
    constructor(name, value){
        const { escapeName } = this.constructor;
        const isStringValue = utils$1.isString(value);
        let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ''}${CRLF}`;
        if (isStringValue) {
            value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
        } else {
            headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
        }
        this.headers = textEncoder.encode(headers + CRLF);
        this.contentLength = isStringValue ? value.byteLength : value.size;
        this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
        this.name = name;
        this.value = value;
    }
    async *encode() {
        yield this.headers;
        const { value } = this;
        if (utils$1.isTypedArray(value)) {
            yield value;
        } else {
            yield* readBlob$1(value);
        }
        yield CRLF_BYTES;
    }
    static escapeName(name) {
        return String(name).replace(/[\r\n"]/g, (match)=>({
                '\r': '%0D',
                '\n': '%0A',
                '"': '%22'
            })[match]);
    }
};
const formDataToStream = (form, headersHandler, options)=>{
    const { tag = 'form-data-boundary', size = 25, boundary = tag + '-' + utils$1.generateString(size, BOUNDARY_ALPHABET) } = options || {};
    if (!utils$1.isFormData(form)) {
        throw TypeError('FormData instance required');
    }
    if (boundary.length < 1 || boundary.length > 70) {
        throw Error('boundary must be 10-70 characters long');
    }
    const boundaryBytes = textEncoder.encode('--' + boundary + CRLF);
    const footerBytes = textEncoder.encode('--' + boundary + '--' + CRLF + CRLF);
    let contentLength = footerBytes.byteLength;
    const parts = Array.from(form.entries()).map(([name, value])=>{
        const part = new FormDataPart(name, value);
        contentLength += part.size;
        return part;
    });
    contentLength += boundaryBytes.byteLength * parts.length;
    contentLength = utils$1.toFiniteNumber(contentLength);
    const computedHeaders = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
    };
    if (Number.isFinite(contentLength)) {
        computedHeaders['Content-Length'] = contentLength;
    }
    headersHandler && headersHandler(computedHeaders);
    return Readable.from(async function*() {
        for (const part of parts){
            yield boundaryBytes;
            yield* part.encode();
        }
        yield footerBytes;
    }());
};
const formDataToStream$1 = formDataToStream;

const callbackify = (fn, reducer)=>{
    return utils$1.isAsyncFn(fn) ? function(...args) {
        const cb = args.pop();
        fn.apply(this, args).then((value)=>{
            try {
                reducer ? cb(null, ...reducer(value)) : cb(null, value);
            } catch (err) {
                cb(err);
            }
        }, cb);
    } : fn;
};
const callbackify$1 = callbackify;

/**
 * Calculate data maxRate
 * @param {Number} [samplesCount= 10]
 * @param {Number} [min= 1000]
 * @returns {Function}
 */ function speedometer(samplesCount, min) {
    samplesCount = samplesCount || 10;
    const bytes = new Array(samplesCount);
    const timestamps = new Array(samplesCount);
    let head = 0;
    let tail = 0;
    let firstSampleTS;
    min = min !== undefined ? min : 1000;
    return function push(chunkLength) {
        const now = Date.now();
        const startedAt = timestamps[tail];
        if (!firstSampleTS) {
            firstSampleTS = now;
        }
        bytes[head] = chunkLength;
        timestamps[head] = now;
        let i = tail;
        let bytesCount = 0;
        while(i !== head){
            bytesCount += bytes[i++];
            i = i % samplesCount;
        }
        head = (head + 1) % samplesCount;
        if (head === tail) {
            tail = (tail + 1) % samplesCount;
        }
        if (now - firstSampleTS < min) {
            return;
        }
        const passed = startedAt && now - startedAt;
        return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
    };
}

/**
 * Throttle decorator
 * @param {Function} fn
 * @param {Number} freq
 * @return {Function}
 */ function throttle(fn, freq) {
    let timestamp = 0;
    let threshold = 1000 / freq;
    let lastArgs;
    let timer;
    const invoke = (args, now = Date.now())=>{
        timestamp = now;
        lastArgs = null;
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        fn.apply(null, args);
    };
    const throttled = (...args)=>{
        const now = Date.now();
        const passed = now - timestamp;
        if (passed >= threshold) {
            invoke(args, now);
        } else {
            lastArgs = args;
            if (!timer) {
                timer = setTimeout(()=>{
                    timer = null;
                    invoke(lastArgs);
                }, threshold - passed);
            }
        }
    };
    const flush = ()=>lastArgs && invoke(lastArgs);
    return [
        throttled,
        flush
    ];
}

/**
 *
 * @param {*} listener
 * @param {*} isDownloadStream
 * @param {*} freq
 * @returns
 */ const progressEventReducer = (listener, isDownloadStream, freq = 3)=>{
    let bytesNotified = 0;
    const _speedometer = speedometer(50, 250);
    return throttle((e)=>{
        const loaded = e.loaded;
        const total = e.lengthComputable ? e.total : undefined;
        const progressBytes = loaded - bytesNotified;
        const rate = _speedometer(progressBytes);
        const inRange = loaded <= total;
        bytesNotified = loaded;
        const data = {
            loaded,
            total,
            progress: total ? loaded / total : undefined,
            bytes: progressBytes,
            rate: rate ? rate : undefined,
            estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
            event: e,
            lengthComputable: total != null,
            [isDownloadStream ? 'download' : 'upload']: true
        };
        listener(data);
    }, freq);
};
/**
 *
 * @param {*} total
 * @param {*} throttled
 * @returns
 */ const progressEventDecorator = (total, throttled)=>{
    const lengthComputable = total != null;
    return [
        (loaded)=>throttled[0]({
                lengthComputable,
                total,
                loaded
            }),
        throttled[1]
    ];
};
/**
 *
 * @param {*} fn
 * @returns
 */ const asyncDecorator = (fn)=>(...args)=>utils$1.asap(()=>fn(...args));

// import Agent from '../fea/agent.js'
const log = log$1({
    env: `wia:req:${name(import.meta.url)}`
});
const isBrotliSupported = utils$1.isFunction(zlib.createBrotliDecompress);
const isHttps = /https:?/;
const supportedProtocols = platform.protocols.map((protocol)=>`${protocol}:`);
const isHttpAdapterSupported = typeof process !== "undefined" && utils$1.kindOf(process) === "process";
/**
 * !+++
 * 将request 函数改为类，请求拆分为 init 初始化和 请求执行，
 * 如需重新发起请求时，无需重新初始化
 */ let HttpAdapter = class HttpAdapter {
    /**
	 *
	 * @param {*} config
	 */ constructor(config){
        this.isDone = false;
        this.rejected = false;
        /** @type {*} */ this.req = null;
        /** @type {*} */ this.config = null;
        /** @type {*} */ this.data = null;
        /** @type {*} */ this.transport = null;
        this.config = config;
        // temporary internal emitter until the AxiosRequest class will be implemented
        this.emitter = new EventEmitter();
    }
    /**
	 *
	 * @param {number} code
	 * @returns
	 */ noBody(code) {
        return this.method === "HEAD" || // Informational
        code >= 100 && code < 200 || // No Content
        code === 204 || // Not Modified
        code === 304;
    }
    /**
	 * 发起终止事件
	 * @param {*} reason
	 */ abort(reason) {
        this.emitter.emit("abort", !reason || reason.type ? new CanceledError$1(null, this.config, this.req) : reason);
    }
    onFinished() {
        const { config, emitter, abort } = this;
        config?.cancelToken?.unsubscribe(abort);
        config?.signal?.removeEventListener("abort", abort);
        emitter?.removeAllListeners();
    }
    /**
	 *
	 * @param {*} value
	 * @param {*} isRejected
	 */ onDone(value, isRejected) {
        this.isDone = true;
        if (isRejected) {
            this.rejected = true;
            this.onFinished();
        }
    }
    /**
	 *
	 * @param {*} value
	 * @param {*} isRejected
	 * @returns
	 */ done(value, isRejected) {
        if (this.isDone) return;
        this.isDone = true;
        this?.onDone(value, isRejected);
    }
    /**
	 * 初始化，生成 options 供请求调用
	 * @returns {*} options
	 */ async init() {
        // biome-ignore lint/complexity/noUselessThisAlias: <explanation>
        const _ = this;
        const { config } = _;
        let { data, lookup, family } = config;
        const method = config.method.toUpperCase();
        _.method = method;
        if (lookup) {
            const _lookup = callbackify$1(lookup, /** @param {*} value */ (value)=>utils$1.isArray(value) ? value : [
                    value
                ]);
            // hotfix to support opt.all option which is required for node 20.x
            /**
			 * @param {string} hostname
			 * @param {*} opt
			 * @param {*} cb
			 */ lookup = (hostname, opt, cb)=>{
                _lookup(hostname, opt, (err, arg0, arg1)=>{
                    if (err) return cb(err);
                    const addresses = utils$1.isArray(arg0) ? arg0.map((addr)=>buildAddressEntry(addr)) : [
                        buildAddressEntry(arg0, arg1)
                    ];
                    opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
                });
            };
        }
        if (config.cancelToken || config.signal) {
            config.cancelToken?.subscribe(_.abort);
            if (config.signal) {
                if (config.signal.aborted) _.abort();
                else config.signal.addEventListener("abort", _.abort);
            }
        }
        // Parse url
        const fullPath = buildFullPath(config.baseURL, config.url);
        // 'https://user:pass@sub.host.com:8080/p/a/t/h?query=string#hash'
        const parsed = new URL(fullPath, platform.hasBrowserEnv ? platform.origin : undefined);
        // http: or https:
        const protocol = parsed.protocol || supportedProtocols[0];
        _.protocol = protocol;
        if (protocol === "data:" && method !== "GET") {
            // throw error
            const response = {
                status: 405,
                statusText: "method not allowed",
                headers: {},
                config
            };
            throw new AxiosError$1(`Request failed with status code ${response.status}`, [
                AxiosError$1.ERR_BAD_REQUEST,
                AxiosError$1.ERR_BAD_RESPONSE
            ][Math.floor(response.status / 100) - 4], response.config, response.request, response);
        }
        if (supportedProtocols.indexOf(protocol) === -1) {
            throw new AxiosError$1(`Unsupported protocol ${protocol}`, AxiosError$1.ERR_BAD_REQUEST, config);
        }
        const headers = AxiosHeaders$2.from(config.headers).normalize();
        // Set User-Agent (required by some servers)
        // See https://github.com/axios/axios/issues/69
        // User-Agent is specified; handle case where no UA header is desired
        // Only set header if it hasn't been set in config
        // ! headers.set('User-Agent', 'axios/' + VERSION, false);
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35", false);
        const { onDownloadProgress, onUploadProgress, maxRate } = config;
        // support for spec compliant FormData objects
        if (utils$1.isSpecCompliantForm(data)) {
            const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
            data = formDataToStream$1(data, /** @param {*} formHeaders */ (formHeaders)=>headers.set(formHeaders), {
                tag: `axios-${VERSION$1}-boundary`,
                boundary: userBoundary?.[1] || undefined
            });
        // support for https://www.npmjs.com/package/form-data api
        } else if (utils$1.isFormData(data) && utils$1.isFunction(data.getHeaders)) {
            headers.set(data.getHeaders());
            if (!headers.hasContentLength()) {
                try {
                    const knownLength = await util.promisify(data.getLength).call(data);
                    Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
                /*eslint no-empty:0*/ } catch (e) {}
            }
        } else if (utils$1.isBlob(data)) {
            data.size && headers.setContentType(data.type || "application/octet-stream");
            headers.setContentLength(data.size || 0);
            data = stream$1.Readable.from(readBlob$1(data));
        } else if (data && !utils$1.isStream(data)) {
            if (Buffer.isBuffer(data)) ; else if (utils$1.isArrayBuffer(data)) {
                data = Buffer.from(new Uint8Array(data));
            } else if (utils$1.isString(data)) {
                data = Buffer.from(data, "utf-8");
            } else {
                throw new AxiosError$1("Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream", AxiosError$1.ERR_BAD_REQUEST, config);
            }
            // Add Content-Length header if data exists
            headers.setContentLength(data.length, false);
            if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
                throw new AxiosError$1("Request body larger than maxBodyLength limit", AxiosError$1.ERR_BAD_REQUEST, config);
            }
        }
        const contentLength = utils$1.toFiniteNumber(headers.getContentLength());
        let maxUploadRate;
        let maxDownloadRate;
        if (utils$1.isArray(maxRate)) [maxUploadRate, maxDownloadRate] = maxRate;
        else {
            maxUploadRate = maxRate;
            maxDownloadRate = maxRate;
        }
        _.maxUploadRate = maxUploadRate;
        _.maxDownloadRate = maxDownloadRate;
        if (data && (onUploadProgress || maxUploadRate)) {
            if (!utils$1.isStream(data)) {
                data = stream$1.Readable.from(data, {
                    objectMode: false
                });
            }
            data = stream$1.pipeline([
                data,
                new AxiosTransformStream$1({
                    maxRate: utils$1.toFiniteNumber(maxUploadRate)
                })
            ], utils$1.noop);
            onUploadProgress && data.on("progress", flushOnFinish(data, progressEventDecorator(contentLength, progressEventReducer(asyncDecorator(onUploadProgress), false, 3))));
        }
        // HTTP basic authentication
        let auth;
        if (config.auth) {
            const username = config.auth.username || "";
            const password = config.auth.password || "";
            auth = `${username}:${password}`;
        }
        if (!auth && parsed.username) {
            const urlUsername = parsed.username;
            const urlPassword = parsed.password;
            auth = `${urlUsername}:${urlPassword}`;
        }
        auth && headers.delete("authorization");
        let path;
        try {
            path = buildURL(parsed.pathname + parsed.search, config.params, config.paramsSerializer).replace(/^\?/, "");
        } catch (err) {
            /** @type {*} */ const customErr = new Error(err.message);
            customErr.config = config;
            customErr.url = config.url;
            customErr.exists = true;
            throw customErr;
        }
        headers.set("Accept-Encoding", `gzip, compress, deflate${isBrotliSupported ? ", br" : ""}`, false);
        /** @type {*} */ const options = {
            path,
            method,
            headers: headers.toJSON(),
            agents: {
                http: config.httpAgent,
                https: config.httpsAgent
            },
            auth,
            protocol,
            family,
            beforeRedirect: dispatchBeforeRedirect,
            beforeRedirects: {}
        };
        // cacheable-lookup integration hotfix
        if (!utils$1.isUndefined(lookup)) options.lookup = lookup;
        if (config.socketPath) options.socketPath = config.socketPath;
        else {
            options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
            options.port = parsed.port;
            // ! proxy
            if (config.agent) options.agents = new Agent(config.agent);
        }
        // 执行请求的具体对象
        _.transport = config.transport;
        const isHttpsRequest = isHttps.test(options.protocol);
        options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
        if (config.maxBodyLength > -1) options.maxBodyLength = config.maxBodyLength;
        else options.maxBodyLength = Number.POSITIVE_INFINITY;
        // maxRedirects 缺省 21，不跳转，直接使用系统http or https，不支持 stream
        // if (config.maxRedirects === 0 && !config.stream) transport = isHttpsRequest ? https : http;
        // 自动跳转
        // else {
        // 支持跳转或stream，需使用 http、https 封装类
        if (config.maxRedirects) options.maxRedirects = config.maxRedirects;
        if (config.beforeRedirect) options.beforeRedirects.config = config.beforeRedirect;
        if (config.insecureHTTPParser) options.insecureHTTPParser = config.insecureHTTPParser;
        _.options = options;
        _.data = data;
        log({
            config
        }, "init");
        return options;
    }
    /**
	 * 执行请求
	 * 需抛出内部异常
	 * @param {Axios} axios 实例
	 * @returns {Promise<*>}
	 */ async request(axios) {
        /** @type {*} */ // biome-ignore lint/style/useConst: <explanation>
        let R;
        // biome-ignore lint/complexity/noUselessThisAlias: <explanation>
        const _ = this;
        try {
            await _.init();
            const { transport, protocol, config, options, data, abort, emitter, maxDownloadRate } = _;
            const { responseType, responseEncoding, onDownloadProgress } = config;
            if (protocol === "data:") {
                /** @type {*} */ let convertedData;
                try {
                    convertedData = fromDataURI(config.url, responseType === "blob", {
                        Blob: config.env?.Blob
                    });
                } catch (err) {
                    throw AxiosError$1.from(err, AxiosError$1.ERR_BAD_REQUEST, config);
                }
                if (responseType === "text") {
                    convertedData = convertedData.toString(responseEncoding);
                    if (!responseEncoding || responseEncoding === "utf8") {
                        convertedData = utils$1.stripBOM(convertedData);
                    }
                } else if (responseType === "stream") {
                    convertedData = stream$1.Readable.from(convertedData);
                }
                // 返回响应
                R = {
                    data: convertedData,
                    status: 200,
                    statusText: "OK",
                    headers: new AxiosHeaders$2(),
                    config
                };
            } else {
                let transformStream;
                if (onDownloadProgress || maxDownloadRate) {
                    transformStream = new AxiosTransformStream$1({
                        maxRate: utils$1.toFiniteNumber(maxDownloadRate)
                    });
                    onDownloadProgress && transformStream.on("progress", flushOnFinish(transformStream, progressEventDecorator(transformStream.responseLength, progressEventReducer(asyncDecorator(onDownloadProgress), true, 3))));
                }
                options.transformStream = transformStream;
                // 发起异步请求
                R = await new Promise((resolve, reject)=>{
                    _.emitter.once("abort", reject);
                    options.stream = config.stream;
                    options.decompress = config.decompress;
                    // Create the request，promise false: return stream
                    // log.debug('request', {options});
                    const req = transport ? transport.request(options) : request(options);
                    if (!req) return reject(new AxiosError$1("Request failed.", AxiosError$1.ERR_BAD_REQUEST, config));
                    _.req = req;
                    emitter.once("abort", (err)=>{
                        log("onabort");
                        reject(err);
                        req.destroy(err);
                    });
                    // Handle errors
                    req.on("error", /** @param {*} err */ (err)=>{
                        log("onerror");
                        // @todo remove
                        // if (req.aborted && err.code !== AxiosError.ERR_FR_TOO_MANY_REDIRECTS) return;
                        reject(AxiosError$1.from(err, null, config, req));
                    });
                    // set tcp keep alive to prevent drop connection by peer
                    req.on("socket", /** @param {*} socket */ (socket)=>{
                        log("onsocket");
                        // default interval of sending ack packet is 1 minute
                        socket.setKeepAlive(true, 1000 * 60);
                    });
                    // Handle request timeout
                    if (config.timeout) {
                        // This is forcing a int timeout to avoid problems if the `req` interface doesn't handle other types.
                        const timeout = Number.parseInt(config.timeout);
                        if (Number.isNaN(timeout)) {
                            reject(new AxiosError$1("error trying to parse `config.timeout` to int", AxiosError$1.ERR_BAD_OPTION_VALUE, config, req));
                        } else {
                            // Sometime, the response will be very slow, and does not respond, the connect event will be block by event loop system.
                            // And timer callback will be fired, and abort() will be invoked before connection, then get "socket hang up" and code ECONNRESET.
                            // At this time, if we have a large number of request, nodejs will hang up some socket on background. and the number will up and up.
                            // And then these socket which be hang up will devouring CPU little by little.
                            // ClientRequest.setTimeout will be fired on the specify milliseconds, and can make sure that abort() will be fired after connect.
                            req.setTimeout(timeout, ()=>{
                                if (_.isDone) return;
                                let timeoutErrorMessage = config.timeout ? `timeout of ${config.timeout}ms exceeded` : "timeout exceeded";
                                const transitional = config.transitional || transitionalDefaults;
                                if (config.timeoutErrorMessage) {
                                    timeoutErrorMessage = config.timeoutErrorMessage;
                                }
                                reject(new AxiosError$1(timeoutErrorMessage, transitional.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED, config, req));
                                abort();
                            });
                        }
                    }
                    // stream finished
                    req.on("finished", _.onFinished.bind(_));
                    // ! stream 模式不等待响应数据，直接返回 req，建立pipe管道流
                    if (config.stream) resolve(req);
                    else {
                        // 非stream模式，等待响应数据，返回数据
                        req.on("response", /**
							 * @param {*} res
							 * @param {*} stream
							 */ (res, stream)=>{
                            if (req.destroyed) return;
                            // 'transfer-encoding': 'chunked'时，无content-length，axios v1.2 不能自动解压
                            const responseLength = +res.headers["content-length"];
                            log("onresponse", {
                                statusCode: res.statusCode,
                                responseLength,
                                headers: res.headers
                            });
                            // return the last request(ClientRequest) in case of redirects
                            const lastRequest = res.req || req;
                            /** @type {*} */ const response = {
                                status: res.statusCode,
                                statusText: res.statusMessage,
                                headers: new AxiosHeaders$2(res.headers),
                                config,
                                request: lastRequest
                            };
                            // 直接返回 responseStream
                            if (responseType === "stream") {
                                response.data = stream;
                                settle(resolve, reject, response);
                            } else {
                                // 处理 responseStream
                                /** @type {*} */ const responseBuffer = [];
                                let totalResponseBytes = 0;
                                // 处理数据
                                stream.on("data", /** @param {*} chunk */ (chunk)=>{
                                    responseBuffer.push(chunk);
                                    totalResponseBytes += chunk.length;
                                    // make sure the content length is not over the maxContentLength if specified
                                    if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
                                        // stream.destroy() emit aborted event before calling reject() on Node.js v16
                                        _.rejected = true;
                                        stream.destroy();
                                        reject(new AxiosError$1(`maxContentLength size of ${config.maxContentLength} exceeded`, AxiosError$1.ERR_BAD_RESPONSE, config, lastRequest));
                                    }
                                });
                                stream.on("aborted", function handlerStreamAborted() {
                                    if (_.rejected) return;
                                    const err = new AxiosError$1(`maxContentLength size of ${config.maxContentLength} exceeded`, AxiosError$1.ERR_BAD_RESPONSE, config, lastRequest);
                                    stream.destroy(err);
                                    reject(err);
                                });
                                stream.on("error", function handleStreamError(err) {
                                    if (req.destroyed) return;
                                    reject(AxiosError$1.from(err, null, config, lastRequest));
                                });
                                // 数据传输结束
                                stream.on("end", function handleStreamEnd() {
                                    try {
                                        let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
                                        if (responseType !== "arraybuffer") {
                                            responseData = responseData.toString(responseEncoding);
                                            if (!responseEncoding || responseEncoding === "utf8") {
                                                responseData = utils$1.stripBOM(responseData);
                                            }
                                        }
                                        response.data = responseData;
                                        settle(resolve, reject, response);
                                    } catch (err) {
                                        reject(AxiosError$1.from(err, null, config, response.request, response));
                                    }
                                });
                            }
                            emitter.once("abort", (err)=>{
                                if (!stream.destroyed) {
                                    stream.emit("error", err);
                                    stream.destroy();
                                }
                            });
                        });
                        // 发送数据
                        if (utils$1.isStream(data)) {
                            // Send the request
                            let ended = false;
                            let errored = false;
                            data.on("end", ()=>{
                                ended = true;
                            });
                            data.once("error", /** @param {*} err */ (err)=>{
                                errored = true;
                                req.destroy(err);
                            });
                            data.on("close", ()=>{
                                if (!ended && !errored) {
                                    abort(new CanceledError$1("Request stream has been aborted", config, req));
                                }
                            });
                            data.pipe(req); // stream 写入数据
                        } else req.end(data);
                    }
                });
            }
            _.done(R);
        } catch (e) {
            log.error(e, "request");
            _.done(e, true);
            throw e;
        }
        return R;
    }
};
/**
 *
 * @param {*} stream
 * @param {*} param1
 * @returns
 */ const flushOnFinish = (stream, [throttled, flush])=>{
    stream.on("end", flush).on("error", flush);
    return throttled;
};
/** @typedef {import('../core/Axios').default} Axios */ /**
 * If the proxy or config beforeRedirects functions are defined, call them with the options
 * object.
 *
 * @param {Object<string, any>} options - The options object that was passed to the request.
 * @param {*} responseDetails - The options object that was passed to the request.
 *
 */ function dispatchBeforeRedirect(options, responseDetails) {
    log.debug("dispatchBeforeRedirect", {
        opts: options.beforeRedirects
    });
    if (options.beforeRedirects.proxy) options.beforeRedirects.proxy(options);
    if (options.beforeRedirects.config) options.beforeRedirects.config(options, responseDetails);
}
/**
 *
 * @param {{address: string, family: *}} param0
 * @returns
 */ function resolveFamily({ address, family }) {
    if (!utils$1.isString(address)) {
        throw TypeError("address must be a string");
    }
    return {
        address,
        family: family || (address.indexOf(".") < 0 ? 6 : 4)
    };
}
/**
 *
 * @param {*} address
 * @param {*} family
 */ function buildAddressEntry(address, family) {
    resolveFamily(utils$1.isObject(address) ? address : {
        address,
        family
    });
}
/**
 * null or funciton
 */ const HttpAdapter$1 = isHttpAdapterSupported && HttpAdapter;

const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';
let XhrAdapter = class XhrAdapter {
    constructor(config){
        this.init(config);
    }
    init(config) {}
    request() {}
    stream() {}
};
const XhrAdapter$1 = isXHRAdapterSupported && XhrAdapter;

const knownAdapters = {
    http: HttpAdapter$1,
    xhr: XhrAdapter$1
};
/**
 * define adapter's name and adapterName to http or xhr
 * browser: httpAdapter is null!
 */ utils$1.forEach(knownAdapters, (val, key)=>{
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
const adapters = {
    /**
   * get http or xhr adapter
   * @param {*} adapters user pass or ['xhr', 'http']
   * @returns
   */ getAdapter: (adapters)=>{
        adapters = utils$1.isArray(adapters) ? adapters : [
            adapters
        ];
        const { length } = adapters;
        let nameOrAdapter;
        let adapter;
        // find not null adapter
        for(let i = 0; i < length; i++){
            nameOrAdapter = adapters[i];
            if (adapter = utils$1.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter) {
                break;
            }
        }
        if (!adapter) {
            if (adapter === false) {
                throw new AxiosError$1(`Adapter ${nameOrAdapter} is not supported by the environment`, 'ERR_NOT_SUPPORT');
            }
            throw new Error(utils$1.hasOwnProp(knownAdapters, nameOrAdapter) ? `Adapter '${nameOrAdapter}' is not available in the build` : `Unknown adapter '${nameOrAdapter}'`);
        }
        if (!utils$1.isFunction(adapter)) {
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
        throw new CanceledError$1(null, config);
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
    config.headers = AxiosHeaders$2.from(config.headers);
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
            response.headers = AxiosHeaders$2.from(response.headers);
            return response;
        }, (reason)=>{
            if (!isCancel$1(reason)) {
                throwIfCancellationRequested(config);
                // Transform response data
                if (reason && reason.response) {
                    reason.response.data = transformData.call(config, config.transformResponse, reason.response);
                    // body === data
                    if (reason.response.data && !reason.response.body) reason.response.body = reason.response.data;
                    reason.response.headers = AxiosHeaders$2.from(reason.response.headers);
                }
            }
            return Promise.reject(reason);
        });
    }
    return R;
}

const headersToObject = (thing)=>thing instanceof AxiosHeaders$2 ? {
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
 */ function mergeConfig$1(config1, config2) {
    // eslint-disable-next-line no-param-reassign
    config2 = config2 || {};
    const config = {};
    function getMergedValue(target, source, caseless) {
        if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
            return utils$1.merge.call({
                caseless
            }, target, source);
        } else if (utils$1.isPlainObject(source)) {
            return utils$1.merge({}, source);
        } else if (utils$1.isArray(source)) {
            return source.slice();
        }
        return source;
    }
    // eslint-disable-next-line consistent-return
    function mergeDeepProperties(a, b, caseless) {
        if (!utils$1.isUndefined(b)) {
            return getMergedValue(a, b, caseless);
        } else if (!utils$1.isUndefined(a)) {
            return getMergedValue(undefined, a, caseless);
        }
    }
    // eslint-disable-next-line consistent-return
    function valueFromConfig2(a, b) {
        if (!utils$1.isUndefined(b)) {
            return getMergedValue(undefined, b);
        }
    }
    // eslint-disable-next-line consistent-return
    function defaultToConfig2(a, b) {
        if (!utils$1.isUndefined(b)) {
            return getMergedValue(undefined, b);
        } else if (!utils$1.isUndefined(a)) {
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
    utils$1.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
        const merge = mergeMap[prop] || mergeDeepProperties;
        const configValue = merge(config1[prop], config2[prop], prop);
        utils$1.isUndefined(configValue) && merge !== mergeDirectKeys || (config[prop] = configValue);
    });
    return config;
}

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
        return '[Axios v' + VERSION$1 + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
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
const validator = {
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
 */ let Axios$1 = class Axios {
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
        config = mergeConfig$1(this.defaults, config);
        const { transitional, paramsSerializer, headers } = config;
        if (transitional !== undefined) {
            validator.assertOptions(transitional, {
                silentJSONParsing: validators.transitional(validators.boolean),
                forcedJSONParsing: validators.transitional(validators.boolean),
                clarifyTimeoutError: validators.transitional(validators.boolean)
            }, false);
        }
        if (paramsSerializer) {
            if (utils$1.isFunction(paramsSerializer)) {
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
        const contextHeaders = headers && utils$1.merge(headers.common, headers[config.method]);
        headers && utils$1.forEach([
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
        config.headers = AxiosHeaders$2.concat(contextHeaders, headers);
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
        config = mergeConfig$1(this.defaults, config);
        const fullPath = buildFullPath(config.baseURL, config.url);
        return buildURL(fullPath, config.params, config.paramsSerializer);
    }
};
// Provide aliases for supported request methods
utils$1.forEach([
    'head',
    'options'
], function forEachMethodNoData(method) {
    /* eslint func-names:0 */ Axios$1.prototype[method] = function(url, config) {
        return this.request(mergeConfig$1(config || {}, {
            method,
            url,
            data: (config || {}).data
        }));
    };
});
// delete、get, 与 axios不同，第二个参数为 params，而不是 data
utils$1.forEach([
    'delete',
    'get'
], function forEachMethodNoData(method) {
    Axios$1.prototype[method] = function(url, params, config) {
        return this.request(mergeConfig$1(config || {}, {
            method,
            url,
            params
        }));
    };
});
utils$1.forEach([
    'post',
    'put',
    'patch'
], function forEachMethodWithData(method) {
    function generateHTTPMethod(isForm) {
        return function httpMethod(url, data, config) {
            return this.request(mergeConfig$1(config || {}, {
                method,
                headers: isForm ? {
                    'Content-Type': 'multipart/form-data'
                } : {},
                url,
                data
            }));
        };
    }
    Axios$1.prototype[method] = generateHTTPMethod();
    Axios$1.prototype[`${method}Form`] = generateHTTPMethod(true);
});
// stream get, 与 axios不同，第二个参数为 params，而不是 data
utils$1.forEach([
    'gets'
], function forEachMethodNoData(method) {
    Axios$1.prototype[method] = function(url, params, config) {
        return this.stream(mergeConfig$1(config || {}, {
            method,
            url,
            params,
            data: (config || {}).data
        }));
    };
});
// stream post put patch
utils$1.forEach([
    'posts',
    'puts',
    'patchs'
], function forEachMethodWithData(method) {
    function generateStreamMethod(isForm) {
        return function httpMethod(url, data, config) {
            return this.stream(mergeConfig$1(config || {}, {
                method,
                headers: isForm ? {
                    'Content-Type': 'multipart/form-data'
                } : {},
                url,
                data
            }));
        };
    }
    Axios$1.prototype[method] = generateStreamMethod();
    Axios$1.prototype[`${method}Forms`] = generateStreamMethod(true);
});
const Axios$2 = Axios$1;

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @param {Function} executor The executor function.
 *
 * @returns {CancelToken}
 */ let CancelToken$1 = class CancelToken {
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
            token.reason = new CanceledError$1(message, config, request);
            resolvePromise(token.reason);
        });
    }
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
};
const CancelToken$2 = CancelToken$1;

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
 */ function spread$1(callback) {
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
 */ function isAxiosError$1(payload) {
    return utils$1.isObject(payload) && payload.isAxiosError === true;
}

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */ function createInstance(defaultConfig) {
    const context = new Axios$2(defaultConfig);
    const instance = bind(Axios$2.prototype.request, context);
    // Copy axios.prototype to instance
    utils$1.extend(instance, Axios$2.prototype, context, {
        allOwnKeys: true
    });
    // Copy context to instance
    utils$1.extend(instance, context, null, {
        allOwnKeys: true
    });
    // Factory for creating new instances
    instance.create = function create(instanceConfig) {
        return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
    };
    return instance;
}
// Create the default instance to be exported
const req = createInstance(defaults$1);
// Expose Axios class to allow class inheritance
req.Axios = Axios$2;
// Expose Cancel & CancelToken
req.CanceledError = CanceledError$1;
req.CancelToken = CancelToken$2;
req.isCancel = isCancel$1;
req.VERSION = VERSION$1;
req.toFormData = toFormData$1;
// Expose AxiosError class
req.AxiosError = AxiosError$1;
// alias for CanceledError for backward compatibility
req.Cancel = req.CanceledError;
// Expose all/spread
req.all = (promises)=>Promise.all(promises);
req.spread = spread$1;
// Expose isAxiosError
req.isAxiosError = isAxiosError$1;
// Expose mergeConfig
req.mergeConfig = mergeConfig$1;
req.AxiosHeaders = AxiosHeaders$2;
req.formToJSON = (thing)=>formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
req.getAdapter = adapters.getAdapter;
req.default = req;
// this module should only have a default export
const req$1 = req;

// This module is intended to unwrap Axios default export as named.
// Keep top-level export same with static properties
// so that it can keep same with es module or cjs
const {
	Axios,
	AxiosError,
	CanceledError,
	isCancel,
	CancelToken,
	VERSION,
	all,
	Cancel,
	isAxiosError,
	spread,
	toFormData,
	AxiosHeaders,
	HttpStatusCode,
	formToJSON,
	getAdapter,
	mergeConfig,
} = req$1;

export { Axios, AxiosError, AxiosHeaders, Cancel, CancelToken, CanceledError, HttpStatusCode, VERSION, all, req$1 as default, formToJSON, getAdapter, isAxiosError, isCancel, mergeConfig, spread, toFormData };
