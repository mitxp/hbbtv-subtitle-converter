import sha1 from 'sha1';
import { convertEbuTtFromUrl } from './ebutt';
import { convertVTtFromUrl } from './webvtt';

export interface IRequestConfig {
  timeout: number;
  headers?: {[key: string]: string};
}


export async function processHbbTvSubtitles(video: any, reqCfg: IRequestConfig): Promise<null> {
  if (!video || typeof video !== 'object' || !video.subtitles || !video.subtitles.length) {
    return null;
  }
  for (let idx = 0; idx < video.subtitles.length; idx++) {
    const subtitles = video.subtitles[idx];
    for (const chk of subtitles.sources) {
      if (!chk.url) {
        continue;
      }
      try {
        let inlineData = null;
        const key = sha1(chk.url);
        if (video.pluginData['subtitles@tv'] && video.pluginData['subtitles@tv'][key]) {
          subtitles.inlineDataKey = key;
          break;
        }
        if (chk.kind === 'ebutt') {
          inlineData = await convertEbuTtFromUrl(chk.url, reqCfg);
        } else {
          inlineData = await convertVTtFromUrl(chk.url, reqCfg);
        }
        if (inlineData) {
          subtitles.inlineDataKey = key;
          if (!video.pluginData) {
            video.pluginData = {};
          }
          if (!video.pluginData['subtitles@tv']) {
            video.pluginData['subtitles@tv'] = {};
          }
          video.pluginData['subtitles@tv'][key] = inlineData;
          break;
        }
      } catch (ignore) {
        // try next
      }
    }
    if (!subtitles.inlineDataKey) {
      video.subtitles.splice(idx, 1);
      idx--;
    }
  }
  return null;
}
