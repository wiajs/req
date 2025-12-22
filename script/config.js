import {builtinModules} from 'node:module' // node 内部库
import path from 'node:path'
import {fileURLToPath} from 'node:url'
// import babel from '@rollup/plugin-babel'; // 编译转换ES6语法
import commonjs from '@rollup/plugin-commonjs' // CommonJS 模块转换成 ES6
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve' // 导入node_modules 中的 CommonJS 模块
import replace from '@rollup/plugin-replace' // 替换待打包文件里的一些变量，如 process在浏览器端是不存在的，需要被替换
import swc from '@rollup/plugin-swc' // 编译转换ES6语法
import autoExternal from 'rollup-plugin-auto-external'

import {getJsOpt} from './swc.js'

import pkg from '../package.json' with {type: 'json'}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const version = process.env.VERSION || pkg.version
const name = 'req' // umd 模式下的全局变量名

const banner = `/*!
  * @wia/req v${version}
  * (c) 2024-${new Date().getFullYear()} Sibyl Yu, Matt Zabriskie and contributors
  * Released under the MIT License.
  */`.replace('2024-2024', '2024')

const env = process.env.NODE_ENV || 'development'
const isDev = env !== 'production'

const dir = _path => path.resolve(__dirname, '../', _path)

const input = dir('./src/req.js')
const esmInput = dir('./src/index.js')

/**
 * 从 package.json 和 builtinModules 中获取不打包的引用库
 * 生成 node cjs 库时需要
 * umd 全部打包，不需要
 */
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.devdependencies || {}),
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
  /@babel\/runtime/, // babel helpers  @babel/runtime-corejs3/
]

const configs = [
  {
    input,
    file: dir('dist/web/req.cjs'), // cjs格式，web打包，合并引用
    format: 'cjs',
    exports: 'default', // 自动处理默认导出 auto 或 'default' named
    browser: true,
    external: [],
  },
  {
    input: esmInput,
    file: dir('dist/web/req.mjs'), // esm格式，web打包，合并引用
    format: 'esm',
    exports: 'named', // 名称方式输出各个子模块
    browser: true,
    external: [],
  },
  {
    input,
    file: dir('dist/req.js'), // umd格式，es5语法，web直接加载，合并引用
    format: 'umd',
    browser: true,
    es6: true,
    name, // 全局名称，替换 window.name
    exports: 'default', // default 方式输出单一包
    external: [],
  },
].map(genConfig)

// Node.js commonjs bundle
const cjscfg = {
  input: {
    input,
    external,
    plugins: [
      autoExternal(),
      resolve(),
      // 根据需要，将es6 转换为 es5，兼容所有浏览器，依赖@babel/runtime-corejs3 polyfill
      swc({swc: getJsOpt(false, false)}),
      commonjs(),
    ],
  },
  output: {
    file: dir('dist/node/req.cjs'), // cjs格式，后端打包，保留引用
    format: 'cjs',
    sourcemap: isDev,
    exports: 'default', // auto 确保 default 和 named exports 都支持
    // interop: 'auto', // 自动生成适配 default 和 named，default和named混合包需要
    banner,
    generatedCode: {
      constBindings: true, // var -> const
    },
  },
}

configs.unshift(cjscfg)

/**
 * 输出配置文件，只支持input 和 output，其他如 plugins、external 无效
 * plugins、external 放入 input，只针对input文件起作用，否则全局起作用
 * @param {*} param0
 * @returns
 */
function genConfig({input, browser = false, es6 = true, ...cfg}) {
  const config = {
    input: {
      input,
      external: cfg.external, // 外部变量，不打入包中
      // 插件，从上向下顺序执行
      plugins: [
        // node_modules 中超ES6已转换为ES6
        resolve({browser}), // 从 node_modules 合并文件，pkg的browser文件替换 mainFields: ['browser']
        json(), // 加载json文件
        // 替换特定字符串
        replace({
          preventAssignment: true, // 避免赋值替换  xxx = false -> false = false
          'process.env.NODE_ENV': JSON.stringify(env),
          'process.env.NODE_TEST': JSON.stringify('false'),
          'process.browser': !!browser,
          __VERSION__: version,
        }),
        // 根据需要，将es6 转换为 es5，兼容所有浏览器，依赖@babel/runtime-corejs3 polyfill
        es6 && swc({swc: getJsOpt(false, false)}),
        // 最后再把三方 CJS 转成 ESM 给 Rollup
        commonjs(), // common 转换为 es6，rollup 只支持 es6
      ],
    },
    output: {
      file: cfg.file,
      format: cfg.format,
      sourcemap: isDev,
      banner,
      // name: '$$', // $ 会覆盖 window.$
      name: cfg.name ?? undefined,
      exports: cfg.exports ?? 'auto',
      globals: {}, // 全局变量
      generatedCode: {
        constBindings: cfg.format !== 'umd', // var -> const
      },
    },
  }

  return config
}

export default configs
