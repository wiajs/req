const fs = require('fs');
const path = require('path');
const {extname} = path;
const zlib = require('zlib');
const {minify} = require('terser');
const rollup = require('rollup');

const env = process.env.NODE_ENV || 'development';

const isProd = env === 'production';

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

async function build(cfgs, cb) {
  for (let i = 0, len = cfgs.length; i < len; i++) {
    try {
      const cfg = cfgs[i];
      await buildEntry(cfg);
    } catch (e) {
      console.error(`build exp:${e.message}`);
    }
  }

  cb && cb();
}

/**
 * rollup warn
 * @param {*} param0
 */
function onwarn({loc, frame, message}) {
  if (loc) {
    console.warn(`${loc.file} (${loc.line}:${loc.column}) ${message}`);
    if (frame) console.warn(frame);
  } else {
    console.warn(message);
  }
}

/**
 * 根据配置输出打包文件
 * @param {*} 
 */
async function buildEntry({input, output}) {
  let bundle;
  try {
    input.onwarn = onwarn;
    bundle = await rollup.rollup(input);

    const {file, banner} = output;
    const rt = await bundle.write(output); // 写入文件
    const {code} = rt.output[0];
    report(code, file); // 文件尺寸

    // 生产输出 压缩版本
    if (output.format !== 'cjs') min(code, banner, file);
  } catch (e) {
    console.error(`buildEntry exp:${e.message}`);
  }

  if (bundle) await bundle.close();
}

/**
 * 压缩输出到文件
 * @param {*} code
 * @param {*} banner
 * @param {*} file
 * @returns
 */
async function min(code, banner, file) {
  let R = null;

  try {
    let {code: minCode} = await minify(code, {
      sourceMap: false,
      toplevel: true, // 删除顶层作用域中未引用函数和变量，默认false
      output: {
        ascii_only: true, // non-ascii字符 转为 Unicode字符，默认false
      },
      compress: {
        pure_funcs: null, // ['makeMap'], 函数仅用来返回，可摇树删除
      },
    });

    minCode = (banner ? `${banner}\n` : '') + minCode;

    // 异步写出
    const ext = path.extname(file);
    write(file.replace(ext, `.min${ext}`), minCode, true);

    R = true;
  } catch (e) {
    console.error(` exp:${e.message}`);
  }

  return R;
}

function report(code, dest, extra) {
  console.log(`${blue(path.relative(process.cwd(), dest))} ${getSize(code)}${extra || ''}`);
}

/**
 * 写入文件
 * @param {*} dest
 * @param {*} code
 * @param {*} zip
 * @returns
 */
function write(dest, code, zip) {
  return new Promise((resolve, reject) => {
    fs.writeFile(dest, code, err => {
      if (err) return reject(err);
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err);
          report(code, dest, ` (gzipped: ${getSize(zipped)})`);
          resolve();
        });
      } else {
        report(code, dest);
        resolve();
      }
    });
  });
}

function getSize(code) {
  return `${(code.length / 1024).toFixed(2)}kb`;
}

function blue(str) {
  return `\x1b[1m\x1b[34m${str}\x1b[39m\x1b[22m`;
}

module.exports = build;
