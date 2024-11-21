import {setTimeout as delay} from 'node:timers/promises'
import {log as Log, name} from '@wiajs/log'
// import request from '@wiajs/request'
// import request from '../index.js'
// import Req from '../index.js'
import Req from '@wiajs/req'

const log = Log({env: `wia:agent:${name(import.meta.url)}`}) // __filename

main().catch(err => {
  log.err(err, 'main')
  process.exit(1)
})

async function main() {
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
  })

  // req.headers.Cookie = 'a=1;b=2;'
  req.defaults.headers.Cookie = 'a=1;b=2;'


  // 'http://www.nuoyadalu.com/',
  // 'http://www.baidu.com/',
  // 'https://www.baidu.com/',
  // 'https://www.lianlian.pub/',
  const rs = (await req.get('http://file.bunjs.pub:17247/'))?.body
  log({rs}, 'main')

  // const rs = request('http://file.bunjs.pub:17247/', {method: 'get'}, res => {
  //   let data = ''

  //   // Accumulate the data
  //   res.on('data', chunk => {
  //     data += chunk
  //   })

  //   // Resolve the promise once the response ends
  //   res.on('end', () => {
  //     log(data.toString())
  //   })

  //   res.on('error', err => {
  //     log.err(err)
  //   })
  // })
  // rs.end()

  // const cfg = _xm02 // 高效
  // await getXMao(cfg.url, cfg.orderno, cfg.secret)
  // await xmao()

  delay(1000)
}
