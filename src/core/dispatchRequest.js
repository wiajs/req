import transformData from './transformData.js';
import isCancel from '../cancel/isCancel.js';
import defaults from '../defaults/index.js';
import CanceledError from '../cancel/CanceledError.js';
import AxiosHeaders from './AxiosHeaders.js';
import adapters from '../adapters/adapters.js';
/**
 * Throws a `CanceledError` if cancellation has been requested.
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */ function throwIfCancellationRequested(config) {
    if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
    }
    if (config.signal && config.signal.aborted) {
        throw new CanceledError(null, config);
    }
}
/**
 * Dispatch a request to the server using the configured adapter.
 * 请求如有异常，需向外抛出异常，不拦截
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise<*>} The Promise to be fulfilled
 */ export default function dispatchRequest(config) {
    let R;
    throwIfCancellationRequested(config);
    config.headers = AxiosHeaders.from(config.headers);
    // Transform request data
    config.data = transformData.call(config, config.transformRequest);
    if ([
        'post',
        'put',
        'patch'
    ].indexOf(config.method) !== -1) {
        config.headers.setContentType('application/x-www-form-urlencoded', false);
    }
    const Adapter = adapters.getAdapter(config.adapter || defaults.adapter);
    const adapter = new Adapter(config);
    if (config.stream) R = adapter.request(this);
    else {
        R = adapter.request(this).then((response)=>{
            throwIfCancellationRequested(config);
            // Transform response data
            response.data = transformData.call(config, config.transformResponse, response);
            // ! body === data
            Object.defineProperty(response, 'body', {
                get () {
                    return response.data;
                }
            });
            // if (response.data && !response.body) response.body = response.data
            response.headers = AxiosHeaders.from(response.headers);
            return response;
        }, (reason)=>{
            if (!isCancel(reason)) {
                throwIfCancellationRequested(config);
                // Transform response data
                if (reason && reason.response) {
                    reason.response.data = transformData.call(config, config.transformResponse, reason.response);
                    // body === data
                    if (reason.response.data && !reason.response.body) reason.response.body = reason.response.data;
                    reason.response.headers = AxiosHeaders.from(reason.response.headers);
                }
            }
            return Promise.reject(reason);
        });
    }
    return R;
}
