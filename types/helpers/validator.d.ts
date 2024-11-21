declare namespace _default {
    export { assertOptions };
    export { validators };
}
export default _default;
declare function assertOptions(options: object, schema: object, allowUnknown: boolean | null): object;
declare namespace validators {
    function transitional(validator: Function | (boolean | null), version: string | null, message: string | null): Function;
    function spelling(correctSpelling: any): (value: any, opt: any) => boolean;
}
