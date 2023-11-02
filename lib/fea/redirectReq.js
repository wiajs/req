/**
 * fork from follow-redirects
 * https://github.com/follow-redirects/follow-redirects
 */
import http from 'node:http';
import https from 'node:https';
import assert from 'node:assert';
import url from 'node:url';
import { Duplex } from 'node:stream'; // Writable 流改为读写双工
import utils from '../utils.js';
import Log from './log.js';
const log = new Log({
  env: 'wia.redirect',
  pre: 'RedirectReq'
});
const httpModules = {
  'http:': http,
  'https:': https
};

// Create handlers that pass events from native requests
const writeEvents = ['abort',
// 弃用
'aborted',
// 弃用
'close', 'connect', 'continue', 'drain', 'error', 'finish', 'information', 'pipe',
// 'response', 由 processResponse 触发
'socket', 'timeout', 'unpipe', 'upgrade'];
const writeEventEmit = Object.create(null);
writeEvents.forEach(ev => writeEventEmit[ev] = function (...args) {
  const m = this; // 事件回调，this === clientRequest 实例
  log.debug('req event', {
    ev
  });
  m.redirectReq.emit(ev, ...args); // 向上触发事件
});

// stream.Readable
const readEvents = ['close', 'data', 'end', 'error', 'pause', 'readable', 'resume'];
const readEventEmit = Object.create(null);
writeEvents.forEach(ev => writeEventEmit[ev] = function (...args) {
  const m = this; // 事件回调，this === clientRequest 实例
  log.debug('res event', {
    ev
  });
  m.redirectReq.emit(ev, ...args); // 向上触发事件
});

// Error types with codes
const RedirectionError = utils.createErrorType('ERR_FR_REDIRECTION_FAILURE', 'Redirected request failed');
const TooManyRedirectsError = utils.createErrorType('ERR_FR_TOO_MANY_REDIRECTS', 'Maximum number of redirects exceeded');
const MaxBodyLengthExceededError = utils.createErrorType('ERR_FR_MAX_BODY_LENGTH_EXCEEDED', 'Request body larger than maxBodyLength limit');
const WriteAfterEndError = utils.createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');

/**
 * An HTTP(S) request that can be redirected
 * wrap http.ClientRequest
 */
export default class RedirectReq extends Duplex {
  /**
   * responseCallback 原消息处理回调
   */
  constructor(redirect, options, resCallback) {
    super();
    const m = this;
    m.redirect = redirect;

    // Initialize the request
    m._sanitizeOptions(options);
    m._options = options;
    m._ended = false;
    m._ending = false;
    m._redirectCount = 0;
    m._redirects = [];
    m._requestBodyLength = 0;
    m._requestBodyBuffers = [];

    // save the callback if passed
    m.resCallback = resCallback;
    // React to responses of native requests
    // 接管 response 事件，非重定向，触发 response 事件
    m._onResponse = response => m.processResponse(response);

    // Proxy all other public ClientRequest methods
    ['flushHeaders', 'getHeader', 'setNoDelay', 'setSocketKeepAlive'].forEach(method => {
      m[method] = (a, b) => {
        log.debug(method, {
          a,
          b
        });
        m._currentRequest[method](a, b);
      };
    });

    // Proxy all public ClientRequest properties
    ['aborted', 'connection', 'socket'].forEach(property => {
      Object.defineProperty(m, property, {
        get() {
          const val = m._currentRequest[property];
          log.debug('get property', {
            property
          });
          return val;
        }
      });
    });

    // Perform the first request
    m.request();
  }

