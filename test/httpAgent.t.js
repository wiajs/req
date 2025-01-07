import {setTimeout as delay} from 'node:timers/promises';
import https from 'node:https';
import http from 'node:http';
import {log as Log, name} from '@wiajs/log';
import HttpAgent from './httpAgent';
import {getProxy, getXMao, proxyAuth} from './proxy';
// import {HttpProxyAgent} from 'http-proxy-agent'

import Req from '../req';

const log = Log({env: `wia:agent:${name(__filename)}`});

/**
 * 熊猫动态
 * 动态使用与高效、隧道不一样，不提取ip，使用 header 验证
 * 单次有效，每次请求ip不同，多为虚拟地址
 * ip地址多，性价比高，适合单次获取数据场景
 */
const _xm01 = {
  // 动态并发产品代理设置为 dtbf.xiongmaodaili.com:8089,
  // 动态按量产品需将代理设置为 dtan.xiongmaodaili.com:8088
  url: 'http://dtan.xiongmaodaili.com:8088',
  secret: '8b807518978253cca4892ba86af508d6', // 熊猫
  orderno: '', // 动态15秒-3分钟
  // 动态需再请求headers中添加以下字段，一次调用一个ip
  // 'Proxy-Authorization': proxyAuth(cfg.orderno, cfg.secret),
  // 如果返回错误"验证失败，没有传入正确的请求头"，使用 'Xiongmao-Proxy-Authorization'
};

/**
 * 熊猫高效 15秒-3分钟
 * 使用方法与隧道一致，需提取ip，使用ip作为代理
 * 有效时间内，多次请求ip相同。
 */
const _xm02 = {
  url: 'http://pandavip.xiongmaodaili.com/xiongmao-web/apiPlus/vgl',
  secret: '8b807518978253cca4892ba86af508d6', // 熊猫
  orderno: 'VGL20240928192609iwi90Btk', // 动态15秒-3分钟
};

/**
 * 熊猫隧道3分钟
 * 使用方法与高效一致，需提取ip，使用ip作为代理
 * 有效时间内，多次请求ip相同。
 */
const _xm03 = {
  url: 'http://pandavip.xiongmaodaili.com/xiongmao-web/sdApi/sdl',
  secret: '8b807518978253cca4892ba86af508d6',
  orderno: 'SDL20241001063047nlblR2A5', // 隧道3分钟
  // password: 'xmdl76d7',
  // account: 'xmdl2950',
};

main().catch(err => {
  log.err(err, 'main');
  process.exit(1);
});

async function main() {
  // const rs = (await Req.get('http://file.bunjs.pub:17247/'))?.data
  // log({rs}, 'main')

  // const cfg = _xm02 // 高效
  // await getXMao(cfg.url, cfg.orderno, cfg.secret)
  await xmao();

  delay(1000);
}

