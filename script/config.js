const path = require('path');
const {builtinModules} = require('node:module'); // node 内部库
const babel = require('@rollup/plugin-babel'); // 编译转换ES6语法
const commonjs = require('@rollup/plugin-commonjs'); // CommonJS 模块转换成 ES6
const resolve = require('@rollup/plugin-node-resolve'); // 导入node_modules 中的 CommonJS 模块
const replace = require('@rollup/plugin-replace'); // 替换待打包文件里的一些变量，如 process在浏览器端是不存在的，需要被替换
const json = require('@rollup/plugin-json');
const pkg = require('../package.json');

const version = process.env.VERSION || pkg.version;
const name = 'req';

const banner = `/*!
  * @wia/req v${version}
  * (c) 2022-${new Date().getFullYear()} Sibyl Yu, Matt Zabriskie and contributors
  * Released under the MIT License.
  */`.replace('2022-2022', '2022');

const env = process.env.NODE_ENV || 'development';
const isDev = env !== 'production';

const dir = _path => path.resolve(__dirname, '../', _path);

const input = dir('./lib/req.js');
const esmInput = dir('./index.js');

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
];

module.exports = [
  {
    file: dir('dist/node/req.cjs'), // cjs格式，后端打包，保留引用
    format: 'cjs',
    browser: false,
    external,
  },
  {
    input: esmInput,
    file: dir('dist/node/req.mjs'), // esm格式，后端打包，保留引用
    format: 'esm',
    exports: 'named', // 名称方式输出各个子模块
    browser: false,
    external,
  },
  {
    file: dir('dist/web/req.cjs'), // cjs格式，web打包，合并引用
    format: 'cjs',
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
    file: dir('dist/req.js'), // umd格式，es5语法，web直接加载，合并引用
    format: 'umd',
    browser: true,
    es5: true,
    name, // 全局名称，替换 window.name
    exports: 'default', // default 方式输出单一包
    external: [],
  },
  // {
  //   file: dir('dist/req.esm.js'),
  //   format: 'es',
  // },
].map(genConfig);

/**
 * 输出配置文件，只支持input 和 output，其他如 plugins、external 无效
 * plugins、external 需放入 input
 * @param {*} param0
 * @returns
 */
function genConfig({browser = true, es5 = false, ...cfg}) {
  // console.log('getConfig', {browser, cfg});
  const config = {
    input: {
      input: cfg.input ?? input,
      external: cfg.external, // 外部变量，不打入包中
      // 插件，从上向下顺序执行
      plugins: [
        // node_modules 中超ES6已转换为ES6
        resolve({browser}), // 从 node_modules 合并文件，pkg的browser文件替换 mainFields: ['browser']
        commonjs(), // common 转换为 es6
        // json(), // 加载json文件
        // 替换特定字符串
        replace({
          preventAssignment: true, // 避免赋值替换  xxx = false -> false = false
          'process.env.NODE_ENV': JSON.stringify(env),
          'process.browser': !!browser,
          __VERSION__: version,
        }),
        // 使用 babel 将es6 转换为 es5，兼容所有浏览器，需@babel/runtime-corejs3
        es5 &&
          // babel({babelHelpers: 'bundled', presets: ['@babel/preset-env']}),
          babel({
            // 'bundled' | 'runtime' | 'inline' | 'external' Default: 'bundled'
            babelHelpers: 'runtime', // 需配置plugin-transform-runtime
            // sourceMaps: isDev,
            configFile: dir('babel.web.js'),
          }),
      ],
    },
    output: {
      file: cfg.file,
      format: cfg.format,
      sourcemap: true, // isDev,
      banner,
      // name: '$$', // $ 会覆盖 window.$
      name: cfg.name ?? undefined,
      exports: cfg.exports ?? 'auto',
      globals: {}, // 全局变量
      generatedCode: {
        constBindings: cfg.format !== 'umd', // var -> const
      },
    },
  };

  // console.log('getConfig', {output: config.output, plutins: config.input.plugins});
  return config;
}