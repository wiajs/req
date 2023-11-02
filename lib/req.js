import utils from './utils.js';
import bind from './helpers/bind.js';
import Axios from './core/Axios.js';
import mergeConfig from './core/mergeConfig.js';
import defaults from './defaults/index.js';
import formDataToJSON from './helpers/formDataToJSON.js';
import CanceledError from './cancel/CanceledError.js';
import CancelToken from './cancel/CancelToken.js';
import isCancel from './cancel/isCancel.js';
import { VERSION } from './env/data.js';
import toFormData from './helpers/toFormData.js';
import AxiosError from './core/AxiosError.js';
import spread from './helpers/spread.js';
import isAxiosError from './helpers/isAxiosError.js';
import AxiosHeaders from './core/AxiosHeaders.js';

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  const context = new Axios(defaultConfig);
  const instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context, {
    allOwnKeys: true
  });

  // Copy context to instance
  utils.extend(instance, context, null, {
    allOwnKeys: true
  });

  // Factory for creating new instances
  instance.create = instanceConfig => createInstance(mergeConfig(defaultConfig, instanceConfig));
  return instance;
}

// Create the default instance to be exported
const req = createInstance(defaults);

// Expose Axios class to allow class inheritance
req.Axios = Axios;

// Expose Cancel & CancelToken
req.CanceledError = CanceledError;
req.CancelToken = CancelToken;
req.isCancel = isCancel;
req.VERSION = VERSION;
req.toFormData = toFormData;

// Expose AxiosError class
req.AxiosError = AxiosError;

// alias for CanceledError for backward compatibility
req.Cancel = req.CanceledError;

// Expose all/spread
req.all = pms => Promise.all(pms);
req.spread = spread;

// Expose isAxiosError
req.isAxiosError = isAxiosError;
req.AxiosHeaders = AxiosHeaders;
req.formToJSON = thing => formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);
req.default = req;

// this module should only have a default export
export default req;