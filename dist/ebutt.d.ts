import { IRequestConfig } from './main';
export interface ISubtitles {
    styles: {
        [key: string]: ISubtitleStyle;
    };
    regions: {
        [key: string]: ISubtitleRegion;
    };
    subtitles: ISubtitleText[];
}
export interface ISubtitleStyle {
    fgcol: string;
    bgcol?: string;
    align?: string;
}
export interface ISubtitleRegion {
    align: string;
}
export interface ISubtitleText {
    begin: number;
    end: number;
    region: string;
    style: string;
    tt: ISubtitleTextPart[];
}
export interface ISubtitleTextPart {
    style?: string;
    text: string;
}
export declare function validateChars(txt: string, validchars: string): string;
export declare function convertEbuTtFromUrl(url: string, reqcfg: IRequestConfig): Promise<ISubtitles>;
