// file upload 
const HP42_DIVIDE = 0;
const HP42_MULTIPLY = 1;
const HP42_SQROOT = 2;
const HP42_INTEGRAL = 3;
const HP42_FUZZBLOCK = 4;
const HP42_SIGMA = 5;
const HP42_LBLARROW = 6;
const HP42_PI = 7;
const HP42_INVQUESTION = 8;
const HP42_LESSTHANOREQUAL = 9;
const HP42_LINEFEED = 10;
const HP42_GREATERTHANOREQUAL = 11;
const HP42_NOTEQUAL = 12;
const HP42_CARRIAGERETURN = 13;
const HP42_DOWNARROW = 14;
const HP42_RIGHTARROW = 15;
const HP42_LEFTARROW = 16;
const HP42_MICRO = 17;
const HP42_POUND = 18;
const HP42_DEGREES = 19;
const HP42_ACIRCUM = 20;
const HP42_NTILDE = 21;
const HP42_AUMLAUT = 22;
const HP42_ANGLE = 23;
const HP42_EXPONENT = 24;
const HP42_AELIG = 25;
const HP42_ELLIPSIS = 26;
const HP42_ESCAPE = 27;
const HP42_OUMLAUT = 28;
const HP42_UUMLAUT = 29;
const HP42_BLOB = 31;
const HP42_POWER = 94;

const END = 'C0000D';
let rawData;
let rawHex = "";
let programCounter;
let programLength;

function decodeWithComments(lines, rawhex) {
    rawData = hex2bin(rawhex);
    rawHex = rawhex.toUpperCase();
    programLength = rawhex.length >> 1;
    programCounter = 0;

    try {
        let hadEND = true;
        let hex = [];
        let program = [];
        let listing = [];
        let pc = [];
        let lastIntroLine = 0;
        let hadPrevious = false;

        for (let i = 0; i < lines.length; i++) {
            let thisLine = lines[i];
            if (hadEND && (programCounter < programLength)) {
                if (hadPrevious) {
                    hex.push('');
                    pc.push('');
                    program.push('');
                    listing.push('');
                }
                hadPrevious = true;
                lastIntroLine = listing.length;
                listing.push('00 { 0-Byte Prgm }');
                program.push('');
                pc.push('');
                hex.push('');
                hadEND = false;
                bytesInPrgm = 0;
                prgmLine = 1;
            }
            if (!thisLine.hex.length) {
                // ...and if there's no comment then skip it
                if (thisLine.comment === null) continue;
                // ...but if there is a comment then add it
                listing.push('@ ' + thisLine.comment);
                program.push('');
                pc.push('');
                hex.push('');
                continue;
            }
            // right, we have an instruction
            // re-decode it
            let bytesUsed = { "bytesUsed": 0 };
            let instruction = decodeInstruction(bytesUsed);
            program.push(instruction);
            pc.push(bytesInPrgm.toString(16).padStart(4, '0').toUpperCase());
            hex.push(thisLine.hex);
            let spacer = '';
            if (instruction.length > 4 && instruction.substring(0, 4) == 'LBL ') {
                spacer = char(HP42_LBLARROW);
            } else {
                spacer = ' ';
            }

            let listingLine = prgmLine.toString().padStart(2, '0') + spacer + instruction;
            prgmLine += 1;

            if (thisLine.comment !== null) {
                listingLine += ' @' + thisLine.comment;
            }

            listing.push(listingLine);
            if (instruction == 'END') {
                listing[lastIntroLine] = '00 { ' + bytesInPrgm.toString() + '-Byte Prgm }';
                hadEND = true;
                bytesInPrgm = 0;
            } else {
                bytesInPrgm += bytesUsed.bytesUsed;
            }
        }
        var retVal = {};
        retVal.error = '';
        retVal.success = true;
        retVal.program = program;
        retVal.listing = listing;
        retVal.hex = hex;
        retVal.pc = pc;
        retVal.bytesUsed = programLength;

    } catch (e) {
        var retVal = new Object();
        retVal.success = false;
        retVal.error = e.message;
    }
    return retVal;
}

function bin2hex(binaryData) {//1
    const hexChars = '0123456789abcdef';
    let hexString = '';

    for (let i = 0; i < binaryData.length; i++) {
        let byte = binaryData[i];
        hexString += hexChars[(byte >> 4) & 0x0f] + hexChars[byte & 0x0f];
    }
    return decodeHex(hexString);
}

function decodeHex(hexData) {//1
    if (!hexData) {
        let retVal = {
            success: false,
            error: "Nothing to decode"
        };
        return retVal;
    }

    hexData = hexData.replace(/\r/g, '');
    hexData = hexData.replace(/\n/g, '');
    hexData = hexData.replace(/ /g, '');
    hexData = hexData.replace(/\t/g, '');

    return __decodeHex(hexData.toUpperCase());
}

