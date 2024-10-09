import utils from '../utils.js';
import HttpAdapter from './http.js';
import XhrAdapter from './xhr.js';
import AxiosError from '../core/AxiosError.js';

const knownAdapters = {
  http: HttpAdapter, // browser mode: httpAdapter === null
  xhr: XhrAdapter, // node mode: xhrAdapter === null
};

/**
 * define adapter's name and adapterName to http or xhr
 * browser: httpAdapter is null!
 */
utils.forEach(knownAdapters, (val, key) => {
  if (val) {
    try {
      Object.defineProperty(val, 'name', {value: key});
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(val, 'adapterName', {value: key});
  }
});

export default {
  /**
   * get http or xhr adapter
   * @param {*} adapters user pass or ['xhr', 'http']
   * @returns
   */
  getAdapter: adapters => {
    adapters = utils.isArray(adapters) ? adapters : [adapters];

    const {length} = adapters;
    let nameOrAdapter;
    let adapter;

    // find not null adapter
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      if (
        (adapter = utils.isString(nameOrAdapter)
          ? knownAdapters[nameOrAdapter.toLowerCase()]
          : nameOrAdapter)
      ) {
        break;
      }
    }

    if (!adapter) {
      if (adapter === false) {
        throw new AxiosError(
          `Adapter ${nameOrAdapter} is not supported by the environment`,
          'ERR_NOT_SUPPORT'
        );
      }

      throw new Error(
        utils.hasOwnProp(knownAdapters, nameOrAdapter)
          ? `Adapter '${nameOrAdapter}' is not available in the build`
          : `Unknown adapter '${nameOrAdapter}'`
      );
    }

    if (!utils.isFunction(adapter)) {
      throw new TypeError('adapter is not a function');
    }

    return adapter;
  },
  adapters: knownAdapters,
};
