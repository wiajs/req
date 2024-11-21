export default AxiosError;
declare function AxiosError(message: string, code?: string, config?: Object, request?: Object, response?: Object): Error;
declare class AxiosError {
    constructor(message: string, code?: string, config?: Object, request?: Object, response?: Object);
    stack: string;
    message: string;
    name: string;
    code: string;
    config: Object;
    request: Object;
    response: Object;
    status: any;
}
declare namespace AxiosError {
    function from(error: any, code: any, config: any, request: any, response: any, customProps: any): any;
}
