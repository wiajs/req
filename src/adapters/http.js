import {Agent} from '@wiajs/agent'
import {log as Log, name} from '@wiajs/log'
import request from '@wiajs/request'
// import followRedirects from 'follow-redirects';
// import Redirect from '../request/index.js'
import {EventEmitter} from 'events'
import stream from 'stream'
// import {getProxyForUrl} from 'proxy-from-env';
import util from 'util'
import zlib from 'zlib'
import CanceledError from '../cancel/CanceledError.js'
import AxiosError from '../core/AxiosError.js'
import AxiosHeaders from '../core/AxiosHeaders.js'
import buildFullPath from '../core/buildFullPath.js'
import settle from '../core/settle.js'
import transitionalDefaults from '../defaults/transitional.js'
import {VERSION} from '../env/data.js'
import AxiosTransformStream from '../helpers/AxiosTransformStream.js'
import buildURL from '../helpers/buildURL.js'
import callbackify from '../helpers/callbackify.js'
import formDataToStream from '../helpers/formDataToStream.js'
import fromDataURI from '../helpers/fromDataURI.js'
import {asyncDecorator, progressEventDecorator, progressEventReducer} from '../helpers/progressEventReducer.js'
import readBlob from '../helpers/readBlob.js'
import platform from '../platform/index.js'
import utils from '../utils.js'

const log = Log({env: `wia:req:${name(import.meta.url)}`})

const isBrotliSupported = utils.isFunction(zlib.createBrotliDecompress)
const isHttps = /https:?/
const supportedProtocols = platform.protocols.map(protocol => `${protocol}:`)
const isHttpAdapterSupported = typeof process !== 'undefined' && utils.kindOf(process) === 'process'

/**
 * !+++
 * 将request 函数改为类，request 拆分为 init 初始化和 请求执行，
 * 如需重新发起请求时，无需重新初始化
 */
class HttpAdapter {
  isDone = false
  rejected = false
  /** @type {*} */
  req = null
  /** @type {*} */
  config = null
  /** @type {number} */
  maxUploadRate
  /** @type {number} */
  maxDownloadRate
  /** @type {*} */
  data = null
  /** @type {*} */
  transport = null

  /**
   *
   * @param {*} config
   */
  constructor(config) {
    this.config = config
    // temporary internal emitter until the AxiosRequest class will be implemented
    this.emitter = new EventEmitter()
  }

  /**
   *
   * @param {number} code
   * @returns
   */
  noBody(code) {
    return (
      this.method === 'HEAD' ||
      // Informational
      (code >= 100 && code < 200) ||
      // No Content
      code === 204 ||
      // Not Modified
      code === 304
    )
  }

  /**
   * 发起终止事件
   * @param {*} reason
   */
  abort(reason) {
    this.emitter.emit('abort', !reason || reason.type ? new CanceledError(null, this.config, this.req) : reason)
  }

  onFinished() {
    const {config, emitter, abort} = this
    config?.cancelToken?.unsubscribe(abort)

    config?.signal?.removeEventListener('abort', abort)

    emitter?.removeAllListeners()
  }

  /**
   *
   * @param {*} value
   * @param {*} isRejected
   */
  onDone(value, isRejected) {
    this.isDone = true
    if (isRejected) {
      this.rejected = true
      this.onFinished()
    }
  }

  /**
   *
   * @param {*} value
   * @param {*} isRejected
   * @returns
   */
  done(value, isRejected) {
    if (this.isDone) return
    this.isDone = true
    this?.onDone(value, isRejected)
  }

  /**
   * 初始化，生成 options 供请求调用
   * @returns {*} options
   */
  async init() {
    // biome-ignore lint/complexity/noUselessThisAlias: <explanation>
    const _ = this
    const {config} = _

    let {data, lookup, family} = config
    const method = config.method.toUpperCase()
    _.method = method

    if (lookup) {
      const _lookup = callbackify(lookup, /** @param {*} value */ value => (utils.isArray(value) ? value : [value]))
      // hotfix to support opt.all option which is required for node 20.x
      /**
       * @param {string} hostname
       * @param {*} opt
       * @param {*} cb
       */
      lookup = (hostname, opt, cb) => {
        _lookup(hostname, opt, (err, arg0, arg1) => {
          if (err) return cb(err)

          const addresses = utils.isArray(arg0)
            ? arg0.map(addr => buildAddressEntry(addr))
            : [buildAddressEntry(arg0, arg1)]

          opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family)
        })
      }
    }

