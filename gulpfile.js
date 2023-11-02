const gulp = require('gulp');
const fs = require('fs-extra');
const build = require('./script/build');
const configs = require('./script/config');
// const exec = require('exec-sh');

const nodeEnv = process.env.NODE_ENV || 'development';
const src = './src';
const out = './dist';

console.log(`env:${nodeEnv} src:${src} out:${out}`);

if (!fs.existsSync(out)) {
  fs.mkdirSync(out);
}

/**
 * 删除已有发布文件，全部重新生成
 * @returns
 */
async function clean(cb) {
  // const toRemove = ['*.map'].map(cmd => `rm -rf ${cmd}`);
  // await exec.promise(`cd dist && ${toRemove.join(' && ')}`);
  await fs.emptyDir('./dist/');
  cb && cb();
}

// const clear = gulp.task('clear', async function () {
//   await fs.emptyDir('./dist/');
// });

/**
 * 同时生成umd、cjs、es 三种格式输出文件
 */
const buildAll = gulp.series(clean, cb => {
  console.log('start build ...');
  build(configs, cb);
});

/**
 * 仅生成cjs 格式
 */
gulp.task('cjs', cb => {
  console.log('start cjs...');
  // filter configs
  const cfg = configs.filter(c => c.output.format === 'cjs');
  build(cfg, cb);
});

/**
 * 仅生成 es 格式
 */
gulp.task('esm', cb => {
  console.log('start esm...');
  // filter configs
  const cfg = configs.filter(c => c.output.format === 'es');
  build(cfg, cb);
});

/**
 * 仅生成 umd 格式
 */
gulp.task('umd', cb => {
  console.log('start umd...');
  // filter configs
  const cfg = configs.filter(c => c.output.format === 'umd');
  build(cfg, cb);
});

gulp.task('watch', () => {
  gulp.watch(`${src}/*.js`, gulp.series(['build']));
});

gulp.task('default', async function () {
  console.log('hello!');
});

const bower = gulp.task('bower', async function () {
  const npm = JSON.parse(await fs.readFile('package.json'));
  const bower = JSON.parse(await fs.readFile('bower.json'));

  const fields = ['name', 'description', 'version', 'homepage', 'license', 'keywords'];

  for (let i = 0, l = fields.length; i < l; i++) {
    const field = fields[i];
    bower[field] = npm[field];
  }

  await fs.writeFile('bower.json', JSON.stringify(bower, null, 2));
});

async function getContributors(user, repo, maxCount = 1) {
  const contributors = [];
  /*   (
    await req.get(
      `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(
        repo
      )}/contributors`,
      {params: {per_page: maxCount}}
    )
  ).data;
 */
  return Promise.all(
    contributors.map(async contributor => {
      return {
        ...contributor,
        ...(await req.get(`https://api.github.com/users/${encodeURIComponent(contributor.login)}`))
          .data,
      };
    })
  );
}

const packageJSON = gulp.task('package', async function () {
  const CONTRIBUTION_THRESHOLD = 3;

  const npm = JSON.parse(await fs.readFile('package.json'));

  try {
    const contributors = await getContributors('axios', 'axios', 15);

    npm.contributors = contributors
      .filter(
        ({type, contributions}) =>
          type.toLowerCase() === 'user' && contributions >= CONTRIBUTION_THRESHOLD
      )
      .map(({login, name, url}) => `${name || login} (https://github.com/${login})`);

    await fs.writeFile('package.json', JSON.stringify(npm, null, 2));
  } catch (err) {
    if (req.isAxiosError(err) && err.response && err.response.status === 403) {
      throw Error(`GitHub API Error: ${err.response.data && err.response.data.message}`);
    }
    throw err;
  }
});

const env = gulp.task('env', async function () {
  var npm = JSON.parse(await fs.readFile('package.json'));

  await fs.writeFile(
    './lib/env/data.js',
    Object.entries({
      VERSION: npm.version,
    })
      .map(([key, value]) => {
        return `export const ${key} = ${JSON.stringify(value)};`;
      })
      .join('\n')
  );
});

const version = gulp.series('bower', 'env', 'package');

module.exports = {build: buildAll, bower, env, version, packageJSON};