function __decodeHex(hexData) {
    var bytesInPrgm = 0;

    if (hexData.length % 2 !== 0) {//1
        var retVal = {
            success: false,
            error: "Odd number of characters in hex data to decode"
        };
        return retVal;
    }

    var hasEND = (hexData.length >= END.length);//1

    if (hasEND) {//1
        let pos = hexData.length - END.length;
        hasEND = (hexData.substring(pos) == END);
    }

    if (!hasEND) {//1
        hexData += END;
    }

    rawData = hex2bin(hexData);//1

    if (!rawData) {//1
        var retVal = {
            success: false,
            error: "Invalid hex data"
        };
        return retVal;
    }

    programLength = hexData.length >> 1;
    rawHex = hexData;
    programCounter = 0
    // let retVal = {"success":"", "error":"", "program":"", "listing": "", "hex": "", "pc": "", "bytesUsed":""};

    try {
        var hadEND = true;
        var hex = [];
        var program = [];
        var listing = [];
        var pc = [];
        let lastIntroLine = 0;
        let hadPrevious = false;
        let prgmLine = 1;
        var retVal

        while (programCounter < programLength) {
            if (hadEND) {
                if (hadPrevious) {
                    hex.push('');
                    pc.push('');
                    program.push('');
                    listing.push('');
                }

                hadPrevious = true;
                lastIntroLine = listing.length;
                // Set up the intro
                listing.push('00 { 0-Byte Prgm }');
                program.push('');
                pc.push('');
                hex.push(' ');
                hadEND = false;
                bytesInPrgm = 0;
                prgmLine = 1;
            }

            let oldPC = programCounter;
            let bytesUsed = { "bytesUsed": 0 };
            let instruction = decodeInstruction(bytesUsed);
            program.push(instruction);

            let bytesInPrgm_temp = bytesInPrgm.toString(16).padStart(4, '0').toUpperCase();
            pc.push(bytesInPrgm_temp);
            let hex_temp = rawHex.substring(oldPC << 1, (oldPC << 1) + (bytesUsed.bytesUsed << 1));
            hex.push(hex_temp);
            hex_temp = ""
            let spacer = ' ';
            if (instruction.length > 4 && instruction.substring(0, 4) === 'LBL ') {
                spacer = char(HP42_LBLARROW); // Assuming HP42_LBLARROW is a constant
            } else {
                spacer = ' ';
            }
            listing.push((prgmLine++).toString().padStart(2, '0') + spacer + instruction);

            if (instruction === 'END') {
                listing[lastIntroLine] = `00 { ${bytesInPrgm}-Byte Prgm }`;
                hadEND = true;
                bytesInPrgm = 0;
            } else {
                bytesInPrgm += bytesUsed.bytesUsed;
            }
        }

        retVal = {
            error: '',
            success: true,
            program: program,
            listing: listing,
            hex: hex,
            pc: pc,
            bytesUsed: programLength
        };
    } catch (error) {
        retVal = {
            success: false,
            error: error.message
        };
    }
    return retVal;
}

