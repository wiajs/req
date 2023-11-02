/* eslint-disable prefer-destructuring */
import {setTimeout as delay} from 'timers/promises';
import {promisify} from 'node:util';
import stream from 'node:stream';
import fs from 'node:fs';
// import got from 'got';

import dayjs from 'dayjs';
import util from 'util';
import crypto from 'crypto';

import Req from '../lib/req.js';

const pipeline = promisify(stream.pipeline);

// 熊猫 1-5
const _proxy0 = {
  secret: '954ee1aef7b89bb6635e0a6ba0d6cce5', // 熊猫
  orderno: 'DT202211131057547vCyjhVw', // 动态
  // orderno: 'VGL20221114170719z7wH5gmO',
  // eslint-disable-next-line max-len
  url: 'http://pandavip.xiongmaodaili.com/xiongmao-web/apiPlus/vgl?secret=954ee1aef7b89bb6635e0a6ba0d6cce5&orderNo=VGL20221114170719z7wH5gmO&count=1&isTxt=0&proxyType=1&validTime=1&removal=1&cityIds=100000,440100,510100,200000,400000',
};

// 巨量 1-5
const _proxy1 = {
  orderno: '1493258054296757',
  secret: '528356c4a9734d81aa3355918d7467e1',
  acctSecret: 'a8f9f369dbf5455b956c6a0c1f8a8739',
  url: 'http://v2.api.juliangip.com/dynamic/getips',
};

// 巨量 5-10
const _proxy2 = {
  secret: '1822f55ef74a4e42a14bf11960864214', // 巨量 5-10
  acctSecret: 'a8f9f369dbf5455b956c6a0c1f8a8739', // 巨量
  orderno: '6928980352758641', // 巨量 5-10
  url: 'http://v2.api.juliangip.com/postpay/getips',
};

const _url = {
  init: 'https://kyfw.12306.cn/otn/leftTicket/init',
  seat: 'https://kyfw.12306.cn/otn/leftTicket/query',
  price: 'https://kyfw.12306.cn/otn/leftTicket/queryTicketPrice',
  pubPrice: 'https://kyfw.12306.cn/otn/leftTicketPrice/queryAllPublicPrice',
  // ctrip: 'https://m.ctrip.com/restapi/soa2/14666/json/GetBookingByStationV3ForPC',
  ctrip: 'https://m.ctrip.com/restapi/soa2/14666/json/GetBookingByStationV3',
  baidu: 'https://www.baidu.com/',
};

let _cookie;
let _sessionid;
let _sta;

const _proxyAuth = proxySign(_proxy0);
// const _proxyAuth = {};

// axios 实例
const req = Req.create({
  // baseURL: _url,
  timeout: 5000,
  // axios.defaults.headers 不能根据 headers 自动转换 data，请求时可以
  headers: {
    // 'Content-Type': 'application/x-www-form-urlencoded',
    // Referer: encodeURI(
    //   'https://kyfw.12306.cn/otn/leftTicket/init?linktypeid=dc&fs=重庆,CQW&ts=成都,CDW&date=2022-11-19&flag=N,Y,Y'
    // ),
    'Proxy-Authorization': _proxyAuth.auth,
  },
  withCredentials: true, // 获取 cookie
  /*   agent: {
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 1,
    maxFreeSockets: 2,
    proxy: 'http://dtan.xiongmaodaili.com:8088',
    proxyRequestOptions: {
      headers: {
        // 'Proxy-Authorization': _proxyAuth.auth,
        // 'Proxy-Authorization': 'Basic YWxhZGRpbjpvcGVuc2VzYW1l',
      },
      // ca: [fs.readFileSync('custom-proxy-cert.pem')],
    },
    rejectUnauthorized: false, // 忽略ssl证书，不安全！
  },
 */
});

main();

async function main() {
  // const rs = await init();
  // const rs = await seat();
  const rs = await pubPrice();
}

