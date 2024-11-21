declare const _default: typeof XhrAdapter;
export default _default;
declare class XhrAdapter {
    constructor(config: any);
    init(config: any): void;
    request(): void;
    stream(): void;
}
