/**
 * from 'https://github.com/follow-redirects/follow-redirects'
 * 修改以支持http、https 代理服务器
 * 代理模式下，http or https 请求，取决于 proxy 代理服务器，而不是目的服务器。
 */

import url from 'node:url';
import assert from 'node:assert';
import RedirectReq from './redirectReq.js';
import utils from '../utils.js';
import Log from './log.js';

const log = new Log({env: 'wia.redirect', pre: 'Redirect'});

const {URL} = url;

const InvalidUrlError = utils.createErrorType('ERR_INVALID_URL', 'Invalid URL', TypeError);

/**
 * 封装http(s)，实现重定向
 * 重定向可能切换http、https
 * 支持隧道及非隧道、http(s)代理
 */
export default class Redirect {
  // Req 对象实例
  constructor(opts) {
    const m = this;
    m.maxRedirects = opts?.maxRedirects ?? 21;
    m.maxBodyLength = opts?.maxBodyLength ?? 10 * 1024 * 1024;
  }

  /**
   * Executes a request, following redirects
   * 替换原 http(s).request，参数类似
   * 注意变参 (options[, callback]) or (url[, options][, callback])
   * @param {*} input/options
   * @param {*} options/callback
   * @param {*} callback/null
   * @returns
   */
  request(input, options, callback) {
    const m = this;
    let R = null;

    try {
      // Parse parameters
      if (utils.isString(input)) {
        let parsed;
        try {
          parsed = urlToOptions(new URL(input));
        } catch (err) {
          parsed = url.parse(input);
        }

        if (!utils.isString(parsed.protocol)) throw new InvalidUrlError({input});

        input = parsed;
      } else if (URL && input instanceof URL) input = urlToOptions(input);
      else {
        callback = options;
        options = input;
        input = {};
      }

      if (utils.isFunction(options)) {
        callback = options;
        options = null;
      }

      // copy options
      options = {
        maxRedirects: m.maxRedirects,
        maxBodyLength: m.maxBodyLength,
        ...input,
        ...options,
      };

      if (!utils.isString(options.host) && !utils.isString(options.hostname))
        options.hostname = '::1';

      log.debug('request', {options});

      this.options = options;
      this.callback = callback;

      R = new RedirectReq(m, options, callback);
    } catch (e) {
      log.error(`request exp:${e.message}`);
    }

    return R;
  }

  // Executes a GET request, following redirects
  get(input, options, callback) {
    const redirectReq = this.request(input, options, callback);
    redirectReq.end();
    return redirectReq;
  }
}

// from https://github.com/nodejs/node/blob/master/lib/internal/url.js
function urlToOptions(urlObject) {
  const options = {
    protocol: urlObject.protocol,
    hostname: urlObject.hostname.startsWith('[')
      ? urlObject.hostname.slice(1, -1)
      : urlObject.hostname,
    hash: urlObject.hash,
    search: urlObject.search,
    pathname: urlObject.pathname,
    path: urlObject.pathname + urlObject.search,
    href: urlObject.href,
  };

  if (urlObject.port !== '') options.port = Number(urlObject.port);

  return options;
}
