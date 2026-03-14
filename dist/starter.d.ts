export interface Options {
    confPath: string;
    redisPath: string;
    port: number;
    tlsPort: number;
    configure: string;
}
export declare function startRedis(opts: Options): Promise<void>;
