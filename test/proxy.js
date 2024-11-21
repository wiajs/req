import {setTimeout as delay} from 'node:timers/promises'
import crypto from 'node:crypto'
// import axios from 'axios'
import req from '../req'
import {log as Log, name} from './log.js'

const log = Log({env: `wia:agent:${name(__filename)}`})

const cfg = {
  // url: 'http://v2.api.juliangip.com/dynamic/getips',
  // url: 'http://v2.api.juliangip.com/company/postpay/getips',
  url: 'http://v2.api.juliangip.com/postpay/getips',
  user: '18605812888',
  pwd: 'df89-TQe23_dPEty',
  // secret: '5666b407e7664a2cb15aa3f6e8222ceb',
  secret: 'fa4286d229b94b92b8277f9bb81f88dc',
}

/**
 * 获取熊猫ip代理
 * @param {string} url
 * @param {string} orderno
 * @param {string} secret
 * http://pandavip.xiongmaodaili.com/xiongmao-web/sdApi/sdl?
 * {"code":"0","msg":"ok",
 * "obj":[{"password":"xmdl76d7","port":"45420","ip":"58.220.27.211","account":"xmdl2950"}],
 * "errno":0,"data":[null]}
 * @returns
 */
async function getXMao(url, orderno, secret) {
  let R = null

  try {
    const params = {
      secret: secret,
      orderNo: orderno,
      count: 1, // ip 数量
      isTxt: 0, // json
      proxyType: 1, // 1：HTTP代理[默认] 2：SOCK代理
      noTime: 1,
      removal: 1, // 0：智能去重 1: 24小时去重
      validTime: 1, // 有效时间
      cityIds: '400000', // 邮政编码
      returnAccount: 1, // 2 返回账户、密码
    }

    // log({url, params}, 'getXMao')
    const rs = (await req.get(url, params))?.data
    log({rs}, 'getXMao')

    if (rs.code === '0' && rs?.obj?.length) {
      const list = rs.obj
      // console.log('getProxy', {list})
      const {ip, port, validTime: time} = list[0]
      R = {ip, port, host: `${ip}:${port}`, time}
      R.port = Number.parseInt(R.port)
    }

    log({R}, 'getXMao')
  } catch (e) {
    log.err(e, 'getXMao')
  }

  return R
}

/**
 * 获取ip代理
 * @param {string} orderno
 * @returns
 */
async function getProxy(orderno) {
  let R = null

  try {
    // 巨量
    // http://v2.api.juliangip.com/postpay/getips?area=%E9%87%8D%E5%BA%86&auto_white=1&city_name=1&ip_remain=1&num=1&pt=2&result_type=json2&trade_no=6876598927708057&sign=45ead7e2751210c39d5b3db92613a745
    const r = {
      trade_no: orderno,
      auto_white: 1,
      num: 1, // ip 数量
      pt: 2, // 1：HTTP代理[默认] 2：SOCK代理
      area: '重庆', // '北京,上海,广州,深圳,重庆,成都',
      // city_code: 1,
      city_name: 1, // IP归属城市名称
      ip_remain: 1, // IP剩余可用时长（秒）
      // filter: 1, // 过滤当天ip
      result_type: 'json2', // 'json',
      // split: 3, // 空格分隔
    }

    const params = sign(r, cfg.secret)

    const rs = (await axios.get(cfg.url, {params}))?.data
    if (rs.code === 200 && rs?.data?.count) {
      const list = rs.data.proxy_list
      // console.log('getProxy', {list})
      const {city_name: city, ip, port, ip_remain: time} = list[0]
      R = {city, ip, port, host: `${ip}:${port}`, time}
    }

    // http://pandavip.xiongmaodaili.com/xiongmao-web/sdApi/sdl?secret=8b807518978253cca4892ba86af508d6&orderNo=SDL20241001063047nlblR2A5&count=10&isTxt=0&proxyType=1&noTime=1&removal=0&provinceIds=400000&cityIds=400000&returnAccount=1
    // const rs = (await axios.get(opt.url)).data
    // // 熊猫
    // if (rs.code === '0' && rs.obj.length) {
    //   R = {
    //     ip: rs.obj[0].ip,
    //     port: Number.parseInt(rs.obj[0].port, 10),
    //     time: rs.obj[0].validTime,
    //   }
    //   R.url = `http://${R.ip}:${R.port}`
    // }

    log({R}, 'getProxy')
  } catch (e) {
    log.err(e, 'getProxy')
  }

  return R
}

/**
 * 巨量签名
 * @param {*} r
 * @param {*} secret
 * @returns
 */
function sign(r, secret) {
  /** @type {*} */
  const R = {}

  try {
    for (const k of Object.keys(r).sort()) R[k] = r[k]

    let tx = Object.keys(r)
      .sort()
      .map(k => `${k}=${r[k]}`)
      .join('&')
    tx += `&key=${secret}`

    R.sign = md5(tx).toLowerCase()

    // log({r, R, tx}, 'sign')
  } catch (e) {
    log.err(e, 'sign')
  }

  return R
}

/**
 * 熊猫代理签名
 * @param {string} orderno
 * @param {string} secret
 * @returns
 */
function proxyAuth(orderno, secret) {
  let R
  try {
    const timestamp = Math.trunc(Date.now() / 1000)
    const sign = md5(`orderno=${orderno},secret=${secret},timestamp=${timestamp}`)
    R = `sign=${sign}&orderno=${orderno}&timestamp=${timestamp}`
    log({R}, 'proxyAuth')
  } catch (e) {
    log.err(e, 'proxyAuth')
  }

  return R
}

/**
 *
 * @param {string} msg
 * @returns
 */
function md5(msg) {
  return crypto.createHash('md5').update(msg, 'utf8').digest('hex').toUpperCase()
}

export {getProxy, getXMao, proxyAuth}
