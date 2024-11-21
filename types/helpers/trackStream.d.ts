export function streamChunk(chunk: any, chunkSize: any): Generator<any, void, unknown>;
export function readBytes(iterable: any, chunkSize: any): AsyncGenerator<any, void, unknown>;
export function trackStream(stream: any, chunkSize: any, onProgress: any, onFinish: any): ReadableStream<Uint8Array>;
