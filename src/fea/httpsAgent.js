import https from 'node:https';
import http from 'node:http';
import {URL} from 'node:url';
import Log from './log.js';

const log = new Log({env: 'wia.agent', pre: 'HttpsAgent'});

export default class HttpsAgent extends https.Agent {
  constructor(options) {
    const {proxy, proxyRequestOptions, tunnel, ...opts} = options;
    super(opts);

    this.proxy = typeof proxy === 'string' ? new URL(proxy) : proxy;
    this.proxyRequestOptions = proxyRequestOptions || {};
    this.tunnel = true;
  }

  createConnection(options, callback) {
    const m = this;

    const connOptions = {
      ...this.proxyRequestOptions,
      method: 'CONNECT',
      host: this.proxy.hostname,
      port: this.proxy.port,
      path: `${options.host}:${options.port}`,
      setHost: false,
      headers: {
        ...this.proxyRequestOptions.headers,
        connection: this.keepAlive ? 'keep-alive' : 'close',
        host: `${options.host}:${options.port}`,
      },
      agent: false,
      timeout: options.timeout || 0,
    };

    if (this.proxy.username || this.proxy.password) {
      const base64 = Buffer.from(
        `${decodeURIComponent(this.proxy.username || '')}:${decodeURIComponent(
          this.proxy.password || ''
        )}`
      ).toString('base64');
      connOptions.headers['proxy-authorization'] = `Basic ${base64}`;
    }

    // Necessary for the TLS check with the proxy to succeed.
    if (this.proxy.protocol === 'https:') {
      connOptions.servername = this.proxy.hostname;
    }

    log.debug('connection', {proxy: this.proxy, options, connOptions});

    const request = (this.proxy.protocol === 'http:' ? http : https).request(connOptions);
    request.once('connect', (response, socket, head) => {
      log.warn('onconnect', {statusCode: response.statusCode, head});

      request.removeAllListeners();
      socket.removeAllListeners();
      if (response.statusCode === 200) {
        const secureSocket = super.createConnection({...options, socket});
        callback(null, secureSocket);
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