async function xmao() {
  log('xmao...');

  // const cfg = _xm01 // 动态
  const cfg = _xm02; // 高效，测试有时候支持隧道并发，支持转发并发
  // const cfg = _xm03 // 隧道，支持并发
  const px = await getXMao(cfg.url, cfg.orderno, cfg.secret);
  if (!px?.host) return;

  // 创建agent复用连接，维护给定主机和端口的待处理请求队列
  // 不创建 agent，则使用全局共用的 globalAgent 对象实例
  // agent = false，则创建单次请求的agent，请求完毕自动销毁
  // keepAlive为true时，Agent实例不再使用时，需destroy()，以免消耗资源。
  const agent = new HttpAgent({
    // proxy: `http://${px.host}`, // 高效、隧道
    // proxy: cfg.url, // 动态
    // 熊猫高效代理不支持并发，隧道代理支持并发
    // 隧道并发无连接时不受maxSockets限制，会同时新建连接，如代理禁止并发会失败
    // 如设置maxSockets，有连接时，并发会排队，串发不存在此问题
    // 转发只是普通的http请求，支持并发，不建隧道，比隧道快得多，默认转发
    // tunnel: true,
    // 连接不关闭，后续请求复用，目的主机如关闭，则无效，连接代理keepAlive需为true 缺省false
    keepAlive: true,
    // 同一目的网址最大并发连接，超过排队，隧道代理或服务器限制并发时需设置，否则报错，默认值：Infinity
    maxSockets: 5, // 无连接，并发连接时，此参数无效，转发代理支持并发无需设置或设置并发数
    maxFreeSockets: 5, // 同一目的主机空闲最大连接，超过关闭。keepAlive true 时有效。默认值：256
    timeout: 10000, // 建立连接时长，缺省 30000
  });

  // const agent = new HttpProxyAgent(`http://${px.host}`)
  // const agent = new HttpProxyAgent(cfg.url) // 动态
  const opts = {
    agent,
    // 动态使用
    // headers: {
    //   'Proxy-Authorization': proxyAuth(cfg.orderno, cfg.secret),
    // },
  };

  // axios 实例
  const req = Req.create({
    // baseURL: _url,
    timeout: 10000, // 响应超时，缺省0，无限，连接后目标网址10秒无响应数据，超时处理
    // axios.defaults.headers 不能根据 headers 自动转换 data
    headers: {
      // Referer: encodeURI(
      //   'https://kyfw.12306.cn/otn/leftTicket/init?linktypeid=dc&fs=重庆,CQW&ts=成都,CDW&date=2022-11-19&flag=N,Y,Y'
      // ),
      // 'Proxy-Authorization': _proxyAuth.auth,
    },
    withCredentials: true, // 获取 cookie
    agent: {
      // proxy: `http://${px.host}`, // 高效、隧道
      proxy: `socks://${px.host}`, // 高效、隧道
      // proxy: cfg.url, // 动态
      // 熊猫高效代理不支持并发，隧道代理支持并发
      // 隧道并发无连接时不受maxSockets限制，会同时新建连接，如代理禁止并发会失败
      // 如设置maxSockets，有连接时，并发会排队，串发不存在此问题
      // 转发只是普通的http请求，支持并发，不建隧道，比隧道快得多，默认转发
      // tunnel: true,
      // 连接不关闭，后续请求复用，目的主机如关闭，则无效，连接代理keepAlive需为true 缺省false
      keepAlive: true,
      // 同一目的网址最大并发连接，超过排队，隧道代理或服务器限制并发时需设置，否则报错，默认值：Infinity
      maxSockets: 5, // 无连接，并发连接时，此参数无效，转发代理支持并发无需设置或设置并发数
      maxFreeSockets: 5, // 同一目的主机空闲最大连接，超过关闭。keepAlive true 时有效。默认值：256
      timeout: 10000, // 建立连接时长，缺省 30000

      // proxyOpts: {
      //   ca: [fs.readFileSync('custom-proxy-cert.pem')],
      // },
      rejectUnauthorized: false, // 忽略ssl证书，不安全！
    },
  });

  // https://www.juliangip.com/api/general/Test
  // http://v2.api.juliangip.com/postpay/getips
  // http://uair.cn/
  // https://www.baidu.com/
  // https://hello.wia.pub/
  // https://api.ipify.org/
  // http://file.bunjs.pub:17247/
  // 创建复用连接
  // const rs = await httpGet('http://file.bunjs.pub:17247/', opts)
  // log({rs}, 'xmao')

  const rs = (await req.get('http://file.bunjs.pub:17247/'))?.data;
  log({rs}, 'xmao');

  // const rs = await Req.get('http://file.bunjs.pub:17247/')
  // log({rs}, 'xmao')

  // https.get('http://file.bunjs.pub:17247/', opts, res => {
  //   res.on('data', chunk => {
  //     log(chunk.toString())
  //   })
  // })
  // https.get('http://file.bunjs.pub:17247/', opts, res => {
  //   res.on('data', chunk => {
  //     log(chunk.toString())
  //   })
  // })
  // https.get('http://file.bunjs.pub:17247/', opts, res => {
  //   res.on('data', chunk => {
  //     log(chunk.toString())
  //   })
  // })
  // https.get('http://file.bunjs.pub:17247/', opts, res => {
  //   res.on('data', chunk => {
  //     log(chunk.toString())
  //   })
  // })

  // let rs = await httpGet('http://file.bunjs.pub:17247/', opts)
  // log({rs}, 'xmao')
  // rs = await httpGet('http://file.bunjs.pub:17247/', opts)
  // log({rs}, 'xmao')
  // rs = await httpGet('http://file.bunjs.pub:17247/', opts)
  // log({rs}, 'xmao')
  // log('xmao.')
}

async function juliang() {
  // await getProxy('6247160166646023')
  // const px = {host: '125.87.92.222:33516'}
  const px = await getProxy('6876598927708057');
  if (px.host) {
    // 创建agent复用连接，维护给定主机和端口的待处理请求队列
    // 不创建 agent，则使用全局共用的 globalAgent 对象实例
    // agent = false，则创建单次请求的agent，请求完毕自动销毁
    // keepAlive为true时，Agent实例不再使用时，需destroy()，以免消耗资源。
    const agent = new HttpAgent({
      proxy: `http://${px.host}`,
      // 连接复用，目的主机如关闭，则重新连接，连接代理keepAlive需为true
      keepAlive: true, // 保持连接，再次请求无需重新建立连接，缺省false
      maxSockets: 1, // 同一目的主机最大活动连接，超过排队等待，默认值：Infinity，控制并发数
      maxFreeSockets: 2, // 同一目的主机空闲时保持连接的最大连接数。keepAlive true 时有效。默认值：256
      timeout: 10000, // 建立连接时长，缺省 30000
    });

    // https://www.juliangip.com/api/general/Test
    // http://v2.api.juliangip.com/postpay/getips
    // http://uair.cn/
    https.get('https://www.juliangip.com/api/general/Test', {agent}, res => {
      res.on('data', chunk => {
        log(chunk.toString());
      });
    });
  }
}

/**
 * A function that returns a Promise for http.get
 * @param {string} url - The URL to send the GET request to
 * @param {*} opts - The URL to send the GET request to
 * @returns {Promise<string>} - Resolves to the response body
 */
function httpGet(url, opts) {
  return new Promise((resolve, reject) => {
    http
      .get(url, opts, res => {
        let data = '';

        // Accumulate the data
        res.on('data', chunk => {
          data += chunk;
        });

        // Resolve the promise once the response ends
        res.on('end', () => {
          resolve(data);
        });
      })
      .on('error', err => {
        // Reject the promise on error
        reject(err);
      });
  });
}
