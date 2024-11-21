export default AxiosTransformStream;
declare class AxiosTransformStream extends stream.Transform {
    constructor(options: any);
    _read(size: any): void;
    _transform(chunk: any, encoding: any, callback: any): void;
    [kInternals]: {
        timeWindow: any;
        chunkSize: any;
        maxRate: any;
        minChunkSize: any;
        bytesSeen: number;
        isCaptured: boolean;
        notifiedBytesLoaded: number;
        ts: number;
        bytes: number;
        onReadCallback: any;
    };
}
import stream from 'stream';
declare const kInternals: unique symbol;
