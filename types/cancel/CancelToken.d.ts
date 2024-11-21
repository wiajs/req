export default CancelToken;
declare class CancelToken {
    static source(): {
        token: CancelToken;
        cancel: undefined;
    };
    constructor(executor: any);
    promise: Promise<any>;
    throwIfRequested(): void;
    subscribe(listener: any): void;
    _listeners: any[];
    unsubscribe(listener: any): void;
    toAbortSignal(): AbortSignal;
}
