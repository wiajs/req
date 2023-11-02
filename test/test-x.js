const crypto = require('crypto');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const util = require('util');
const FormData = require('form-data');

const Req = require('@wiajs/req');

const _url = 'http://gateway.test.hh.ifebs.cn'; // gateway.hh.ifebs.cn
const _appid = '202211031037694740105003008'; // 应用id，不变
const _pid = '1588017023743561728'; // merchantOrderNo
const _secret = '1a636530a3cc426aa51964e2097b43d8'; // 分配不同公司的密钥，需保密！！！

dayjs.extend(utc);

// req 实例
const req = Req.create({
  // baseURL: _url,
  timeout: 10000,
  // headers: {'Content-Type': 'application/x-www-form-urlencoded'},
});

function md5(msg) {
  return crypto.createHash('md5').update(msg, 'utf8').digest('hex');
}

/**
 * DES 加密
 * DES 加密模式有：
 * Electronic Codebook(ECB),
 * Cipher Block Chaining(CBC),
 * Cipher Feedback(CFB), Output Feedback(OFB)
 * 这里以密文分组链接模式 CBC 为例，使用了相同的 key 和 iv
 * @param {*} msg
 * @param {*} key
 * @returns
 */
function des(msg, key) {
  let R = '';
  try {
    key = key.length >= 8 ? key.slice(0, 8) : key.concat('0'.repeat(8 - key.length));
    const keyHex = Buffer.from(key);
    const cipher = crypto.createCipheriv('des-cbc', keyHex, keyHex);
    cipher.setAutoPadding(true); // default true
    R = cipher.update(msg, 'utf8', 'base64'); // 'hex'
    R += cipher.final('base64'); // 'hex'
    console.log('des', {msg, R});
  } catch (e) {
    console.error(`des exp:${e.message}`);
  }

  return R;
}

// DES 解密
function desDec(text, key) {
  key = key.length >= 8 ? key.slice(0, 8) : key.concat('0'.repeat(8 - key.length));
  const keyHex = new Buffer(key);
  const cipher = crypto.createDecipheriv('des-cbc', keyHex, keyHex);
  let c = cipher.update(text, 'base64', 'utf8');
  c += cipher.final('utf8');
  return c;
}

/**
 * 加密
 * @param datasource byte[] * @param password String 加密密钥
 * @return byte[] */
function desEncode(datasource, password) {
  try {
    const random = new SecureRandom();
    const desKey = new DESKeySpec(password.getBytes());
    const keyFactory = SecretKeyFactory.getInstance('DES');
    const securekey = keyFactory.generateSecret(desKey);
    // Cipher 对象实际完成加密操作
    const cipher = Cipher.getInstance('DES');
    // 用密匙初始化 Cipher 对象,ENCRYPT_MODE 用于将 Cipher 初始化为加密模式的常量
    cipher.init(Cipher.ENCRYPT_MODE, securekey, random); //现在，获取数据并加密
    // 按单部分操作加密或解密数据 ，或者结束一个多部分操作
    return cipher.doFinal(datasource);
  } catch (ex) {
    ex.printStackTrace();
  }
  return null;
}

/**
 * 测试主程序
 */
async function main() {
  const rs = await recharge('18605812888', 50);
  await queryOrder(rs.orderNo, '18605812888'); // 1

  // await recharge('13926002609');
  // await recharge('13360010805');
  // await queryOrder('221205010759001', '13926002609'); // 1
  // await queryOrder('221205011558001', '18605812888'); // 3
  // await queryOrder('221205102251001', '13360010805'); // 1
  // await queryAmount();
  // queryBill({pageIndex: 1, pageSize: 10, startDate: '2022-12-05', endDate: '2022-12-06'});
}

main();

/**
 * 充值
 */
