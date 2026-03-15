export interface Redis {
    distribution: string;
    version: string;
}
export declare function getRedis(distribution: string, version: string): Promise<string>;