    if (config.cancelToken || config.signal) {
      config.cancelToken?.subscribe(_.abort)
      if (config.signal) {
        if (config.signal.aborted) _.abort()
        else config.signal.addEventListener('abort', _.abort)
      }
    }

    // Parse url
    const fullPath = buildFullPath(config.baseURL, config.url)
    // 'https://user:pass@sub.host.com:8080/p/a/t/h?query=string#hash'
    const parsed = new URL(fullPath, platform.hasBrowserEnv ? platform.origin : undefined)
    // http: or https:
    const protocol = parsed.protocol || supportedProtocols[0]
    _.protocol = protocol

    if (protocol === 'data:' && method !== 'GET') {
      const response = {status: 405, statusText: 'method not allowed', headers: {}, config}
      throw new AxiosError(
        `Request failed with status code ${response.status}`,
        [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
        response.config,
        response.request,
        response
      )
    }

    if (supportedProtocols.indexOf(protocol) === -1) {
      throw new AxiosError(`Unsupported protocol ${protocol}`, AxiosError.ERR_BAD_REQUEST, config)
    }

    const headers = AxiosHeaders.from(config.headers).normalize()

    // Set User-Agent (required by some servers)
    // See https://github.com/axios/axios/issues/69
    // User-Agent is specified; handle case where no UA header is desired
    // Only set header if it hasn't been set in config
    // ! headers.set('User-Agent', 'axios/' + VERSION, false);
    headers.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
      false
    )

    const {onDownloadProgress, onUploadProgress, maxRate} = config

    // support for spec compliant FormData objects
    if (utils.isSpecCompliantForm(data)) {
      const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i)

