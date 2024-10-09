import speedometer from './speedometer.js';
import throttle from './throttle.js';
import utils from '../utils.js';
/**
 *
 * @param {*} listener
 * @param {*} isDownloadStream
 * @param {*} freq
 * @returns
 */ export const progressEventReducer = (listener, isDownloadStream, freq = 3)=>{
    let bytesNotified = 0;
    const _speedometer = speedometer(50, 250);
    return throttle((e)=>{
        const loaded = e.loaded;
        const total = e.lengthComputable ? e.total : undefined;
        const progressBytes = loaded - bytesNotified;
        const rate = _speedometer(progressBytes);
        const inRange = loaded <= total;
        bytesNotified = loaded;
        const data = {
            loaded,
            total,
            progress: total ? loaded / total : undefined,
            bytes: progressBytes,
            rate: rate ? rate : undefined,
            estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
            event: e,
            lengthComputable: total != null,
            [isDownloadStream ? 'download' : 'upload']: true
        };
        listener(data);
    }, freq);
};
/**
 *
 * @param {*} total
 * @param {*} throttled
 * @returns
 */ export const progressEventDecorator = (total, throttled)=>{
    const lengthComputable = total != null;
    return [
        (loaded)=>throttled[0]({
                lengthComputable,
                total,
                loaded
            }),
        throttled[1]
    ];
};
/**
 *
 * @param {*} fn
 * @returns
 */ export const asyncDecorator = (fn)=>(...args)=>utils.asap(()=>fn(...args));
