export default CanceledError;
declare function CanceledError(message?: string | undefined, config?: Object | undefined, request?: Object | undefined): CanceledError;
declare class CanceledError {
    constructor(message?: string | undefined, config?: Object | undefined, request?: Object | undefined);
    name: string;
}