      data = formDataToStream(data, /** @param {*} formHeaders */ formHeaders => headers.set(formHeaders), {
        tag: `axios-${VERSION}-boundary`,
        boundary: userBoundary?.[1] || undefined,
      })
      // support for https://www.npmjs.com/package/form-data api
    } else if (utils.isFormData(data) && utils.isFunction(data.getHeaders)) {
      headers.set(data.getHeaders())
      if (!headers.hasContentLength()) {
        try {
          const knownLength = await util.promisify(data.getLength).call(data)
          Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength)
          /*eslint no-empty:0*/
        } catch (e) {}
      }
    } else if (utils.isBlob(data)) {
      data.size && headers.setContentType(data.type || 'application/octet-stream')
      headers.setContentLength(data.size || 0)
      data = stream.Readable.from(readBlob(data))
    } else if (data && !utils.isStream(data)) {
      if (Buffer.isBuffer(data)) {
        // Nothing to do...
      } else if (utils.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data))
      } else if (utils.isString(data)) {
        data = Buffer.from(data, 'utf-8')
      } else {
        throw new AxiosError(
          'Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream',
          AxiosError.ERR_BAD_REQUEST,
          config
        )
      }

      // Add Content-Length header if data exists
      headers.setContentLength(data.length, false)

      if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
        throw new AxiosError('Request body larger than maxBodyLength limit', AxiosError.ERR_BAD_REQUEST, config)
      }
    }

    const contentLength = utils.toFiniteNumber(headers.getContentLength())
    let maxUploadRate
    let maxDownloadRate
    if (utils.isArray(maxRate)) [maxUploadRate, maxDownloadRate] = maxRate
    else {
      maxUploadRate = maxRate
      maxDownloadRate = maxRate
    }

    _.maxUploadRate = maxUploadRate
    _.maxDownloadRate = maxDownloadRate

    if (data && (onUploadProgress || maxUploadRate)) {
      if (!utils.isStream(data)) {
        data = stream.Readable.from(data, {objectMode: false})
      }

      data = stream.pipeline(
        [
          data,
          new AxiosTransformStream({
            maxRate: utils.toFiniteNumber(maxUploadRate),
          }),
        ],
        utils.noop
      )

      onUploadProgress &&
        data.on(
          'progress',
          flushOnFinish(
            data,
            progressEventDecorator(contentLength, progressEventReducer(asyncDecorator(onUploadProgress), false, 3))
          )
        )
    }

    // HTTP basic authentication
    let auth
    if (config.auth) {
      const username = config.auth.username || ''
      const password = config.auth.password || ''
      auth = `${username}:${password}`
    }

    if (!auth && parsed.username) {
      const urlUsername = parsed.username
      const urlPassword = parsed.password
      auth = `${urlUsername}:${urlPassword}`
    }

    auth && headers.delete('authorization')

    let path

    try {
      path = buildURL(parsed.pathname + parsed.search, config.params, config.paramsSerializer).replace(/^\?/, '')
    } catch (err) {
      /** @type {*} */
      const customErr = new Error(err.message)
      customErr.config = config
      customErr.url = config.url
      customErr.exists = true
      throw customErr
    }

    headers.set('Accept-Encoding', `gzip, compress, deflate${isBrotliSupported ? ', br' : ''}`, false)

    /** @type {*} */
    const options = {
      path,
      method,
      headers: headers.toJSON(),
      auth,
      protocol,
      family,
      beforeRedirect: dispatchBeforeRedirect,
      beforeRedirects: {},
    }

    if (config.httpAgent) options.agents = {http: config.httpAgent}
    if (config.httpsAgent) options.agents.https = config.httpsAgent

    // ✅ axios 侧一般传 agents（用于重定向按协议选 agent）
    if (config.agents) options.agents = config.agents
    else if (config.agent) options.agents = new Agent(config.agent)

    const isHttpsRequest = isHttps.test(options.protocol)
    // agents 优先于 agent（Node request 内部会按协议从 agents 取）:contentReference[oaicite:4]{index=4}
    options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent

    // cacheable-lookup integration hotfix
    if (!utils.isUndefined(lookup)) options.lookup = lookup

    if (config.socketPath) options.socketPath = config.socketPath
    else {
      options.hostname = parsed.hostname.startsWith('[') ? parsed.hostname.slice(1, -1) : parsed.hostname
      options.port = parsed.port
    }

    // 执行请求的具体对象
    _.transport = config.transport
    if (config.maxBodyLength > -1) options.maxBodyLength = config.maxBodyLength
    // follow-redirects does not skip comparison, so it should always succeed for axios -1 unlimited
    else options.maxBodyLength = Number.POSITIVE_INFINITY

    // maxRedirects 缺省 21，不跳转，直接使用系统http or https，不支持 stream
    // if (config.maxRedirects === 0 && !config.stream) transport = isHttpsRequest ? https : http;
    // 自动跳转
    // else {
    // 支持跳转或stream，需使用 http、https 封装类

    options.maxRedirects = config.maxRedirects ?? 21
    options.followRedirects = config.followRedirects ?? true // 默认自动跳转
    if (config.maxRedirects === 0) options.followRedirects = false
    if (config.beforeRedirect) options.beforeRedirects.config = config.beforeRedirect

    if (config.insecureHTTPParser) options.insecureHTTPParser = config.insecureHTTPParser

    // _.data = data
    options.data = data // 传给 request 处理
    _.options = options

    // log({config}, 'init')
    return options
  }

  /**
   * 执行请求
   * 需抛出内部异常
   * @param {Axios} axios 实例
   * @returns {Promise<*>}
   */
  async request(axios) {
    /** @type {*} */
    // biome-ignore lint/style/useConst: <explanation>
    let R
    // biome-ignore lint/complexity/noUselessThisAlias: <explanation>
    const _ = this

    try {
      await _.init()

      const {transport, protocol, config, options, abort, emitter, maxDownloadRate} = _
      const {responseType, responseEncoding, onDownloadProgress} = config

      if (protocol === 'data:') {
        /** @type {*} */
        let convertedData
        try {
          convertedData = fromDataURI(config.url, responseType === 'blob', {Blob: config.env?.Blob})
        } catch (err) {
          throw AxiosError.from(err, AxiosError.ERR_BAD_REQUEST, config)
        }

        if (responseType === 'text') {
          convertedData = convertedData.toString(responseEncoding)
          if (!responseEncoding || responseEncoding === 'utf8') convertedData = utils.stripBOM(convertedData)
        } else if (responseType === 'stream') {
          convertedData = stream.Readable.from(convertedData)
        }

        // 返回响应
        R = {
          data: convertedData,
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
        }
      } else {
        let transformStream
        if (onDownloadProgress || maxDownloadRate) {
          transformStream = new AxiosTransformStream({
            maxRate: utils.toFiniteNumber(maxDownloadRate),
          })

          onDownloadProgress &&
            transformStream.on(
              'progress',
              flushOnFinish(
                transformStream,
                progressEventDecorator(
                  transformStream.responseLength,
                  progressEventReducer(asyncDecorator(onDownloadProgress), true, 3)
                )
              )
            )
        }
        options.transformStream = transformStream

        // 发起异步请求
        R = await new Promise((resolve, reject) => {
          _.emitter.once('abort', reject)

          options.stream = config.stream ?? false
          options.decompress = config.decompress ?? true

          const req = transport ? transport.request(options) : request(options)

          if (!req) return reject(new AxiosError('Request failed.', AxiosError.ERR_BAD_REQUEST, config))

          _.req = req

          emitter.once('abort', err => {
            // log('onabort')
            reject(err)
            req.destroy(err)
          })

          // Handle errors
          req.on(
            'error',
            /** @param {*} err */ err => {
              // log('onerror')
              // @todo remove
              // if (req.aborted && err.code !== AxiosError.ERR_FR_TOO_MANY_REDIRECTS) return;
              reject(AxiosError.from(err, null, config, req))
            }
          )

          // socket 连接成功事件，移到 request
          // set tcp keep alive to prevent drop connection by peer
          // req.on(
          //   'socket',
          //   /** @param {*} socket */ socket => {
          //     // default interval of sending ack packet is 1 minute
          //     socket.setKeepAlive(true, 1000 * 60)
          //   }
          // )

          // Handle request timeout
          if (config.timeout) {
            // This is forcing a int timeout to avoid problems if the `req` interface doesn't handle other types.
            const timeout = Number.parseInt(config.timeout)

            if (Number.isNaN(timeout)) {
              reject(
                new AxiosError(
                  'error trying to parse `config.timeout` to int',
                  AxiosError.ERR_BAD_OPTION_VALUE,
                  config,
                  req
                )
              )
            } else {
              // Sometime, the response will be very slow, and does not respond, the connect event will be block by event loop system.
              // And timer callback will be fired, and abort() will be invoked before connection, then get "socket hang up" and code ECONNRESET.
              // At this time, if we have a large number of request, nodejs will hang up some socket on background. and the number will up and up.
              // And then these socket which be hang up will devouring CPU little by little.
              // ClientRequest.setTimeout will be fired on the specify milliseconds, and can make sure that abort() will be fired after connect.
              req.setTimeout(timeout, () => {
                if (_.isDone) return

                let timeoutErrorMessage = config.timeout
                  ? `timeout of ${config.timeout}ms exceeded`
                  : 'timeout exceeded'
                const transitional = config.transitional || transitionalDefaults
                if (config.timeoutErrorMessage) timeoutErrorMessage = config.timeoutErrorMessage

                reject(
                  new AxiosError(
                    timeoutErrorMessage,
                    transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
                    config,
                    req
                  )
                )
                abort()
              })
            }
          }

          // stream finished
          req.on('finished', _.onFinished.bind(_))

          // ! stream 模式不等待响应数据，直接返回 req，建立pipe管道流
          if (config.stream) resolve(req)
          else {
            // 非stream模式，等待响应数据，返回数据
            req.on(
              'response',
              /**
               * @param {*} res 原数据流
               * @param {*} stream2 解压等处理后的数据流
               */
              (res, stream2) => {
                if (req.destroyed) return

                // 'transfer-encoding': 'chunked'时，无content-length，axios v1.2 不能自动解压
                const responseLength = +res.headers['content-length']

                // log('onresponse', {
                //   statusCode: res.statusCode,
                //   responseLength,
                //   headers: res.headers,
                // })

                // return the last request(ClientRequest) in case of redirects
                const lastRequest = res.req || req

                /** @type {*} */
                const response = {
                  status: res.statusCode,
                  statusText: res.statusMessage,
                  headers: new AxiosHeaders(res.headers),
                  config,
                  request: lastRequest,
                }

                // 直接返回 responseStream
                if (responseType === 'stream') {
                  response.data = stream2
                  settle(resolve, reject, response)
                } else {
                  // 处理 responseStream
                  /** @type {*} */
                  const responseBuffer = []
                  let totalResponseBytes = 0

                  // 处理数据
                  stream2.on(
                    'data',
                    /** @param {*} chunk */ chunk => {
                      responseBuffer.push(chunk)
                      totalResponseBytes += chunk.length

                      // make sure the content length is not over the maxContentLength if specified
                      if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
                        // stream.destroy() emit aborted event before calling reject() on Node.js v16
                        _.rejected = true
                        stream2.destroy()
                        reject(
                          new AxiosError(
                            `maxContentLength size of ${config.maxContentLength} exceeded`,
                            AxiosError.ERR_BAD_RESPONSE,
                            config,
                            lastRequest
                          )
                        )
                      }
                    }
                  )

                  stream2.on('aborted', function handlerStreamAborted() {
                    if (_.rejected) return

                    const err = new AxiosError(
                      `maxContentLength size of ${config.maxContentLength} exceeded`,
                      AxiosError.ERR_BAD_RESPONSE,
                      config,
                      lastRequest
                    )
                    stream2.destroy(err)
                    reject(err)
                  })

                  stream2.on('error', function handleStreamError(err) {
                    if (req.destroyed) return
                    reject(AxiosError.from(err, null, config, lastRequest))
                  })

                  // 数据传输结束
                  stream2.on('end', function handleStreamEnd() {
                    try {
                      let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer)
                      if (responseType !== 'arraybuffer') {
                        responseData = responseData.toString(responseEncoding)
                        if (!responseEncoding || responseEncoding === 'utf8') {
                          responseData = utils.stripBOM(responseData)
                        }
                      }
                      response.data = responseData
                      settle(resolve, reject, response)
                    } catch (err) {
                      reject(AxiosError.from(err, null, config, response.request, response))
                    }
                  })
                }

                emitter.once('abort', err => {
                  if (!stream2.destroyed) {
                    stream2.emit('error', err)
                    stream2.destroy()
                  }
                })
              }
            )

            // 非stream模式需发送数据，改由request处理
            // if (utils.isStream(data)) {
            //   // Send the request
            //   let ended = false
            //   let errored = false

            //   data.on('end', () => {
            //     ended = true
            //   })

            //   data.once(
            //     'error',
            //     /** @param {*} err */ err => {
            //       errored = true
            //       req.destroy(err)
            //     }
            //   )

            //   data.on('close', () => {
            //     if (!ended && !errored) {
            //       abort(new CanceledError('Request stream has been aborted', config, req))
            //     }
            //   })

            //   data.pipe(req) // stream 写入数据
            // } else req.end(data)
          }
        })
      }

      _.done(R)
    } catch (e) {
      log.err(e, 'request catch')
      _.done(e, true)
      throw e
    }
    return R
  }
}