  /**
   * Executes the next native request (initial or redirect)
   * @returns http(s) 实例
   */
  request() {
    let R = null;
    try {
      const m = this;
      // m.httpModule = httpModules[protocol];

      // Load the native protocol
      let {
        protocol
      } = m._options;
      const {
        agents
      } = m._options;

      // 代理以目的网址协议为准
      // If specified, use the agent corresponding to the protocol
      // (HTTP and HTTPS use different types of agents)
      if (agents) {
        const scheme = protocol.slice(0, -1);
        m._options.agent = agents[scheme];
      }

      // http 非隧道代理模式，模块以代理主机为准，其他以目的网址为准
      // 代理内部会根据代理协议选择 http(s) 发起请求创建连接
      if (protocol === 'http:' && agents.http) {
        protocol = agents.http.proxy && !agents.http.tunnel ? agents.http.proxy.protocol : protocol;
      }
      const httpModule = httpModules[protocol];
      if (!httpModule) {
        m.emit('error', new TypeError(`Unsupported protocol: ${protocol}`));
        return null;
      }
      log.debug('request', {
        options: m._options,
        protocol
      });

      // Create the native request and set up its event handlers
      const req = httpModule.request(m._options, m._onResponse);
      m._currentRequest = req;
      req.redirectReq = m;
      // 接收并转发原始ClientRequestr事件
      writeEvents.forEach(ev => req.on(ev, writeEventEmit[ev]));

      // RFC7230§5.3.1: When making a request directly to an origin server, […]
      // a client MUST send only the absolute path […] as the request-target.
      // When making a request to a proxy, […]
      // a client MUST send the target URI in absolute-form […].
      m._currentUrl = /^\//.test(m._options.path) ? url.format(m._options) : m._options.path;

      // End a redirected request
      // (The first request must be ended explicitly with RedirectableRequest#end)
      if (m._isRedirect) {
        // Write the request entity and end
        let i = 0;
        const buffers = m._requestBodyBuffers;
        (function writeNext(error) {
          // Only write if this request has not been redirected yet
          /* istanbul ignore else */
          if (req === m._currentRequest) {
            // Report any write errors
            /* istanbul ignore if */
            if (error) m.emit('error', error);
            // Write the next buffer if there are still left
            else if (i < buffers.length) {
              const buf = buffers[i++];
              /* istanbul ignore else */
              if (!req.finished) req.write(buf.data, buf.encoding, writeNext);
            }
            // End the request if `end` has been called on us
            else if (m._ended) req.end();
          }
        })();
      }
      R = req;
    } catch (e) {
      console.error(` exp:${e.message}`);
    }
    return R;
  }
  abort() {
    abortRequest(this._currentRequest);
    this.emit('abort');
  }

  // Writes buffered data to the current native request
  write(data, encoding, callback) {
    const m = this;
    log.debug('write', {
      data,
      encoding,
      callback
    });

    // Writing is not allowed if end has been called
    if (m._ending) throw new WriteAfterEndError();

    // Validate input and shift parameters if necessary
    if (!utils.isString(data) && !utils.isBuffer(data)) throw new TypeError('data should be a string, Buffer or Uint8Array');
    if (utils.isFunction(encoding)) {
      callback = encoding;
      encoding = null;
    }

    // Ignore empty buffers, since writing them doesn't invoke the callback
    // https://github.com/nodejs/node/issues/22066
    if (data.length === 0) {
      if (callback) callback();
      return;
    }

    // Only write when we don't exceed the maximum body length
    if (m._requestBodyLength + data.length <= m._options.maxBodyLength) {
      m._requestBodyLength += data.length;
      m._requestBodyBuffers.push({
        data,
        encoding
      });
      m._currentRequest.write(data, encoding, callback);
    }
    // Error when we exceed the maximum body length
    else {
      m.emit('error', new MaxBodyLengthExceededError());
      m.abort();
    }
  }

  // Ends the current native request
  end(data, encoding, callback) {
    const m = this;

    // Shift parameters if necessary
    if (utils.isFunction(data)) {
      callback = data;
      data = null;
      encoding = null;
    } else if (utils.isFunction(encoding)) {
      callback = encoding;
      encoding = null;
    }

    // Write data if needed and end
    if (!data) {
      m._ended = true;
      m._ending = true;
      m._currentRequest.end(null, null, callback);
    } else {
      const currentRequest = m._currentRequest;
      m.write(data, encoding, function () {
        m._ended = true;
        currentRequest.end(null, null, callback);
      });
      m._ending = true;
    }
  }

  // Sets a header value on the current native request
  setHeader(name, value) {
    this._options.headers[name] = value;
    this._currentRequest.setHeader(name, value);
  }

  // Clears a header value on the current native request
  removeHeader(name) {
    delete this._options.headers[name];
    this._currentRequest.removeHeader(name);
  }

