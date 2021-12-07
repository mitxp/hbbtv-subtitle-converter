"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.convertEbuTtFromUrl = exports.validateChars = void 0;
const axios_1 = __importDefault(require("axios"));
const xml2js = __importStar(require("xml2js"));
const VALID_COL_NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#0123456789';
const VALID_STYLE_NAME_CHARS = `${VALID_COL_NAME_CHARS}_.,`;
function validateChars(txt, validchars) {
    for (let i = 0; i < txt.length; i++) {
        const ch = txt.substring(i, i + 1);
        if (validchars.indexOf(ch) < 0) {
            txt = txt.substring(0, i) + txt.substring(i + 1);
            i--;
        }
    }
    return txt;
}
exports.validateChars = validateChars;
function getFirstElement(data, tagName) {
    if (!data || !data[tagName]) {
        return null;
    }
    const lst = data[tagName];
    if (typeof lst !== 'object' || !lst[0]) {
        return null;
    }
    return lst[0];
}
function parseTime(str) {
    if (!str || typeof str !== 'string') {
        return -1;
    }
    if (str.length > 6) {
        const h = parseInt(str.substring(0, 2), 10) || 0;
        const m = parseInt(str.substring(3, 5), 10) || 0;
        const s = parseInt(str.substring(6, 8), 10) || 0;
        let ms = 0;
        if (str.length > 9) {
            ms = parseInt(str.length > 12 ? str.substring(9, 12) : str.substring(9), 10) || 0;
        }
        return h * 3600000 + m * 60000 + s * 1000 + ms;
    }
    const secs = parseFloat(str);
    if (isNaN(secs)) {
        return -1;
    }
    return Math.round(secs * 1000);
}
function spanTextToHtml(text) {
    text = text.replace(/\r/g, '');
    text = text.replace(/\n/g, ' ');
    text = text.replace(/&/g, '&amp;');
    text = text.replace(/"/g, '&quot;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    return text;
}
function decodeSpans(p) {
    const ret = [];
    let foundSpan = false;
    for (const key of Object.keys(p)) {
        if (key.startsWith('span_')) {
            let span = p[key];
            if (typeof span !== 'object') {
                continue;
            }
            span = span[0];
            if (typeof span !== 'object' || !span._ || typeof span._ !== 'string') {
                continue;
            }
            foundSpan = true;
            const style = span.$ && span.$.style ? validateChars(span.$.style, VALID_STYLE_NAME_CHARS) : '';
            ret.push({ style, text: spanTextToHtml(span._) });
        }
        else if (key.startsWith('br_')) {
            ret.push(null);
        }
    }
    if (!foundSpan && p._ && typeof p._ === 'string') {
        return [{ style: '', text: spanTextToHtml(p._) }];
    }
    return ret;
}
function getSubtitleTimeOffset(divs) {
    let count = 0;
    let ret = 0;
    for (const div of divs) {
        if (!div.p) {
            continue;
        }
        for (const p of div.p) {
            const attribs = p.$ || {};
            const begin = parseTime(attribs.begin);
            const end = parseTime(attribs.end);
            if (begin < 0 || end < begin) {
                continue;
            }
            ret = begin - (begin % 3600000);
            count++;
            if (count > 1) {
                return ret;
            }
        }
    }
    return ret;
}
function decodeSubtitles(divs) {
    const subtitles = {};
    let timediff = getSubtitleTimeOffset(divs);
    for (const div of divs) {
        if (!div.p) {
            continue;
        }
        const divAttribs = div.$ || {};
        for (const p of div.p) {
            const attribs = p.$ || {};
            let begin = parseTime(attribs.begin) - timediff;
            let end = parseTime(attribs.end) - timediff;
            if (begin < 0 || end < begin || begin > 34000000) {
                continue;
            }
            const style = validateChars(attribs.style || (divAttribs.style || ''), VALID_STYLE_NAME_CHARS);
            const region = validateChars(attribs.region || (divAttribs.region || ''), VALID_STYLE_NAME_CHARS);
            const tt = decodeSpans(p);
            if (!tt || !tt.length) {
                continue;
            }
            let key = '';
            while (true) {
                key = `00000000${begin}`;
                key = key.substring(key.length - 8);
                if (begin && !subtitles[key]) {
                    break;
                }
                begin++;
            }
            subtitles[key] = { begin, end, region, style, tt };
        }
    }
    const keys = Object.keys(subtitles);
    if (!keys.length) {
        throw new Error('No subtitles found in XML');
    }
    const ret = [];
    for (const key of keys.sort()) {
        ret.push(subtitles[key]);
    }
    return ret;
}
function convertEbuTtFromJson(data) {
    const head = getFirstElement(data, 'head') || {};
    const body = getFirstElement(data, 'body') || {};
    const styles = (getFirstElement(head, 'styling') || {}).style || [];
    const regions = (getFirstElement(head, 'layout') || {}).region || [];
    const ret = { styles: {}, regions: {}, subtitles: decodeSubtitles(body.div || []) };
    for (const style of styles) {
        const attribs = style.$ || {};
        const id = validateChars(attribs.id || '', VALID_STYLE_NAME_CHARS);
        const fgcol = validateChars(attribs.color || '', VALID_COL_NAME_CHARS);
        let bgcol = validateChars(attribs.backgroundcolor || '', VALID_COL_NAME_CHARS);
        let align = validateChars(attribs.textalign || '', VALID_COL_NAME_CHARS).toLowerCase();
        if (!bgcol && styles.length < 2 && fgcol.toLowerCase() === '#ffffff') {
            bgcol = '#000000c2';
        }
        if (align !== 'left' && align !== 'right' && align !== 'center') {
            align = '';
        }
        ret.styles[id] = { fgcol, bgcol, align };
    }
    for (const region of regions) {
        const attribs = region.$ || {};
        const id = validateChars(attribs.id || '', VALID_STYLE_NAME_CHARS);
        const align = validateChars(attribs.displayalign || '', VALID_COL_NAME_CHARS);
        ret.regions[id] = { align };
    }
    return ret;
}
let counter = 0;
function enumerateTags(tag) {
    if (tag !== 'span' && tag !== 'br') {
        return tag;
    }
    counter++;
    return `${tag}_${counter}`;
}
function xmlToJson(data) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(data, {
            tagNameProcessors: [xml2js.processors.stripPrefix, xml2js.processors.normalize, enumerateTags],
            attrNameProcessors: [xml2js.processors.stripPrefix, xml2js.processors.normalize],
            explicitRoot: false,
        }, (err, result) => {
            if (err) {
                return reject(err);
            }
            if (result) {
                return resolve(result);
            }
            reject(new Error('XML parser did not return any result'));
        });
    });
}
function convertEbuTtFromUrl(url, reqcfg) {
    return __awaiter(this, void 0, void 0, function* () {
        const req = axios_1.default.create(Object.assign({ responseType: 'text' }, reqcfg));
        let ret;
        try {
            ret = yield req.get(url);
        }
        catch (err) {
            if (err.response) {
                throw new Error(`Request for URL ${url} failed, status=${err.response.status}`);
            }
            throw new Error(`Request for URL ${url} failed: ${err}`);
        }
        if (!ret.data || ret.status !== 200 || (typeof ret.data) !== 'string') {
            throw new Error(`Invalid response for URL ${url}, status=${ret.status}`);
        }
        const json = yield xmlToJson(ret.data);
        return convertEbuTtFromJson(json);
    });
}
exports.convertEbuTtFromUrl = convertEbuTtFromUrl;