/**
 * 排除对象字段
 * @param {*} obj
 * @param  {...any} keys
 * @returns {*}
 */
function omit(obj, ...keys) {
  /** @type {*} */
  const R = {}
  for (const k of Object.keys(obj)) {
    if (!keys.includes(k)) R[k] = obj[k]
  }
  return R
}

/**
 *
 * @param {*} stream
 * @param {*} param1
 * @returns
 */
const flushOnFinish = (stream, [throttled, flush]) => {
  stream.on('end', flush).on('error', flush)

  return throttled
}

/** @typedef {import('../core/Axios').default} Axios */

/**
 * If the proxy or config beforeRedirects functions are defined, call them with the options
 * object.
 *
 * @param {Object<string, any>} options - The options object that was passed to the request.
 * @param {*} responseDetails - The options object that was passed to the request.
 *
 */
function dispatchBeforeRedirect(options, responseDetails) {
  // log.debug('dispatchBeforeRedirect', {opts: options.beforeRedirects})

  if (options.beforeRedirects.proxy) options.beforeRedirects.proxy(options)
  if (options.beforeRedirects.config) options.beforeRedirects.config(options, responseDetails)
}

/**
 *
 * @param {{address: string, family: *}} param0
 * @returns
 */
function resolveFamily({address, family}) {
  if (!utils.isString(address)) {
    throw TypeError('address must be a string')
  }

  return {
    address,
    family: family || (address.indexOf('.') < 0 ? 6 : 4),
  }
}

/**
 *
 * @param {*} address
 * @param {*} family
 */
function buildAddressEntry(address, family) {
  resolveFamily(utils.isObject(address) ? address : {address, family})
}

/**
 * null or funciton
 */
export default isHttpAdapterSupported && HttpAdapter