  // Global timeout for all underlying requests
  setTimeout(msecs, callback) {
    const m = this;

    // Destroys the socket on timeout
    function destroyOnTimeout(socket) {
      socket.setTimeout(msecs);
      socket.removeListener('timeout', socket.destroy);
      socket.addListener('timeout', socket.destroy);
    }

    // Sets up a timer to trigger a timeout event
    function startTimer(socket) {
      if (m._timeout) {
        clearTimeout(m._timeout);
      }
      m._timeout = setTimeout(function () {
        m.emit('timeout');
        clearTimer();
      }, msecs);
      destroyOnTimeout(socket);
    }

    // Stops a timeout from triggering
    function clearTimer() {
      // Clear the timeout
      if (m._timeout) {
        clearTimeout(m._timeout);
        m._timeout = null;
      }

      // Clean up all attached listeners
      m.removeListener('abort', clearTimer);
      m.removeListener('error', clearTimer);
      m.removeListener('response', clearTimer);
      if (callback) {
        m.removeListener('timeout', callback);
      }
      if (!m.socket) {
        m._currentRequest.removeListener('socket', startTimer);
      }
    }

    // Attach callback if passed
    if (callback) m.on('timeout', callback);

    // Start the timer if or when the socket is opened
    if (m.socket) startTimer(m.socket);else m._currentRequest.once('socket', startTimer);

    // Clean up on events
    m.on('socket', destroyOnTimeout);
    m.on('abort', clearTimer);
    m.on('error', clearTimer);
    m.on('response', clearTimer);
    return m;
  }
  _sanitizeOptions(options) {
    // Ensure headers are always present
    if (!options.headers) options.headers = {};

    // Since http.request treats host as an alias of hostname,
    // but the url module interprets host as hostname plus port,
    // eliminate the host property to avoid confusion.
    if (options.host) {
      // Use hostname if set, because it has precedence
      if (!options.hostname) {
        options.hostname = options.host;
      }
      delete options.host;
    }

    // Complete the URL object when necessary
    if (!options.pathname && options.path) {
      const searchPos = options.path.indexOf('?');
      if (searchPos < 0) {
        options.pathname = options.path;
      } else {
        options.pathname = options.path.substring(0, searchPos);
        options.search = options.path.substring(searchPos);
      }
    }
  }

