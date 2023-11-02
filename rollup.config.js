const path = require('node:path');
const {builtinModules} = require('module');
const {fileURLToPath} = require('node:url');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');
const json = require('@rollup/plugin-json');
const {babel, getBabelOutputPlugin} = require('@rollup/plugin-babel');

const bundleSize = require('rollup-plugin-bundle-size');
const pkg = require('./package.json');

const dist = v => path.resolve(__dirname, 'dist', v);

const outputFileName = 'req';
const name = 'req';
const namedInput = path.resolve(__dirname, 'index.js');
const defaultInput = path.resolve(__dirname, 'src/req.js');

/**
 * 从 package.json 和 builtinModules 中获取不打包的引用库
 */
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.devdependencies || {}),
  ...builtinModules,
  /@babel\/runtime/, // babel helpers
];

const buildConfig = ({es5, browser = true, minifiedVersion = true, ...config}) => {
  console.log('buildConfig', {config});

  const {file} = config.output;
  const ext = path.extname(file);
  const basename = path.basename(file, ext);
  const extArr = ext.split('.');
  extArr.shift();

  const build = ({minified}) => ({
    input: namedInput,
    ...config,
    output: {
      ...config.output,
      file: `${path.dirname(file)}/${basename}.${(minified ? ['min', ...extArr] : extArr).join(
        '.'
      )}`,
    },
    plugins: [
      json(),
      resolve({browser}),
      commonjs(),
      minified && terser(),
      minified && bundleSize(),
      ...(es5
        ? [
            babel({
              babelHelpers: 'bundled',
              presets: ['@babel/preset-env'],
            }),
          ]
        : []),
      ...(config.plugins || []),
    ],
  });

  const configs = [build({minified: false})];

  if (minifiedVersion) {
    configs.push(build({minified: true}));
  }

  console.log('buildConfig', {configs});

  return configs;
};

module.exports = async () => {
  const year = new Date().getFullYear();
  const banner = `// @wiajs/req v${pkg.version} Copyright (c) ${year} ${pkg.author} and contributors`;

  return [
    // browser ESM bundle for CDN
    ...buildConfig({
      input: namedInput,
      output: {
        file: dist(`esm/${outputFileName}.js`),
        format: 'esm',
        generatedCode: {
          constBindings: true, // preferConst: true,
        },
        exports: 'named',
        banner,
      },
    }),

    // Browser UMD bundle for CDN
    ...buildConfig({
      input: defaultInput,
      es5: true,
      output: {
        file: dist(`${outputFileName}.js`),
        name,
        format: 'umd',
        exports: 'default',
        banner,
      },
    }),

    // Browser CJS bundle
    ...buildConfig({
      input: defaultInput,
      es5: false,
      minifiedVersion: false,
      output: {
        file: dist(`browser/${name}.cjs`),
        name,
        format: 'cjs',
        exports: 'default',
        banner,
      },
    }),

    // Node.js commonjs bundle
    {
      input: defaultInput,
      output: {
        file: dist(`node/${name}.cjs`),
        format: 'cjs',
        preferConst: true,
        exports: 'default',
        banner,
      },

      external,
      plugins: [
        // babelHelpers: 'bundled' | 'runtime' | 'inline' | 'external' Default: 'bundled'
        babel({babelHelpers: 'runtime', exclude: /node_modules/, sourceMaps: true}),
        // babel({babelHelpers: 'runtime', sourceMaps: true}),
        // 内部或第三方依赖库不打包，读取了 ./package.json
        resolve(), // 并入 node_modules 中的模块
        commonjs(), // cjs 转换为 es6
      ],
    },
  ];
};
