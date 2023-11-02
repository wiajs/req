/**
 * console 日志输出封装
 */
export default class Log {
  /**
   * 构造函数
   * @param {*} opts {
   *  pre: 前缀，一般是模块名称,
   *  env: NODE_DEBUG 环境变量
   * }
   */
  constructor(opts) {
    const {
      pre,
      env
    } = opts;
    this.pre = pre !== null && pre !== void 0 ? pre : '';
    this.env = env !== null && env !== void 0 ? env : '';
    let debug = process.env.NODE_DEBUG;
    if (debug && env) {
      debug = debug.replaceAll(/\s*,\s*|\s*，\s*|\s+/g, ',');
      const debugs = debug.split(',');
      this.debugEnv = debugs.some(v => {
        v = v.trim().replaceAll('.', '[.]').replaceAll('*', '\\w*');
        const reg = new RegExp(`\\b${v}\\b`, 'i');
        return reg.test(env);
      });
    }
  }
  debug(...args) {
    if (this.debugEnv) {
      if (typeof (args === null || args === void 0 ? void 0 : args[0]) === 'string') {
        args[0] = `${this.pre}:${args[0]}`;
        console.debug(...args);
      } else if (typeof (args === null || args === void 0 ? void 0 : args[0]) === 'object') console.debug(this.pre, ...args);
    }
  }
  error(...args) {
    if (typeof (args === null || args === void 0 ? void 0 : args[0]) === 'string') {
      args[0] = `${this.pre}:${args[0]}`;
      console.error(...args);
    } else if (typeof (args === null || args === void 0 ? void 0 : args[0]) === 'object') console.error(this.pre, ...args);
  }
  warn(...args) {
    if (typeof (args === null || args === void 0 ? void 0 : args[0]) === 'string') {
      args[0] = `${this.pre}:${args[0]}`;
      console.warn(...args);
    } else if (typeof (args === null || args === void 0 ? void 0 : args[0]) === 'object') console.warn(this.pre, ...args);
  }
  info(...args) {
    if (this.debug) {
      if (typeof (args === null || args === void 0 ? void 0 : args[0]) === 'string') {
        args[0] = `${this.pre}:${args[0]}`;
        console.info(...args);
      } else if (typeof (args === null || args === void 0 ? void 0 : args[0]) === 'object') console.info(this.pre, ...args);
    }
  }
}