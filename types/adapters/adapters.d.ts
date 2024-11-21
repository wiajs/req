declare namespace _default {
    export function getAdapter(adapters: any): any;
    export { knownAdapters as adapters };
}
export default _default;
declare namespace knownAdapters {
    export { HttpAdapter as http };
    export { XhrAdapter as xhr };
}
import HttpAdapter from './http.js';
import XhrAdapter from './xhr.js';
