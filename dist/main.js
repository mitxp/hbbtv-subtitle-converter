"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processHbbTvSubtitles = void 0;
const sha1_1 = __importDefault(require("sha1"));
const ebutt_1 = require("./ebutt");
const webvtt_1 = require("./webvtt");
function processHbbTvSubtitles(video, reqCfg) {
    return __awaiter(this, void 0, void 0, function* () {
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
                    const key = sha1_1.default(chk.url);
                    if (video.pluginData['subtitles@tv'] && video.pluginData['subtitles@tv'][key]) {
                        subtitles.inlineDataKey = key;
                        break;
                    }
                    if (chk.kind === 'ebutt') {
                        inlineData = yield ebutt_1.convertEbuTtFromUrl(chk.url, reqCfg);
                    }
                    else {
                        inlineData = yield webvtt_1.convertVTtFromUrl(chk.url, reqCfg);
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
                }
                catch (ignore) {
                    // try next
                }
            }
            if (!subtitles.inlineDataKey) {
                video.subtitles.splice(idx, 1);
                idx--;
            }
        }
        return null;
    });
}
exports.processHbbTvSubtitles = processHbbTvSubtitles;