// 12306
async function pubPrice() {
  // if (!_cookie) await init();

  // if (!_cookie) return;

  const r = {
    'leftTicketDTO.train_date': '2022-12-15',
    'leftTicketDTO.from_station': 'CQW',
    'leftTicketDTO.to_station': 'CDW',
    purpose_codes: 'ADULT',
  };

  // axios.defaults.headers 不能根据 headers 自动转换 data，请求时可以
  // const rs = await req.get(_url.baidu, r);
  // This example streams the GET response of a URL to a file.
  await pipeline(req.get(_url.baidu, r), fs.createWriteStream('baidu.html'));

  // console.log('seat', {rs});
  // console.log('seat', {data: rs.data});
  // console.log('pubPrice', {body: rs.body});
  // console.log('seat', {rs: rs?.data?.result});

  // console.log('seat', `rs:${util.inspect(rs, false, 5)}`);
}

// 12306
async function init() {
  // axios.defaults.headers 不能根据 headers 自动转换 data，请求时可以
  // 'http://www.baidu.com/'  _url.init  'https://www.lianlian.pub/'
  const rs = await req.get(
    _url.init,
    // 'http://www.nuoyadalu.com/',
    // 'http://www.baidu.com/',
    // 'https://www.baidu.com/',
    // 'https://www.lianlian.pub/',
    {},
    {
      headers: {
        // 'Xiongmao-Proxy-Authorization': _proxyAuth.auth,
        'Proxy-Authorization': _proxyAuth.auth,
        // 'Xiongmao-Proxy-Authorization': `${_proxyAuth.auth}&change=true`,
      },
    }
  ); // _url.init, r); // _url.init

  console.log('init', {rs});

  // console.log('init', {headers: rs.headers});

  if (rs.headers['set-cookie']) {
    _cookie = rs.headers['set-cookie'].map(c => c.replace(/;*[ ]*[Pp]ath=.*/, '')).join(';');
    console.log('init', {_cookie});

    req.defaults.headers.Cookie = _cookie;
  }
}

// 12306
async function seat() {
  if (!_cookie) await init();

  if (!_cookie) return;

  const r = {
    'leftTicketDTO.train_date': '2022-12-11',
    'leftTicketDTO.from_station': 'CQW',
    'leftTicketDTO.to_station': 'CDW',
    purpose_codes: 'ADULT',
  };

  // axios.defaults.headers 不能根据 headers 自动转换 data，请求时可以
  const rs = await req.get(_url.seat, r);
  // This example streams the GET response of a URL to a file.
  await pipeline(got.stream('https://sindresorhus.com'), fs.createWriteStream('index.html'));

  console.log('seat', {rs});
  console.log('seat', {data: rs.data});
  console.log('seat', {body: rs.body});
  // console.log('seat', {rs: rs?.data?.result});

  // console.log('seat', `rs:${util.inspect(rs, false, 5)}`);
}

function md5(msg) {
  return crypto.createHash('md5').update(msg, 'utf8').digest('hex').toUpperCase();
}

/**
 * 代理签名
 * @param {*} r
 * @param {*} secret
 * @returns
 */
function proxySign(opt) {
  let R = null;
  try {
    const r = {
      orderno: opt.orderno,
      timestamp: Math.trunc(Date.now() / 1000),
    };
    // cosnt tx = Object.keys(r)
    //   .sort()
    //   .map(k => `${k}=${r[k]}`)
    //   .join(',');
    r.sign = md5(`orderno=${r.orderno},secret=${opt.secret},timestamp=${r.timestamp}`);
    r.auth = `sign=${r.sign}&orderno=${r.orderno}&timestamp=${r.timestamp}`;

    console.log('proxySign', {r});
    R = r;
  } catch (e) {
    console.error(`proxySign exp:${e.message}`);
  }

  return R;
}

/**
 * 代理签名
 * @param {*} r
 * @param {*} secret
 * @returns
 */
function sign(r, secret) {
  const R = {};

  try {
    // key排序
    Object.keys(r)
      .sort()
      .forEach(k => (R[k] = r[k]));

    let tx = Object.keys(r)
      .sort()
      .map(k => `${k}=${r[k]}`)
      .join('&');
    tx += `&key=${secret}`;

    R.sign = md5(tx).toLowerCase();

    console.log('sign', {R, r, tx});
  } catch (e) {
    console.error(`sign exp:${e.message}`);
  }

  return R;
}
