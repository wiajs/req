declare const _default: typeof HttpAdapter;
export default _default;
export type Axios = import("../core/Axios").default;
declare class HttpAdapter {
    constructor(config: any);
    isDone: boolean;
    rejected: boolean;
    req: any;
    config: any;
    maxUploadRate: number;
    maxDownloadRate: number;
    data: any;
    transport: any;
    emitter: EventEmitter<[never]>;
    noBody(code: number): boolean;
    abort(reason: any): void;
    onFinished(): void;
    onDone(value: any, isRejected: any): void;
    done(value: any, isRejected: any): void;
    init(): any;
    method: any;
    protocol: string;
    options: any;
    request(axios: Axios): Promise<any>;
}
import { EventEmitter } from 'node:events';
