import utils from '../utils.js'
import buildURL from '../helpers/buildURL.js'
import InterceptorManager from './InterceptorManager.js'
import dispatchRequest from './dispatchRequest.js'
import mergeConfig from './mergeConfig.js'
import buildFullPath from './buildFullPath.js'
import validator from '../helpers/validator.js'
import AxiosHeaders from './AxiosHeaders.js'

const {validators} = validator

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig
    this.config = this.defaults // !+++
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager(),
    }

    this.init() // !+++
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
   */
  init() {
    const m = this
    ;[
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
          return m.config[p]
        },

        set(value) {
          m.config[p] = value
        },
      })
    )
  }

  /**
   * Dispatch a request
   * 启动执行请求，返回 Promise 实例
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config)
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {}

        Error.captureStackTrace ? Error.captureStackTrace(dummy) : (dummy = new Error())

        // slice off the Error: ... line
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, '') : ''
        try {
          if (!err.stack) {
            err.stack = stack
            // match without the 2 top stack lines
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ''))) {
            err.stack += '\n' + stack
          }
        } catch (e) {
          // ignore the case where "stack" is an un-writable property
        }
      }

      throw err // 抛出异常
    }
  }

  /**
   * 执行请求
   * @param {*} configOrUrl
   * @param {*} config
   * @param {boolean} [stream = false] - 是否返回 stream
   * @returns
   */
  _request(configOrUrl, config, stream = false) {
    let R = null
    const m = this

    /* eslint no-param-reassign:0 */
    // Allow for axios('example/url'[, config]) a la fetch API
    if (typeof configOrUrl === 'string') {
      config = config || {}
      config.url = configOrUrl
    } else {
      config = configOrUrl || {}
    }

    // ! body as data alias, body ==> data，内部保持data不变
    if (!config.data && config.body) {
      config.data = config.body
      // config.body = undefined;
    }

    config = mergeConfig(this.defaults, config)

    const {transitional, paramsSerializer, headers} = config

    if (transitional !== undefined) {
      validator.assertOptions(
        transitional,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
        },
        false
      )
    }

    if (paramsSerializer) {
      if (utils.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer,
        }
      } else {
        validator.assertOptions(
          paramsSerializer,
          {
            encode: validators.function,
            serialize: validators.function,
          },
          true
        )
      }
    }

    validator.assertOptions(
      config,
      {
        baseUrl: validators.spelling('baseURL'),
        withXsrfToken: validators.spelling('withXSRFToken'),
      },
      true
    )

    // Set config.method
    config.method = (config.method || this.defaults.method || 'get').toLowerCase()

    // Flatten headers，方法头覆盖通用头
    const contextHeaders = headers && utils.merge(headers.common, headers[config.method])

    headers &&
      utils.forEach(['delete', 'get', 'head', 'post', 'put', 'patch', 'common'], method => {
        delete headers[method]
      })

    // 源值存在，则不覆盖，contextHeaders 优先于 headers
    config.headers = AxiosHeaders.concat(contextHeaders, headers)

    // filter out skipped interceptors
    const requestInterceptorChain = [] // 请求拦截器，hook
    let synchronousRequestInterceptors = true
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return
      }

      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous

      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected)
    })

    const responseInterceptorChain = [] // 响应拦截器，hook
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected)
    })

    let promise
    let i = 0
    let len
    debugger
    // 执行dispatchRequest
    // !+++ stream
    if (stream) {
      config.stream = true
      R = dispatchRequest.call(this, config) // not promise
    } else if (!synchronousRequestInterceptors) {
      // 异步拦截器
      const chain = [dispatchRequest.bind(this), undefined] // dispatchRequest 放入运行链
      chain.unshift(...requestInterceptorChain) // !*** 插入头
      chain.push(...responseInterceptorChain) // !*** 加入尾
      len = chain.length

      promise = Promise.resolve(config) // promise 对象

      // 传入config配置，按顺序执行
      while (i < len) promise = promise.then(chain[i++], chain[i++])

      R = promise
    } else {
      // 同步拦截器
      len = requestInterceptorChain.length
      let newConfig = config
      i = 0

      // 按加入顺序运行 request 拦截器
      while (i < len) {
        const onFulfilled = requestInterceptorChain[i++]
        const onRejected = requestInterceptorChain[i++]
        try {
          newConfig = onFulfilled(newConfig) // 执行
        } catch (error) {
          onRejected.call(this, error)
          break
        }
      }

      try {
        promise = dispatchRequest.call(this, newConfig)
        i = 0
        len = responseInterceptorChain.length

        // 按顺序执行响应 hook
        while (i < len) promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++])

        R = promise
      } catch (error) {
        R = Promise.reject(error)
      }
    }

    return R
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
   */
  stream(configOrUrl, config) {
    return this._request(configOrUrl, config, true)
  }

  /**
   *
   * @param {*} config
   * @returns
   */
  getUri(config) {
    config = mergeConfig(this.defaults, config)
    const fullPath = buildFullPath(config.baseURL, config.url)
    return buildURL(fullPath, config.params, config.paramsSerializer)
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
    )
  }
})

// delete、get, 与 axios不同，第二个参数为 params，而不是 data
utils.forEach(['delete', 'get'], function forEachMethodNoData(method) {
  Axios.prototype[method] = function (url, params, config) {
    return this.request(
      mergeConfig(config || {}, {
        method,
        url,
        params,
      })
    )
  }
})

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
      )
    }
  }

  Axios.prototype[method] = generateHTTPMethod()

  Axios.prototype[`${method}Form`] = generateHTTPMethod(true)
})

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
    )
  }
})

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
      )
    }
  }

  Axios.prototype[method] = generateStreamMethod()

  Axios.prototype[`${method}Forms`] = generateStreamMethod(true)
})

export default Axios