  /**
   * Processes a response from the current native request
   * @param {*} response
   * @returns
   */
  processResponse(response) {
    const m = this;

    // Store the redirected response
    const {
      statusCode
    } = response;
    if (m._options.trackRedirects) {
      m._redirects.push({
        url: m._currentUrl,
        headers: response.headers,
        statusCode
      });
    }

    // RFC7231§6.4: The 3xx (Redirection) class of status code indicates
    // that further action needs to be taken by the user agent in order to
    // fulfill the request. If a Location header field is provided,
    // the user agent MAY automatically redirect its request to the URI
    // referenced by the Location field value,
    // even if the specific status code is not understood.

    // If the response is not a redirect; return it as-is
    const {
      location
    } = response.headers;
    log.debug('processResponse', {
      statusCode,
      headers: response.headers
    });
    if (!location || m._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
      // 非重定向，返回给原始回调处理
      response.responseUrl = m._currentUrl;
      response.redirects = m._redirects;

      // 触发原回调函数
      if (m.resCallback) {
        if (m._options.stream) {
          const stream = m.resCallback(response, true);
        } else m.resCallback(response);
      }

      // 类似 ClientRequest，触发 response 事件
      m.emit('response', response);

      // Clean up
      m._requestBodyBuffers = [];
      return;
    }

    // The response is a redirect, so abort the current request
    abortRequest(m._currentRequest);
    // Discard the remainder of the response to avoid waiting for data
    response.destroy();

    // RFC7231§6.4: A client SHOULD detect and intervene
    // in cyclical redirections (i.e., "infinite" redirection loops).
    if (++m._redirectCount > m._options.maxRedirects) {
      m.emit('error', new TooManyRedirectsError());
      return;
    }

    // Store the request headers if applicable
    let requestHeaders;
    const {
      beforeRedirect
    } = m._options;
    if (beforeRedirect) {
      requestHeaders = {
        // The Host header was set by nativeProtocol.request
        Host: response.req.getHeader('host'),
        ...m._options.headers
      };
    }

    // RFC7231§6.4: Automatic redirection needs to done with
    // care for methods not known to be safe, […]
    // RFC7231§6.4.2–3: For historical reasons, a user agent MAY change
    // the request method from POST to GET for the subsequent request.
    const {
      method
    } = m._options;
    if ((statusCode === 301 || statusCode === 302) && m._options.method === 'POST' ||
    // RFC7231§6.4.4: The 303 (See Other) status code indicates that
    // the server is redirecting the user agent to a different resource […]
    // A user agent can perform a retrieval request targeting that URI
    // (a GET or HEAD request if using HTTP) […]
    statusCode === 303 && !/^(?:GET|HEAD)$/.test(m._options.method)) {
      m._options.method = 'GET';
      // Drop a possible entity and headers related to it
      m._requestBodyBuffers = [];
      removeMatchingHeaders(/^content-/i, m._options.headers);
    }

    // Drop the Host header, as the redirect might lead to a different host
    const currentHostHeader = removeMatchingHeaders(/^host$/i, m._options.headers);

    // If the redirect is relative, carry over the host of the last request
    const currentUrlParts = url.parse(m._currentUrl);
    const currentHost = currentHostHeader || currentUrlParts.host;
    const currentUrl = /^\w+:/.test(location) ? m._currentUrl : url.format(Object.assign(currentUrlParts, {
      host: currentHost
    }));

    // Determine the URL of the redirection
    let redirectUrl;
    try {
      redirectUrl = url.resolve(currentUrl, location);
    } catch (cause) {
      m.emit('error', new RedirectionError({
        cause
      }));
      return;
    }

    // Create the redirected request
    log.debug('redirecting to', {
      redirectUrl
    });
    m._isRedirect = true;
    const redirectUrlParts = url.parse(redirectUrl);
    // 覆盖原 url 解析部分，包括 protocol、hostname、port等
    Object.assign(m._options, redirectUrlParts);

    // Drop confidential headers when redirecting to a less secure protocol
    // or to a different domain that is not a superdomain
    if (redirectUrlParts.protocol !== currentUrlParts.protocol && redirectUrlParts.protocol !== 'https:' || redirectUrlParts.host !== currentHost && !isSubdomain(redirectUrlParts.host, currentHost)) {
      removeMatchingHeaders(/^(?:authorization|cookie)$/i, this._options.headers);
    }

    // Evaluate the beforeRedirect callback
    if (utils.isFunction(beforeRedirect)) {
      const responseDetails = {
        headers: response.headers,
        statusCode
      };
      const requestDetails = {
        url: currentUrl,
        method,
        headers: requestHeaders
      };
      try {
        beforeRedirect(m._options, responseDetails, requestDetails);
      } catch (err) {
        m.emit('error', err);
        return;
      }
      m._sanitizeOptions(m._options);
    }

    // Perform the redirected request
    try {
      m.request();
    } catch (cause) {
      m.emit('error', new RedirectionError({
        cause
      }));
    }
  }

  // Read Stream API

  /**
   * read stream to write stream
   * @param {*} dest
   * @param {*} opts
   * @returns
   */
  pipe(dest, opts) {
    const m = this;
    if (m.response) {
      if (m._destdata) {
        m.emit('error', new Error('You cannot pipe after data has been emitted from the response.'));
      } else if (m._ended) {
        m.emit('error', new Error('You cannot pipe after the response has been ended.'));
      } else {
        super.pipe(dest, opts);
        m.pipeDest(dest);
        return dest;
      }
    } else {
      m.dests.push(dest);
      super.pipe(dest, opts);
      return dest;
    }
  }
  unpipe(dest, opts) {
    super.unpipe(dest);
    return this;
  }
}
function abortRequest(request) {
  writeEvents.forEach(ev => request.removeListener(ev, writeEventEmit[ev]));
  request.on('error', utils.noop);
  request.abort();
}
function removeMatchingHeaders(regex, headers) {
  let lastValue;
  Object.keys(headers).forEach(k => {
    if (regex.test(k)) {
      lastValue = headers[k];
      delete headers[k];
    }
  });
  return lastValue === null || typeof lastValue === 'undefined' ? undefined : String(lastValue).trim();
}
function isSubdomain(subdomain, domain) {
  assert(utils.isString(subdomain) && utils.isString(domain));
  const dot = subdomain.length - domain.length - 1;
  return dot > 0 && subdomain[dot] === '.' && subdomain.endsWith(domain);
}