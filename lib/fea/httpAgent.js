import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import Log from './log.js';
const log = new Log({
  env: 'wia.agent',
  pre: 'HttpAgent'
});
export default class HttpAgent extends http.Agent {
  constructor(options) {
    const {
      proxy,
      proxyRequestOptions,
      tunnel,
      ...opts
    } = options;
    super(opts);
    this.proxy = typeof proxy === 'string' ? new URL(proxy) : proxy;
    this.proxyRequestOptions = proxyRequestOptions || {};
    this.tunnel = tunnel; // http网址，是否使用隧道模式
  }

  addRequest(request, options) {
    var _options$path;
    const m = this;

    // let headers = request.getHeaders();
    // log.debug('addRequest-0', {options, headers});

    request.path = `${options.protocol}//${options.hostname}${options.port ? ':' + options.port : ''}${(_options$path = options.path) !== null && _options$path !== void 0 ? _options$path : ''}`;
    request.host = `${m.proxy.hostname || m.proxy.host}${options.port ? ':' + m.proxy.port : ''}`;
    if (m.proxy.protocol) request.protocol = m.proxy.protocol.includes(':') ? m.proxy.protocol : `${m.proxy.protocol}:`;
    request.setHeader('host', `${options.hostname}${options.port ? ':' + options.port : ''}`);
    request.setHeader('connection', m.keepAlive ? 'keep-alive' : 'close');
    if (m.proxyRequestOptions.headers) Object.keys(m.proxyRequestOptions.headers).forEach(k => request.setHeader(k, m.proxyRequestOptions.headers[k]));

    // timeout: options.timeout || 0
    // headers = request.getHeaders();
    // log.debug('addRequest-1', {headers});
    return super.addRequest(request, options);
  }
  createConnection(options, callback) {
    const m = this;
    let connOpt;
    // 非隧道
    if (!m.tunnel) {
      connOpt = {
        host: m.proxy.hostname || m.proxy.host,
        port: m.proxy.port
      };
      log.debug('createConnection', {
        options,
        connOpt
      });
      const socket = super.createConnection(connOpt, () => {
        // 'connect' listener.
        log.warn('onconnect tunnel.', {
          tunnel: m.tunnel,
          proxy: m.proxy
        });
        callback(null, socket);
      });
    } else {
      connOpt = {
        ...m.proxyRequestOptions,
        method: 'CONNECT',
        host: m.proxy.hostname || m.proxy.host,
        port: m.proxy.port,
        path: `${options.host}:${options.port}`,
        setHost: false,
        headers: {
          ...m.proxyRequestOptions.headers,
          connection: m.keepAlive ? 'keep-alive' : 'close',
          host: `${options.host}:${options.port}`
        },
        agent: false,
        timeout: options.timeout || 0
      };

      // Basic proxy authorization
      if (m.proxy.username || m.proxy.password) {
        const base64 = Buffer.from(`${decodeURIComponent(m.proxy.username || '')}:${decodeURIComponent(m.proxy.password || '')}`).toString('base64');
        connOpt.headers['proxy-authorization'] = `Basic ${base64}`;
      }
      if (m.proxy.protocol === 'https:') connOpt.servername = m.proxy.hostname;
      log.debug('connection', {
        proxy: m.proxy,
        options,
        connOpt
      });

      // 连接代理服务器
      const request = (m.proxy.protocol === 'http:' ? http : https).request(connOpt);
      request.once('connect', (response, socket, head) => {
        log.warn('onconnect', {
          statusCode: response.statusCode,
          head
        });
        request.removeAllListeners();
        socket.removeAllListeners();
        if (response.statusCode === 200) {
          callback(null, socket);
        } else {
          socket.destroy();
          callback(new Error(`Bad response: ${response.statusCode}`), null);
        }
      });
      request.once('timeout', () => {
        request.destroy(new Error('Proxy timeout'));
      });
      request.once('error', err => {
        request.removeAllListeners();
        callback(err, null);
      });
      request.end();
    }
  }
}