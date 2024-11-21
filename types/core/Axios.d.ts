export default Axios;
declare class Axios {
    constructor(instanceConfig: any);
    defaults: any;
    config: any;
    interceptors: {
        request: InterceptorManager;
        response: InterceptorManager;
    };
    init(): void;
    request(configOrUrl: string | Object, config: Object | null): Promise<any>;
    _request(configOrUrl: any, config: any, stream?: boolean): Promise<any>;
    stream(configOrUrl: any, config: any): Promise<any>;
    getUri(config: any): string;
}
import InterceptorManager from './InterceptorManager.js';
