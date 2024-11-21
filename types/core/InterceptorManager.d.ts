export default InterceptorManager;
declare class InterceptorManager {
    handlers: any[];
    use(fulfilled: Function, rejected: Function, options: any): number;
    eject(id: number): boolean;
    clear(): void;
    forEach(fn: Function): void;
}