async function recharge(mobile, val) {
  let R = false;

  try {
    let isp = '';

    if (/^139\d{8}/.test(mobile)) isp = 'mobile';
    else if (/^186\d{8}/.test(mobile)) isp = 'unicom';
    else if (/^133\d{8}/.test(mobile)) isp = 'telecom';

    if (!isp) return false;

    const d = {
      merchantOrderNo: dayjs().format('YYMMDDHHmmss001'),
      mobile, // : des(mobile, _secret),
      value: val, // 50、100、200、300、500
      merchantNo: _pid,
      isp, // telecom 电信, mobile 移动, unicom 联通
    };

    const r = sign(d, 'topup.mobile.single', _secret);
    console.log('recharge', {r});

    /**
     * 使用 x-www-form-urlencoded(data auto URLSearchParams)
     */
    const rs = (await req.post(_url, r)).body;
    // console.log('recharge', {rs});
    console.log('recharge', {rs});
    if (rs.code === '10000') {
      const {orderNo: partyNo, amount: remain, expend: spend, status} = rs.data;
      // console.log('recharge', `rs:${util.inspect(rs, false, 5)}`);
      R = {code: 200, orderNo: d.merchantOrderNo, partyNo, remain, spend, status};
    } else R = {code: rs.code, msg: rs.message, orderNo: d.merchantOrderNo};
  } catch (e) {
    console.log(`recharge exp:${e.message}`);
  }

  return R;
}

/**
 * 查询订单详情
 * @param {*} orderNo 客户端订单号
 * @param {*} mobile 手机号
 */
async function queryOrder(orderNo, mobile) {
  try {
    const d = {
      mobile,
      merchantOrderNo: orderNo,
      merchantNo: _pid,
    };

    const r = sign(d, 'topup.mobile.query', _secret);
    console.log('queryOrder', {r});

    const rs = (await req.post(`${_url}`, r))?.data;
    // console.log('queryOrder', {rs});

    console.log('queryBill', `rs:${util.inspect(rs, false, 5)}`);
  } catch (e) {
    console.log(`queryOrder exp:${e.message}`);
  }
}

/**
 * 查询商户余额
 */
async function queryAmount() {
  try {
    const d = {
      merchantNo: _pid,
    };

    const r = sign(d, 'merchant.amount.query', _secret);
    console.log('queryAmount', {r});

    const rs = (await req.post(`${_url}`, r))?.body;
    console.log('queryAmount', {rs});

    // console.log('recharge', `rs:${util.inspect(rs, false, 5)}`);
  } catch (e) {
    console.log(`queryAmount exp:${e.message}`);
  }
}

/**
 * 查询商户账单
 */
async function queryBill(opt) {
  try {
    const d = {
      pageIndex: opt.pageIndex,
      pageSize: opt.pageSize,
      startDate: opt.startDate,
      endDate: opt.endDate,
      merchantNo: _pid,
    };

    const r = sign(d, 'merchant.bill.query', _secret);
    console.log('queryAmount', {r});

    const rs = (await req.post(`${_url}`, r))?.data;
    // console.log('queryBill', {rs});

    console.log('queryBill', `rs:${util.inspect(rs, false, 5)}`);
  } catch (e) {
    console.log(`queryBill exp:${e.message}`);
  }
}

/**
 * 签名
 * @param {*} d
 * @param {*} secret
 * @returns
 */
function sign(d, method, secret) {
  const R = {};

  if (!d || !method) return null;

  const r = {
    biz_content: JSON.stringify(d),
    app_id: _appid, // 应用id
    charset: 'utf-8',
    format: 'json',
    method,
    // method: 'merchant.amount.query',
    sign_type: 'md5',
    timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    version: '1.0',
  };

  // key排序
  Object.keys(r)
    .sort()
    .forEach(k => (R[k] = r[k]));

  // 生成签名所需字符串
  const s = Object.keys(r)
    .sort()
    .map(k => `${k}${r[k]}`)
    .join('');
  R.sign = md5(`${secret}${s}${secret}`).toUpperCase();

  // console.log('sign', {R, s, secret});

  return R;
}
