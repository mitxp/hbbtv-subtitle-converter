export interface IRequestConfig {
    timeout: number;
    headers?: {
        [key: string]: string;
    };
}
export declare function processHbbTvSubtitles(video: any, reqCfg: IRequestConfig): Promise<null>;
