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
exports.convertVTtFromUrl = void 0;
const axios_1 = __importDefault(require("axios"));
const ebutt_1 = require("./ebutt");
function parseTime(str) {
    if (!str) {
        return -1;
    }
    const itm = str.split(':');
    if (itm.length < 2 || itm.length > 3) {
        return -1;
    }
    let ret = 0;
    for (let i = 0; i < 3 && i < itm.length; i++) {
        const s = itm[itm.length - 1 - i];
        let v;
        if (i === 0) {
            v = Math.round((parseFloat(s) || 0) * 1000);
            v = Math.max(0, Math.min(60000, v));
        }
        else {
            v = Math.max(0, parseInt(s, 10) || 0);
            if (!v) {
                continue;
            }
            v *= i === 1 ? 60000 : 3600000;
        }
        ret += v;
    }
    return ret;
}
function parseSubtitleLine(str, opt) {
    const ret = { style: opt.textStyle, text: '' };
    while (true) {
        const i = str.indexOf('<');
        if (i < 0) {
            break;
        }
        const j = str.indexOf('>', i);
        if (j < i) {
            if (i > 0) {
                ret.text = str.substring(0, i);
                return ret;
            }
            return null;
        }
        str = str.substring(0, i) + str.substring(j + 1);
    }
    str = str.replace(/&lt;/g, '<');
    str = str.replace(/&gt;/g, '>');
    str = str.replace(/&quot;/g, '"');
    str = str.replace(/&lrm;/g, '');
    str = str.replace(/&rlm;/g, '');
    str = str.replace(/&nbsp;/g, ' ');
    str = str.replace(/&/g, '&amp;');
    str = str.replace(/"/g, '&quot;');
    str = str.replace(/</g, '&lt;');
    str = str.replace(/>/g, '&gt;');
    ret.text = str.trim();
    if (ret.text.length) {
        return ret;
    }
    return null;
}
function parseLayout(ret, opt, cfgs) {
    for (const cfg of cfgs) {
        const i = cfg.indexOf(':');
        if (i <= 0) {
            continue;
        }
        const key = cfg.substring(0, i).trim().toLowerCase();
        const value = cfg.substring(i + 1).trim().toLowerCase();
        if (key === 'line') {
            if (value.indexOf('%') > 0) {
                const perc = parseInt(value.replace('%', ''), 10);
                if (perc >= 0 && perc < 50) {
                    opt.region = 'top';
                }
            }
            else {
                const idx = parseInt(value, 10);
                if (idx >= 0 && idx < 5) {
                    opt.region = 'top';
                }
            }
        }
        else if (key === 'align') {
            if (value === 'start' || value === 'left') {
                opt.lineStyle = 'textLeft';
            }
            else if (value === 'end' || value === 'right') {
                opt.lineStyle = 'textRight';
            }
        }
    }
}
function parseSubtitle(ret, lines, textStyle) {
    let cue = lines[0];
    let sep = cue.indexOf('-->');
    if (sep <= 0 || lines.length < 2) {
        return;
    }
    const begin = parseTime(cue.substring(0, sep).trim());
    cue = cue.substring(sep + 3).trim();
    sep = cue.indexOf(' ');
    const end = parseTime(sep <= 0 ? cue : cue.substring(0, sep));
    if (begin < 0 || end < begin) {
        return;
    }
    const opt = { region: 'bottom', lineStyle: 'textCenter', textStyle };
    if (sep > 0) {
        parseLayout(ret, opt, cue.substring(sep + 1).trim().split(' '));
    }
    const tt = [];
    for (let i = 1; i < lines.length; i++) {
        const line = parseSubtitleLine(lines[i], opt);
        if (line) {
            if (tt.length) {
                tt.push(null);
            }
            tt.push(line);
        }
    }
    if (tt.length) {
        ret.subtitles.push({ begin, end, region: opt.region, style: opt.lineStyle, tt });
    }
}
function fixColor(str) {
    if (!str) {
        return null;
    }
    if (str.startsWith('#')) {
        if (str.length > 6) {
            str = str.substring(1, 7);
        }
        else if (str.length === 4) {
            const r = str.substring(1, 2);
            const g = str.substring(2, 3);
            const b = str.substring(3, 4);
            str = `${r}${r}${g}${g}${b}${b}`;
        }
        else {
            return null;
        }
        str = ebutt_1.validateChars(str, '0123456789abcdef');
        if (str === '000000') {
            str = 'ffffff';
        }
        return str.length === 6 ? str : null;
    }
    switch (str) {
        case 'red':
            return 'ff0000';
        case 'green':
            return '00ff00';
        case 'blue':
            return '0000ff';
        case 'magenta':
            return 'ff00ff';
        case 'yellow':
            return 'ffff00';
        case 'cyan':
            return '00ffff';
        case 'white':
        case 'black':
            return 'ffffff';
        default:
            return null;
    }
}
function parseStyleBlock(ret, css) {
    css = css.replace(/ /g, '');
    const i = css.indexOf('::cue{');
    if (i < 0) {
        return null;
    }
    const j = css.indexOf('}', i);
    css = j > i ? css.substring(i + 6, j) : css.substring(i + 6);
    for (const style of css.split(';')) {
        const c = style.indexOf(':');
        if (c <= 0) {
            continue;
        }
        if (style.substring(0, c) !== 'color') {
            continue;
        }
        const value = fixColor(style.substring(c + 1).toLowerCase());
        if (value) {
            const id = `col${value}`;
            ret.styles[id] = { fgcol: `#${value}`, bgcol: '#000000c2', align: '' };
            return id;
        }
    }
}
function parseBlock(ret, lines, textStyle) {
    let first = lines[0];
    const spac = first.indexOf(' ');
    if (spac > 0) {
        first = first.substring(0, spac);
    }
    if (first === 'NOTE' || first === 'WEBVTT') {
        return null; // ignore this block
    }
    if (first === 'STYLE') {
        lines.splice(0, 1);
        return parseStyleBlock(ret, lines.join(' ')); // style blocks not supported
    }
    // subtitle cue beyond this point
    if (lines.length < 2) {
        return null;
    }
    if (lines[0].indexOf('-->') > 0) {
        parseSubtitle(ret, lines, textStyle);
        return null;
    }
    if (lines.length > 2 && lines[1].indexOf('-->') > 0) {
        lines.splice(0, 1);
        parseSubtitle(ret, lines, textStyle);
        return null;
    }
    // unknown block
    return null;
}
function sortSubtitles(subs) {
    const subtitles = {};
    for (const sub of subs) {
        let key = '';
        while (true) {
            key = `00000000${sub.begin}`;
            key = key.substring(key.length - 8);
            if (sub.begin && !subtitles[key]) {
                break;
            }
            sub.begin++;
        }
        subtitles[key] = sub;
    }
    const keys = Object.keys(subtitles);
    if (!keys.length) {
        throw new Error('No subtitles found in file');
    }
    const ret = [];
    for (const key of keys.sort()) {
        ret.push(subtitles[key]);
    }
    const timediff = ret[0].begin - (ret[0].begin % 3600000);
    if (timediff <= 0) {
        return ret;
    }
    for (const sub of ret) {
        sub.begin -= timediff;
    }
    return ret;
}
function convertVTtFromString(lines) {
    const ret = { styles: {}, regions: {}, subtitles: [] };
    let textStyle = 'default';
    ret.styles[textStyle] = { fgcol: '#ffffff', bgcol: '#000000c2', align: '' };
    ret.styles.textLeft = { fgcol: '#ffffff', bgcol: '#000000c2', align: 'left' };
    ret.styles.textRight = { fgcol: '#ffffff', bgcol: '#000000c2', align: 'right' };
    ret.styles.textCenter = { fgcol: '#ffffff', bgcol: '#000000c2', align: 'center' };
    ret.regions.top = { align: 'before' };
    ret.regions.bottom = { align: 'after' };
    let block = [];
    for (const line of lines) {
        const trimLine = line.replace(/\r/g, '').trim();
        if (trimLine.length) {
            block.push(trimLine);
            continue;
        }
        if (!block.length) {
            continue;
        }
        const chk = parseBlock(ret, block, textStyle);
        if (chk) {
            textStyle = chk;
        }
        block = [];
    }
    if (block.length) {
        parseBlock(ret, block, textStyle);
    }
    ret.subtitles = sortSubtitles(ret.subtitles);
    return ret;
}
function convertVTtFromUrl(url, reqcfg) {
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
        return convertVTtFromString(ret.data.split('\n'));
    });
}
exports.convertVTtFromUrl = convertVTtFromUrl;