function hex2bin(hex) {//1
    let bytes = [];
    let str;
    for (let i = 0; i < hex.length - 1; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    str = String.fromCharCode.apply(String, bytes);

    return str;
}


function decodeInstruction(bytesUsed) {
    let startPC = programCounter;
    let instruction = "";
    let thisByte = 0;
    let thisHex = "";
    bytesUsed.bytesUsed = 0;

    thisByte = peekByte();
    thisHex = peekHex();
    if (thisByte <= 0x1c) {
        instruction = decodeSingleByte();
    } else if (thisByte == 0x1d) {
        instruction = decodeGTOstring();
    } else if (thisByte == 0x1e) {
        instruction = decodeXEQstring();
    } else if (thisByte >= 0x20 && thisByte <= 0x8f) {
        instruction = decodeSingleByte();
    } else if ((thisByte & 0xf0) == 0x90) {
        instruction = decode2Byte();
    } else if (thisByte >= 0xa0 && thisByte <= 0xa7) {
        instruction = decodeXROM();
    } else if (thisByte >= 0xa8 && thisByte <= 0xad) {
        instruction = decode2Byte();
    } else if (thisByte == 0xae) {
        instruction = decodeBranchInd();
    } else if (thisByte >= 0xb1 && thisByte <= 0xbf) {
        instruction = decode2ByteGTO();
    } else if (thisByte >= 0xc0 && thisByte <= 0xcd) {
        instruction = decodeGlobal();
    } else if (thisByte == 0xce || thisByte == 0xcf) {
        instruction = decode2Byte();
    } else if (thisByte >= 0xd0 && thisByte <= 0xef) {
        instruction = decode3Byte();
    } else if (thisByte >= 0xf0) {
        instruction = decodeText();
    } else {
        bombOut(`Invalid instruction code '${thisHex}'`, 0);
    }

    bytesUsed.bytesUsed = programCounter - startPC;
    return instruction;
}

function peekByte() {
    checkEnoughData();
    return rawData.charCodeAt(programCounter);
}

function peekHex() {
    checkEnoughData();
    return rawHex.substring(2 * programCounter, 2);
}

function popByte() {
    checkEnoughData();
    return rawData.charCodeAt(programCounter++);
}

function checkEnoughData() {
    if (programCounter >= programLength) {
        bombOut('No program data left to read', 0);
    }
}

function bombOut(msg, offset = -1) {
    var temp = programCounter + offset;
    let formattedMsg = `${msg} at PC:${temp.toString(16).padStart(4, '0')}`;
    throw new Error(formattedMsg);
}

function decodeNumber() {
    programCounter--;
    let byte = popByte();
    let number = "";
    while (true) {
        if (byte === 0x00) { break; }
        if (byte === 0x1c) { number += '-'; }
        else if (byte === 0x1b) { number += char(HP42_EXPONENT); }
        else if (byte === 0x1a) { number += '.'; }
        else if (byte >= 0x10 && byte <= 0x19) { number += String.fromCharCode(0x20 + byte); }
        else {
            // Rewind instead of consuming this byte
            programCounter--;
            break;
        }
        byte = popByte();
    }
    return number;
}

function decodeSingleByte() {
    let byte = popByte();
    if (byte === 0x00) return "NULL";
    if (byte < 0x10) return 'LBL ' + (byte - 1).toString().padStart(2, '0');
    if (byte < 0x1d) return decodeNumber();
    if (byte < 0x30) return 'RCL ' + (byte & 0x0f).toString().padStart(2, '0');
    if (byte < 0x40) return 'STO ' + (byte & 0x0f).toString().padStart(2, '0');

    switch (byte) {
        case 0x40: return '+';
        case 0x41: return '-';
        case 0x42: return char(HP42_MULTIPLY);
        case 0x43: return char(HP42_DIVIDE);
        case 0x44: return 'X<Y?';
        case 0x45: return 'X>Y?';
        case 0x46: return 'X' + char(HP42_LESSTHANOREQUAL) + 'Y?';
        case 0x47: return char(HP42_SIGMA) + '+';
        case 0x48: return char(HP42_SIGMA) + '-';
        case 0x49: return 'HMS+';
        case 0x4a: return 'HMS-';
        case 0x4b: return 'MOD';
        case 0x4c: return '%';
        case 0x4d: return '%CH';
        case 0x4e: return char(HP42_RIGHTARROW) + 'REC';
        case 0x4f: return char(HP42_RIGHTARROW) + 'POL';
        case 0x50: return 'LN';
        case 0x51: return 'X^2';
        case 0x52: return 'SQRT';
        case 0x53: return 'Y^X';
        case 0x54: return '+/-';
        case 0x55: return 'E^X';
        case 0x56: return 'LOG';
        case 0x57: return '10^X';
        case 0x58: return 'E^X-1';
        case 0x59: return 'SIN';
        case 0x5a: return 'COS';
        case 0x5b: return 'TAN';
        case 0x5c: return 'ASIN';
        case 0x5d: return 'ACOS';
        case 0x5e: return 'ATAN';
        case 0x5f: return char(HP42_RIGHTARROW) + 'DEC';
        case 0x60: return '1/X';
        case 0x61: return 'ABS';
        case 0x62: return 'N!';
        case 0x63: return 'X' + char(HP42_NOTEQUAL) + '0?';
        case 0x64: return 'X>0?';
        case 0x65: return 'LN1+X';
        case 0x66: return 'X<0?';
        case 0x67: return 'X=0?';
        case 0x68: return 'IP';
        case 0x69: return 'FP';
        case 0x6a: return char(HP42_RIGHTARROW) + 'RAD';
        case 0x6b: return char(HP42_RIGHTARROW) + 'DEG';
        case 0x6c: return char(HP42_RIGHTARROW) + 'HMS';
        case 0x6d: return char(HP42_RIGHTARROW) + 'HR';
        case 0x6e: return 'RND';
        case 0x6f: return char(HP42_RIGHTARROW) + 'OCT';
        case 0x70: return 'CL' + char(HP42_SIGMA);
        case 0x71: return 'X<>Y';
        case 0x72: return 'PI';
        case 0x73: return 'CLST';
        case 0x74: return 'R^';
        case 0x75: return 'R' + char(HP42_DOWNARROW);
        case 0x76: return 'LASTX';
        case 0x77: return 'CLX';
        case 0x78: return 'X=Y?';
        case 0x79: return 'X' + char(HP42_NOTEQUAL) + 'Y?';
        case 0x7a: return 'SIGN';
        case 0x7b: return 'X' + char(HP42_LESSTHANOREQUAL) + '0?';
        case 0x7c: return 'MEAN';
        case 0x7d: return 'SDEV';
        case 0x7e: return 'AVIEW';
        case 0x7f: return 'CLD';
        case 0x80: return 'DEG';
        case 0x81: return 'RAD';
        case 0x82: return 'GRAD';
        case 0x83: return 'ENTER';
        case 0x84: return 'STOP';
        case 0x85: return 'RTN';
        case 0x86: return 'BEEP';
        case 0x87: return 'CLA';
        case 0x88: return 'ASHF';
        case 0x89: return 'PSE';
        case 0x8a: return 'CLRG';
        case 0x8b: return 'AOFF';
        case 0x8c: return 'AON';
        case 0x8d: return 'OFF';
        case 0x8e: return 'PROMPT';
        case 0x8f: return 'ADV';
    }
}

function decodeGTOstring() {
    programCounter++;
    return 'GTO ' + decodeText();
}

function decodeXEQstring() {
    programCounter++;
    return 'XEQ ' + decodeText();
}

function decodeText() {
    var headerByte = popByte();
    var strLength = (headerByte & 0x0f);
    var cmdByte = peekByte();
    if (cmdByte < 0x80) {
        return readStringLiteral(strLength);
    } else {
        popByte();
        strLength--;
        switch (cmdByte) {
            case 0x80: return 'VIEW ' + readStringLiteral(strLength);
            case 0x81: return 'STO ' + readStringLiteral(strLength);
            case 0x82: return 'STO+ ' + readStringLiteral(strLength);
            case 0x83: return 'STO- ' + readStringLiteral(strLength);
            case 0x84: return 'STO' + char(HP42_MULTIPLY) + ' ' + readStringLiteral(strLength);
            case 0x85: return 'STO' + char(HP42_DIVIDE) + ' ' + readStringLiteral(strLength);
            case 0x86: return 'X<> ' + readStringLiteral(strLength);
            case 0x87: return 'INDEX ' + readStringLiteral(strLength);
            case 0x88: return 'VIEW IND ' + readStringLiteral(strLength);
            case 0x89: return 'STO IND ' + readStringLiteral(strLength);
            case 0x8a: return 'STO+ IND ' + readStringLiteral(strLength);
            case 0x8b: return 'STO- IND ' + readStringLiteral(strLength);
            case 0x8c: return 'STO' + char(HP42_MULTIPLY) + ' IND ' + readStringLiteral(strLength);
            case 0x8d: return 'STO' + char(HP42_DIVIDE) + ' IND ' + readStringLiteral(strLength);
            case 0x8e: return 'X<> IND ' + readStringLiteral(strLength);
            case 0x8f: return 'INDEX IND ' + readStringLiteral(strLength);
            case 0x90: return 'MVAR ' + readStringLiteral(strLength);
            case 0x91: return 'RCL ' + readStringLiteral(strLength);
            case 0x92: return 'RCL+ ' + readStringLiteral(strLength);
            case 0x93: return 'RCL- ' + readStringLiteral(strLength);
            case 0x94: return 'RCL' + char(HP42_MULTIPLY) + ' ' + readStringLiteral(strLength);
            case 0x95: return 'RCL' + char(HP42_DIVIDE) + ' ' + readStringLiteral(strLength);
            case 0x96: return 'ISG ' + readStringLiteral(strLength);
            case 0x97: return 'DSE ' + readStringLiteral(strLength);
            case 0x98: return 'MVAR IND ' + readStringLiteral(strLength);
            case 0x99: return 'RCL IND ' + readStringLiteral(strLength);
            case 0x9a: return 'RCL+ IND ' + readStringLiteral(strLength);
            case 0x9b: return 'RCL- IND ' + readStringLiteral(strLength);
            case 0x9c: return 'RCL' + char(HP42_MULTIPLY) + ' IND ' + readStringLiteral(strLength);
            case 0x9d: return 'RCL' + char(HP42_DIVIDE) + ' IND ' + readStringLiteral(strLength);
            case 0x9e: return 'ISG IND ' + readStringLiteral(strLength);
            case 0x9f: return 'DSE IND ' + readStringLiteral(strLength);
            case 0xa8: return 'SF IND ' + readStringLiteral(strLength);
            case 0xa9: return 'CF IND ' + readStringLiteral(strLength);
            case 0xaa: return 'FS?C IND ' + readStringLiteral(strLength);
            case 0xab: return 'FC?C IND ' + readStringLiteral(strLength);
            case 0xac: return 'FS? IND ' + readStringLiteral(strLength);
            case 0xad: return 'FC? IND ' + readStringLiteral(strLength);
            case 0xae: return 'GTO IND ' + readStringLiteral(strLength);
            case 0xaf: return 'XEQ IND ' + readStringLiteral(strLength);
            case 0xb0: return 'CLV ' + readStringLiteral(strLength);
            case 0xb1: return 'PRV ' + readStringLiteral(strLength);
            case 0xb2: return 'ASTO ' + readStringLiteral(strLength);
            case 0xb3: return 'ARCL ' + readStringLiteral(strLength);
            case 0xb4: return 'PGMINT ' + readStringLiteral(strLength);
            case 0xb5: return 'PGMSLV ' + readStringLiteral(strLength);
            case 0xb6: return 'INTEG ' + readStringLiteral(strLength);
            case 0xb7: return 'SOLVE ' + readStringLiteral(strLength);
            case 0xb8: return 'CLV IND ' + readStringLiteral(strLength);
            case 0xb9: return 'PRV IND ' + readStringLiteral(strLength);
            case 0xba: return 'ASTO IND ' + readStringLiteral(strLength);
            case 0xbb: return 'ARCL IND ' + readStringLiteral(strLength);
            case 0xbc: return 'PGMINT IND ' + readStringLiteral(strLength);
            case 0xbd: return 'PGMSLV IND ' + readStringLiteral(strLength);
            case 0xbe: return 'INTEG IND ' + readStringLiteral(strLength);
            case 0xbf: return 'SOLVE IND ' + readStringLiteral(strLength);
            case 0xc0: return decodeASSIGN(strLength);
            case 0xc1: return 'VARMENU ' + readStringLiteral(strLength);
            case 0xc2: return decodeKeyName('XEQ', strLength);
            case 0xc3: return decodeKeyName('GTO', strLength);
            case 0xc4: return 'DIM ' + readStringLiteral(strLength);
            case 0xc5: return 'INPUT ' + readStringLiteral(strLength);
            case 0xc6: return 'EDITN ' + readStringLiteral(strLength);
            case 0xc7: return 'LSTO ' + readStringLiteral(strLength);
            case 0xc9: return 'VARMENU IND ' + readStringLiteral(strLength);
            case 0xca: return decodeKeyName('XEQ IND', strLength);
            case 0xcb: return decodeKeyName('GTO IND', strLength);
            case 0xcc: return 'DIM IND ' + readStringLiteral(strLength);
            case 0xcd: return 'INPUT IND ' + readStringLiteral(strLength);
            case 0xce: return 'EDITN IND ' + readStringLiteral(strLength);
            case 0xcf: return 'LSTO IND ' + readStringLiteral(strLength);
            case 0xd0: return 'INPUT' + decodeTargetByte(popByte());
            case 0xd1: return 'RCL+' + decodeTargetByte(popByte());
            case 0xd2: return 'RCL-' + decodeTargetByte(popByte());
            case 0xd3: return 'RCL' + char(HP42_MULTIPLY) + decodeTargetByte(popByte());
            case 0xd4: return 'RCL' + char(HP42_DIVIDE) + decodeTargetByte(popByte());
            case 0xd5: return 'FIX 10';
            case 0xd6: return 'SCI 10';
            case 0xd7: return 'ENG 10';
            case 0xd8: return 'CLV' + decodeTargetByte(popByte());
            case 0xd9: return 'PRV' + decodeTargetByte(popByte());
            case 0xda: return 'INDEX' + decodeTargetByte(popByte());
            case 0xdb: return char(HP42_SIGMA) + 'REG IND ' + readStringLiteral(strLength);
            case 0xdc: return 'FIX IND ' + readStringLiteral(strLength);
            case 0xdd: return 'SCI IND ' + readStringLiteral(strLength);
            case 0xde: return 'ENG IND ' + readStringLiteral(strLength);
            case 0xdf: return 'TONE IND ' + readStringLiteral(strLength);
            case 0xe2: return decodeKeyLabel('XEQ');
            case 0xe3: return decodeKeyLabel('GTO');
            case 0xe5: return 'FIX 11';
            case 0xe6: return 'SCI 11';
            case 0xe7: return 'ENG 11';
            case 0xe8: return 'PGMINT' + decodeTargetByte(popByte());
            case 0xe9: return 'PGMSLV' + decodeTargetByte(popByte());
            case 0xea: return 'INTEG' + decodeTargetByte(popByte());
            case 0xeb: return 'SOLVE' + decodeTargetByte(popByte());
            case 0xec: return 'DIM' + decodeTargetByte(popByte());
            case 0xed: return 'LSTO' + decodeTargetByte(popByte());
            case 0xee: return 'INPUT' + decodeTargetByte(popByte());
            case 0xef: return 'EDITN' + decodeTargetByte(popByte());
            case 0xf0: return 'CLP ' + readStringLiteral(strLength);
            case 0xf7: {
                let result;
                let size = 256 * popByte();
                size += popByte();
                result = 'SIZE ' + size.toString().padStart(2, '0');
                return result;
            }
            case 0xf8: return 'VARMENU' + decodeTargetByte(popByte());
            default: bombOut("Invalid TEXT subcommand");
        }
    }
}

function readStringLiteral(strLength) {
    if (strLength == 0) return '""';
    let strChars = [];
    for (let i = 1; i <= strLength; i++) strChars.push(popByte());
    let result = '';
    if (strChars[0] == 0x7F) {
        result = char(0x7f) + "\"";
        strChars.shift();
    } else {
        result = '"';
    }
    strChars.forEach(function (strChar) {
        result += char(strChar);
    });
    result += '"';
    result = result.replace(/\x1b/g, "[ESC]");

    // Replace \x0a with [LF]
    result = result.replace(/\x0a/g, "[LF]");
    // result = result.replace("\x0a", "[LF]").replace("\x1b", "[ESC]");
    return result;
}

function decodeASSIGN(strLength) {
    let result = 'ASSIGN ' + readStringLiteral(strLength - 1);
    let key = popByte();
    if (key > 0x11) {
        bombOut("Invalid TO param");
    }
    result += ' TO ' + (key + 1).toString().padStart(2, '0');
    return result;
}

function decodeKeyName(opcode, length) {
    length--;
    let key = popByte();
    if (key > 0x09) bombOut("Invalid KEY");
    return `KEY ${key} ${opcode} ${readStringLiteral(length)}`;
}

function decodeKeyLabel(opcode) {

    let key = popByte();
    let label = popByte();
    if (key === 0x00 || key > 0x09) {
        bombOut("Invalid KEY");
    }
    return `KEY ${key} ${opcode}${decodeTargetByte(label, true)}`;
}

function decode2Byte() {
    let opcode = popByte();
    let addressByte = popByte();
    switch (opcode) {
        case 0x90: return 'RCL' + decodeTargetByte(addressByte);
        case 0x91: return 'STO' + decodeTargetByte(addressByte);
        case 0x92: return 'STO+' + decodeTargetByte(addressByte);
        case 0x93: return 'STO-' + decodeTargetByte(addressByte);
        case 0x94: return 'STO' + char(HP42_MULTIPLY) + decodeTargetByte(addressByte);
        case 0x95: return 'STO' + char(HP42_DIVIDE) + decodeTargetByte(addressByte);
        case 0x96: return 'ISG' + decodeTargetByte(addressByte);
        case 0x97: return 'DSE' + decodeTargetByte(addressByte);
        case 0x98: return 'VIEW' + decodeTargetByte(addressByte);
        case 0x99: return char(HP42_SIGMA) + 'REG' + decodeTargetByte(addressByte);
        case 0x9a: return 'ASTO' + decodeTargetByte(addressByte);
        case 0x9b: return 'ARCL' + decodeTargetByte(addressByte);
        case 0x9c: return 'FIX' + decodeTargetByte(addressByte);
        case 0x9d: return 'SCI' + decodeTargetByte(addressByte);
        case 0x9e: return 'ENG' + decodeTargetByte(addressByte);
        case 0x9f: return 'TONE' + decodeTONE(addressByte);
        case 0xa8: return 'SF' + decodeTargetByte(addressByte);
        case 0xa9: return 'CF' + decodeTargetByte(addressByte);
        case 0xaa: return 'FS?C' + decodeTargetByte(addressByte);
        case 0xab: return 'FC?C' + decodeTargetByte(addressByte);
        case 0xac: return 'FS?' + decodeTargetByte(addressByte);
        case 0xad: return 'FC?' + decodeTargetByte(addressByte);
        case 0xce: return 'X<>' + decodeTargetByte(addressByte);
        case 0xcf: return 'LBL' + decodeTargetByte(addressByte, true);
    }
}

function decodeTONE(addressByte) {
    let digits = (addressByte >= 0x80) ? 2 : 1;
    return decodeTargetByte(addressByte, false, digits);
}

function decodeTargetByte(byte, allowLocal = false, digits = 2) {
    let target = ' ';
    let gotTarget = false;
    let indirect = false;
    if (byte & 0x80) {
        target += 'IND ';
        byte &= 0x7f;
        indirect = true;
    }
    if (allowLocal && !indirect) {
        if ((byte >= 0x66) && (byte <= 0x6F)) {
            target += String.fromCharCode(byte - 0x25);
            gotTarget = true;
        } else if ((byte >= 0x7B) && (byte <= 0x7F)) {
            target += String.fromCharCode(byte - 0x1A);
            gotTarget = true;
        }
    }
    if (!gotTarget) {
        switch (byte) {
            case 0x70:
                target += 'ST T';
                break;
            case 0x71:
                target += 'ST Z';
                break;
            case 0x72:
                target += 'ST Y';
                break;
            case 0x73:
                target += 'ST X';
                break;
            case 0x74:
                target += 'ST L';
                break;
            default: {
                let formatString = `%0${digits}d`;
                target = target + formatString.replace(/%0(\d+)d/, (_, n) => String(byte).padStart(n, '0'));
            }
        }
    }
    return target;
}

function decodeXROM() {
    let thisByte = popByte();
    switch (thisByte) {
        case 0xa0: return XROMA0();
        case 0xa1: return XROMA1();
        case 0xa2: return XROMA2();
        case 0xa3: return XROMA3();
        case 0xa4: return XROMA4();
        case 0xa5: return XROMA5();
        case 0xa6: return XROMA6();
        case 0xa7: return XROMA7();
    }
}

function XROMString(b1, b2) {
    let retVal = 'XROM ';
    let fullOpcode = (b1 << 8) | b2;
    let xromBits = fullOpcode & 0x07c0;
    let xromNr = xromBits >> 6;
    let xromFunc = b2 & 0x3f;
    return `XROM ${xromNr},${xromFunc}`;
}

function XROMA0() {
    let byte = popByte();
    switch (byte) {
        // XROM 01
        case 0x61: return 'SINH';
        case 0x62: return 'COSH';
        case 0x63: return 'TANH';
        case 0x64: return 'ASINH';
        case 0x65: return 'ATANH';
        case 0x66: return 'ACOSH';
        case 0x6f: return 'COMB';
        case 0x70: return 'PERM';
        case 0x71: return 'RAN';
        case 0x72: return 'COMPLEX';
        case 0x73: return 'SEED';
        case 0x74: return 'GAMMA';
        // XROM 02
        case 0x9f: return 'BEST';
        case 0xa0: return 'EXPF';
        case 0xa1: return 'LINF';
        case 0xa2: return 'LOGF';
        case 0xa3: return 'PWRF';
        case 0xa4: return 'SLOPE';
        case 0xa5: return 'SUM';
        case 0xa6: return 'YINT';
        case 0xa7: return 'CORR';
        case 0xa8: return 'FCSTX';
        case 0xa9: return 'FCSTY';
        case 0xaa: return 'INSR';
        case 0xab: return 'DELR';
        case 0xac: return 'WMEAN';
        case 0xad: return 'LIN' + char(HP42_SIGMA);
        case 0xae: return 'ALL' + char(HP42_SIGMA);
        // XROM 03
        case 0xe2: return 'HEXM';
        case 0xe3: return 'DECM';
        case 0xe4: return 'OCTM';
        case 0xe5: return 'BINM';
        case 0xe6: return 'BASE+';
        case 0xe7: return 'BASE-';
        case 0xe8: return 'BASE' + char(HP42_MULTIPLY);
        case 0xe9: return 'BASE' + char(HP42_DIVIDE);
        case 0xea: return 'BASE+/-';
        // NOT FOUND
        default: return XROMString(0xa0, byte);
    }
}

function XROMA1() {
    let byte = popByte();
    return XROMString(0xa1, byte);
}

function XROMA2() {
    let byte = popByte();
    switch (byte) {
        // XROM 09
        case 0x59: return 'POLAR';
        case 0x5a: return 'RECT';
        case 0x5b: return 'RDX.';
        case 0x5c: return 'RDX,';
        case 0x5d: return 'ALL';
        case 0x5e: return 'MENU';
        case 0x5f: return 'X' + char(HP42_GREATERTHANOREQUAL) + '0?';
        case 0x60: return 'X' + char(HP42_GREATERTHANOREQUAL) + 'Y?';
        case 0x62: return 'CLKEYS';
        case 0x63: return 'KEYASN';
        case 0x64: return 'LCLBL';
        case 0x65: return 'REAL?';
        case 0x66: return 'MAT?';
        case 0x67: return 'CPX?';
        case 0x68: return 'STR?';
        case 0x6a: return 'CPXRES';
        case 0x6b: return 'REALRES';
        case 0x6c: return 'EXITALL';
        case 0x6d: return 'CLMENU';
        case 0x6e: return 'GETKEY';
        case 0x6f: return 'CUSTOM';
        case 0x70: return 'ON';
        // NOT FOUND
        default: return XROMString(0xa2, byte);
    }
}

function XROMA3() {
    let byte = popByte();
    return XROMString(0xa3, byte);
}

function XROMA4() {
    let byte = popByte();
    return XROMString(0xa3, byte);
}

function XROMA5() {
    let byte = popByte();
    switch (byte) {
        // XROM 22
        case 0x87: return 'NOT';
        case 0x88: return 'AND';
        case 0x89: return 'OR';
        case 0x8a: return 'XOR';
        case 0x8b: return 'ROTXY';
        case 0x8c: return 'BIT?';
        // NOT FOUND
        default: return XROMString(0xa5, byte);
    }
}

function XROMA6() {
    let byte = popByte();
    switch (byte) {
        // XROM 24
        case 0x31: return 'AIP';
        // XROM 25
        case 0x41: return 'ALENG';
        case 0x46: return 'AROT';
        case 0x47: return 'ATOX';
        case 0x5c: return 'POSA';
        case 0x6f: return 'XTOA';
        case 0x78: return char(HP42_SIGMA) + 'REG?';
        // FREE42-SPECIFIC (HP-41 TIME MODULE EMULATION)
        case 0x81: return 'ADATE';
        case 0x84: return 'ATIME';
        case 0x85: return 'ATIME24';
        case 0x86: return 'CLK12';
        case 0x87: return 'CLK24';
        case 0x8c: return 'DATE';
        case 0x8d: return 'DATE+';
        case 0x8e: return 'DDAYS';
        case 0x8f: return 'DMY';
        case 0x90: return 'DOW';
        case 0x91: return 'MDY';
        case 0x9c: return 'TIME';
        // XROM 27
        case 0xc9: return 'TRANS';
        case 0xca: return 'CROSS';
        case 0xcb: return 'DOT';
        case 0xcc: return 'DET';
        case 0xcd: return 'UVEC';
        case 0xce: return 'INVRT';
        case 0xcf: return 'FNRM';
        case 0xd0: return 'RSUM';
        case 0xd1: return 'R<>R';
        case 0xd2: return 'I+';
        case 0xd3: return 'I-';
        case 0xd4: return 'J+';
        case 0xd5: return 'J-';
        case 0xd6: return 'STOEL';
        case 0xd7: return 'RCLEL';
        case 0xd8: return 'STOIJ';
        case 0xd9: return 'RCLIJ';
        case 0xda: return 'NEWMAT';
        case 0xdb: return 'OLD';
        case 0xdc: return char(HP42_LEFTARROW);
        case 0xdd: return char(HP42_RIGHTARROW);
        case 0xde: return '^';
        case 0xdf: return char(HP42_DOWNARROW);
        case 0xe1: return 'EDIT';
        case 0xe2: return 'WRAP';
        case 0xe3: return 'GROW';
        case 0xe7: return 'DIM?';
        case 0xe8: return 'GETM';
        case 0xe9: return 'PUTM';
        case 0xea: return '[MIN]';
        case 0xeb: return '[MAX]';
        case 0xec: return '[FIND]';
        case 0xed: return 'RNRM';
        // NOT FOUND
        default: return XROMString(0xa6, byte);
    }
}

function XROMA7() {
    let byte = popByte();
    switch (byte) {
        // XROM 29
        case 0x48: return 'PRA';
        case 0x52: return 'PR' + char(HP42_SIGMA);
        case 0x53: return 'PRSTK';
        case 0x54: return 'PRX';
        case 0x5b: return 'MAN';
        case 0x5c: return 'NORM';
        case 0x5d: return 'TRACE';
        case 0x5e: return 'PRON';
        case 0x5f: return 'PROFF';
        case 0x60: return 'DELAY';
        case 0x61: return 'PRUSR';
        case 0x62: return 'PRLCD';
        case 0x63: return 'CLLCD';
        case 0x64: return 'AGRAPH';
        case 0x65: return 'PIXEL';
        case 0xd5: return 'YMD';
        // NOT FOUND
        default: return XROMString(0xa7, byte);
    }
}

function decode2ByteGTO() {
    let byte = popByte();
    // ignore the next byte
    popByte();
    return 'GTO ' + (byte - 0xb1).toString().padStart(2, '0');
}

function decodeBranchInd() {
    let opcode = popByte();
    let address = popByte();
    let instr = (address >= 0x80) ? 'XEQ IND' : 'GTO IND';
    let effective = address & 0x7f;
    instr += decodeTargetByte(effective);
    return instr;
}

function decodeGlobal() {
    // ignore this byte and the next
    popByte();
    popByte();
    let byte = popByte();
    if (byte == 0x0d)
        return 'END';
    else if ((byte & 0xf0) == 0xf0) {
        // it's a global label
        let strLength = (byte & 0x0f) - 1;
        // ignore the next byte
        popByte();
        return 'LBL ' + readStringLiteral(strLength);
    }
    else {
        bombOut("Invalid Global opcode");
    }
}

function decode3Byte() {
    let opcode = popByte();
    // ignore the next byte
    popByte();
    // Get the destination
    let address = (popByte() & 0x7f); // bit 7 is ignored
    let instruction;
    if ((opcode & 0xf0) == 0xd0)
        instruction = 'GTO';
    else
        instruction = 'XEQ';
    return instruction + decodeTargetByte(address, true);
}






