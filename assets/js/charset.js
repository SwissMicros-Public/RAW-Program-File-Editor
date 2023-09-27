const controlChars = [
    0x00f7, // ÷
    0x00d7, // ×
    0x221a, // √
    0x222b, // ∫
    0x2592, // ▒
    0x03a3, // Σ
    0x25b8, // ▸
    0x03c0, // π
    0x00bf, // ¿
    0x2264, // ≤
    0x000a, // 0x0a
    0x2265, // ≥
    0x2260, // ≠
    0x21b5, // ↵
    0x2193, // ↓
    0x2192, // →
    0x2190, // ←
    0x03bc, // μ
    0x00a3, // £
    0x00b0, // °
    0x00c5, // Å
    0x00d1, // Ñ
    0x00c4, // Ä
    0x2221, // ∡ - angle sign
    0x1d07, // ᴇ
    0x00c6, // Æ
    0x2026, // …
    0x001b, // 0x1b
    0x00d6, // Ö
    0x00dc, // Ü
    0x2592, // ▒
    0x2022  // •
];

const translator = {
    '[LF]': 0x000a,
    '[ESC]': 0x001b,
    '^': 0x2191,
    '\\:-': 0x00f7,
    '\\x': 0x00d7,
    '\\v/': 0x221a,
    '\\S': 0x222b,
    '\\FUZ': 0x2592,
    '\\GS': 0x03a3,
    '\\|>': 0x25b8,
    '\\PI': 0x03c0,
    '\\?': 0x00bf,
    '\\<=': 0x2264,
    '\\>=': 0x2265,
    '\\#': 0x2260,
    '\\</': 0x21b5,
    '\\v': 0x2193,
    '\\->': 0x2192,
    '\\<-': 0x2190,
    '\\m': 0x03bc,
    '\\PND': 0x00a3,
    '\\o': 0x00b0,
    '\\Ao': 0x00c5,
    '\\N~': 0x00d1,
    '\\A"': 0x00c4,
    '\\<\\': 0x2221,
    '\\E': 0x1d07,
    '\\AE': 0x00c6,
    '\\...': 0x2026,
    '\\O"': 0x00d6,
    '\\U"': 0x00dc,
    '\\.': 0x2022
};

function replaceChar(c) {
    switch (c) {
        case 0x5E: return "\u2191"; // ↑
        case 0x7F: return "\u251c"; // ├
        default: return String.fromCharCode(c);
    }
}

function backReplaceChar(c) {
    switch (c) {
        case "\u2191": return 0x5E;
        case "\u251c": return 0x7F;
        default: return c.charCodeAt(0);
    }
}

// function codepoint(cp) {
//     return String.fromCharCode(cp);
// }

function codepoint(cp) {

    const buf = new ArrayBuffer(2);
    const view = new DataView(buf);
    view.setUint16(0, cp, false); // false for big-endian
    const decoder = new TextDecoder('utf-16be');
    return decoder.decode(buf);
}


function char(code) {

    if (code < 0x20) {
        return String.fromCodePoint(controlChars[code]);
    } else {
        return String.fromCodePoint(replaceChar(code).charCodeAt(0));
    }
}

function UTF8Equivalent(str) {
    if (str.length === 0) return '';
    for (let key in translator) {
        if (translator.hasOwnProperty(key)) {
            const repString = codepoint(translator[key]);
            str = str.replace(key, repString);
        }
    }
    return str;
}

function translateString(str) {
    if (str.length == 0) return '';
    str = UTF8Equivalent(str);
    
    let translated = '';
    while (str.length > 0) {
        const encoder = new TextEncoder();
        const firstChar = str.slice(0, 1);
        let unicodeArray = [];

        for (let i = 0; i < firstChar.length; i++) {
        unicodeArray.push(firstChar.charCodeAt(i));
        }
    
        const c = unicodeArray;

        let chr = backReplaceChar(firstChar);

        str = str.substring(1);
        if ((chr >= 0x0020) && (chr <= 0x007f)) {
            translated += String.fromCharCode(chr);
        }
        else {
            let index = controlChars.indexOf(chr);
            if (index !== -1) {
                translated += String.fromCharCode(index);
            }
        }
    }
    return translated;
}
