import utils from '../utils.js';
import buildURL from '../helpers/buildURL.js';
import InterceptorManager from './InterceptorManager.js';
import dispatchRequest from './dispatchRequest.js';
import mergeConfig from './mergeConfig.js';
import buildFullPath from './buildFullPath.js';
import validator from '../helpers/validator.js';
import AxiosHeaders from './AxiosHeaders.js';

const {validators} = validator;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig;
    this.config = this.defaults;
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager(),
    };

    this.init();
  }

  /**
   * config 属性直接挂在到实例上，方便读取、设置、修改
   */
  init() {
    const m = this;
    [
      'url',
      'method',
      'baseURL',
      'transformRequest', // [function],
      'transformResponse',
      'headers', // {'X-Requested-With': 'XMLHttpRequest'},
      'params', // {ID: 12345},
      'paramsSerializer',
      'body',
      'data', // {firstName: 'Fred'}, 'Country=Brasil&City=Belo',
      'timeout', // default is `0` (no timeout)
      'withCredentials', // default false
      'adapter', // func
      'auth', // {username: 'janedoe', password: 's00pers3cret'}
      'responseType', // default 'json'
      'responseEncoding', // default 'utf8'
      'xsrfCookieName', // default 'XSRF-TOKEN'
      'xsrfHeaderName', // default 'X-XSRF-TOKEN'
      'onUploadProgress', // func
      'onDownloadProgress', // func
      'maxContentLength',
      'maxBodyLength',
      'validateStatus', // status => status >= 200 && status < 300;
      'maxRedirects', // default 21
      'beforeRedirect', // (options, { headers }) => {}
      'socketPath', // default null
      'httpAgent', // new http.Agent({ keepAlive: true }),
      'httpsAgent', // new https.Agent({ keepAlive: true }),
      'agent', // {},
      'cancelToken', // new CancelToken(function (cancel) {}),
      'signal', // new AbortController().signal,
      'decompress', // default true
      'insecureHTTPParser', // default undefined
      'transitional',
      'env', // {FormData: window?.FormData || global?.FormData},
      'formSerializer',
      'maxRate', // [100 * 1024, 100 * 1024] // upload, download limit
    ].forEach(p =>
      Object.defineProperty(m, p, {
        enumerable: true,
        get() {
          return m.config[p];
        },

        set(value) {
          m.config[p] = value;
        },
      })
    );
  }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   * @returns {Promise} The Promise to be fulfilled
   */
  request(configOrUrl, config) {
    let R = null;
    const m = this;

    /* eslint no-param-reassign:0 */
    // Allow for axios('example/url'[, config]) a la fetch API
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    // body ==> data
    if (!config.data && config.body) {
      config.data = config.body;
      delete config.body;
    }

    config = mergeConfig(this.defaults, config);

    const {transitional, paramsSerializer, headers} = config;

    if (transitional !== undefined) {
      validator.assertOptions(
        transitional,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
        },
        false
      );
    }

    if (paramsSerializer !== undefined) {
      validator.assertOptions(
        paramsSerializer,
        {
          encode: validators.function,
          serialize: validators.function,
        },
        true
      );
    }

    // Set config.method
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

    // Flatten headers
    const contextHeaders = headers && utils.merge(headers.common, headers[config.method]);

    contextHeaders &&
      utils.forEach(['delete', 'get', 'head', 'post', 'put', 'patch', 'common'], method => {
        delete headers[method];
      });

    // 源值存在，则不覆盖，contextHeaders 优先于 headers
    config.headers = AxiosHeaders.concat(contextHeaders, headers);

    // filter out skipped interceptors
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return;
      }

      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise;
    let i = 0;
    let len;

    // 异步拦截器
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);

      // 按顺序执行
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      R = promise;
    } else {
      // 同步拦截器
      len = requestInterceptorChain.length;
      let newConfig = config;
      i = 0;

      // 按加入顺序运行 request 拦截器
      while (i < len) {
        const onFulfilled = requestInterceptorChain[i++];
        const onRejected = requestInterceptorChain[i++];
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error) {
          m::onRejected.call(error);
          break;
        }
      }

      // 运行请求
      if (newConfig.isStream) {
        const stream = m::dispatchRequest(newConfig);

        R = stream;
      } else {
        try {
          promise = m::dispatchRequest(newConfig);
          i = 0;
          len = responseInterceptorChain.length;

          while (i < len) {
            promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
          }

          R = promise;
        } catch (error) {
          R = Promise.reject(error);
        }
      }
    }

    return R;
  }

  /**
   * add isStream: true config
   * @param {*} configOrUrl
   * @param {*} config
   * @returns
   */
  stream(configOrUrl, config) {
    if (typeof configOrUrl === 'string') config = {...config, url: configOrUrl, isStream: true};
    else config = {...configOrUrl, isStream: true};

    return this.request(config);
  }

  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}

// Provide aliases for supported request methods
utils.forEach(['head', 'options'], function forEachMethodNoData(method) {
  /* eslint func-names:0 */
  Axios.prototype[method] = function (url, config) {
    return this.request(
      mergeConfig(config || {}, {
        method,
        url,
        data: (config || {}).data,
      })
    );
  };
});

// delete、get, 与 axios不同，第二个参数为 params，而不是 data
utils.forEach(['delete', 'get'], function forEachMethodNoData(method) {
  Axios.prototype[method] = function (url, params, config) {
    return this.request(
      mergeConfig(config || {}, {
        method,
        url,
        params,
        data: (config || {}).data,
      })
    );
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(
        mergeConfig(config || {}, {
          method,
          headers: isForm
            ? {
                'Content-Type': 'multipart/form-data',
              }
            : {},
          url,
          data,
        })
      );
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[`${method}Form`] = generateHTTPMethod(true);
});

// stream get, 与 axios不同，第二个参数为 params，而不是 data
utils.forEach(['gets'], function forEachMethodNoData(method) {
  Axios.prototype[method] = function (url, params, config) {
    return this.stream(
      mergeConfig(config || {}, {
        method,
        url,
        params,
        data: (config || {}).data,
      })
    );
  };
});

// stream post put patch
utils.forEach(['posts', 'puts', 'patchs'], function forEachMethodWithData(method) {
  function generateStreamMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.stream(
        mergeConfig(config || {}, {
          method,
          headers: isForm
            ? {
                'Content-Type': 'multipart/form-data',
              }
            : {},
          url,
          data,
        })
      );
    };
  }

  Axios.prototype[method] = generateStreamMethod();

  Axios.prototype[`${method}Forms`] = generateStreamMethod(true);
});

export default Axios;
