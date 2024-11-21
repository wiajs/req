declare const _default: {
    isNode: boolean;
    classes: {
        URLSearchParams: typeof import("url").URLSearchParams;
        FormData: typeof import("form-data");
        Blob: {
            new (blobParts?: BlobPart[], options?: BlobPropertyBag): Blob;
            prototype: Blob;
        };
    };
    protocols: string[];
    hasBrowserEnv: boolean;
    hasStandardBrowserWebWorkerEnv: boolean;
    hasStandardBrowserEnv: boolean;
    navigator: Navigator;
    origin: string;
};
export default _default;
