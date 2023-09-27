const HP42_CAN_BE_NAME = 0x0001;
const HP42_CAN_BE_0099 = 0x0002;
const HP42_CAN_BE_STACK = 0x0004;
const HP42_CAN_BE_LCLBL = 0x0008;
const HP42_CAN_BE_IND_NAME = 0x0010;
const HP42_CAN_BE_IND_0099 = 0x0020;
const HP42_CAN_BE_IND_STACK = 0x0040;
const HP42_CAN_BE_SINGLE_DIGIT = 0x0080;
const HP42_CAN_BE_ANYTHING = 0x007f;
const HP42_LABEL = HP42_CAN_BE_NAME | HP42_CAN_BE_0099 | HP42_CAN_BE_LCLBL;
const HP42_BRANCH_TARGET = HP42_CAN_BE_ANYTHING & ~HP42_CAN_BE_STACK;
const HP42_STORAGE_TARGET = HP42_CAN_BE_ANYTHING & ~HP42_CAN_BE_LCLBL;
const HP42_ALL_INDIRECT = HP42_CAN_BE_IND_NAME | HP42_CAN_BE_IND_0099 | HP42_CAN_BE_IND_STACK;
const HP42_VARIABLE = HP42_CAN_BE_NAME | HP42_ALL_INDIRECT;
const HP42_0099 = HP42_CAN_BE_0099 | HP42_ALL_INDIRECT;
const HP42_09 = HP42_CAN_BE_SINGLE_DIGIT | HP42_ALL_INDIRECT;
const HP42_NAME_RETURNED = 0x01000;
const HP42_0099_RETURNED = 0x02000;
const HP42_LCLBL_RETURNED = 0x04000;
const HP42_STACK_RETURNED = 0x08000;
const HP42_SINGLE_DIGIT_RETURNED = 0x10000;
const HP42_INDIRECT_RETURNED = 0x20000;
const HP42_MEM_OP_NONE = 0;
const HP42_MEM_OP_PLUS = 1;
const HP42_MEM_OP_MINUS = 2;
const HP42_MEM_OP_MULTIPLY = 3;
const HP42_MEM_OP_DIVIDE = 4;
const HP42_END = 'C0000D';

let line = 0;

function encodeProgram_v(prog, greedyComments = false, translateComments = false) {
    let lfDelimited = prog.replace(/\r/g, "\n").replace(/\r\n/g, "\n");
    let useThis = lfDelimited.replace(/“/g, '"').replace(/”/g, '"').replace(/„/g, '"').replace(/‟/g, '"');
    let progLines = useThis.split("\n");
    let success = true;
    line = 0;
    let error = "";
    let totalBytes = 0;
    let returned = {};
    returned['lines'] = [];
    let rawHex = '';

    try {
        progLines.forEach(function (progLine) {
            line++;
            let output = encodeLine(progLine, greedyComments, translateComments);
            let thisLine = {};
            thisLine['hex'] = output['hex'];
            thisLine['comment'] = output['comment'];
            thisLine['pc'] = totalBytes.toString(16).toUpperCase().padStart(4, '0');
            returned['lines'].push(thisLine);
            totalBytes += output['bytes'];
            rawHex += output['hex'];
        });
    } catch (e) {
        success = false;
        error = e.message;
    }
    if (success) {
        // Is there an "END" at the end of this program?
        let appendEnd = (rawHex.length < HP42_END.length);
        if (!appendEnd) {
            let pos = rawHex.length - HP42_END.length;
            let last3bytes = rawHex.substring(pos);
            appendEnd = (last3bytes != HP42_END);
        }
        if (appendEnd) {
            let lastLine = new Object();
            lastLine.hex = HP42_END;
            lastLine.comment = null;
            lastLine.pc = totalBytes.toString(16).toUpperCase().padStart(4, '0');
            totalBytes += HP42_END.length >> 1;
            returned.lines.push(lastLine);
            rawHex += HP42_END;
        }
    }
    returned['success'] = success;
    returned['error'] = error;
    returned['rawhex'] = rawHex;
    returned['bytes'] = totalBytes;
    return returned;
}

function encodeLine(l, greedyComments, translateComments) {
    let returned = new Object();
    let comment = null;
    var atPos = l.indexOf('@');

    let hex;
    let atPosState = (atPos === -1)
    if (atPosState) {//1
        hex = encodeLineEx(l);
    } else {
        let quotePos = l.indexOf('"');
        if (quotePos === -1 || quotePos > atPos) {
            comment = l.substring(atPos + 1);
            l = l.substring(0, atPos);
            hex = encodeLineEx(l);
        } else {
            let segments = l.split('@');
            let nbSegments = segments.length;
            let demarcation = greedyComments ? 1 : nbSegments;
            let validSyntaxFound = false;
            while (demarcation >= 1 && demarcation <= nbSegments) {
                let instrArray = segments.slice(0, demarcation);
                let commentArray = segments.slice(demarcation);
                let instr = instrArray.join('@').trim();
                comment = (demarcation === nbSegments) ? null : commentArray.join('@');
                try {
                    hex = encodeLineEx(instr);
                    validSyntaxFound = true;
                    break;
                } catch (ex) {
                    if (greedyComments) {
                        demarcation++;
                    } else {
                        demarcation--;
                    }
                }
            }
            if (!validSyntaxFound) {
                bombOut_e("Could not parse '" + $l + "'");
            }
        }
    }
    returned['hex'] = hex;
    returned['comment'] = (comment === null) ? null : translateComments ? UTF8Equivalent(comment) : comment;
    returned['bytes'] = hex.length >> 1;
    return returned;
}

function encodeLineEx(l) {
    l = l.trim();
    if (l === '') return '';

    l = l.replace(/^\d{2,}[\s▸](.*)$/, "$1");
    let u = l.toUpperCase();

    if (l[0] === '{') return '';

    let head4 = u.substring(0, 4);
    let tail4 = l.substring(4);
    let head5 = u.substring(0, 5);
    let tail5 = l.substring(5);
    let hex = { "hex": "" };

    if (encodeLBL(l, hex)) {
        return hex.hex;
    }
    if (u === 'END' || u === '.END.') {
        return HP42_END; //1   
    }
    if (encodeBranch(l, hex)) {
        return hex.hex;
    }
    if (encodeMemOp(l, hex)) {
        return hex.hex;
    }
    if (l === '+') return '40';
    if (l === '-') return '41';
    if (l === 'x' || l === '×' || l === '*' || l === 'X') return '42';
    if (l === '/' || l === '÷' || l === '\\:-') return '43';

    const pattern = `^(([|]-|${codepoint(0x251c)})\\s*)?"(.*)"$`;
    const regex = new RegExp(pattern);
    if (regex.test(l)) {
        const regs = l.match(RegExp(pattern));
        // return encodeString(regs[3], regs[2].length > 0);
        return encodeString(regs[3], (regs[2] || '').length > 0);
    }
    /* ******** FIRST ROW */
    /* Σ+ */    if (u === '\\GS+' || u === 'SUM+' || u === 'Σ+') return '47';
    /* Σ- */    if (u === '\\GS-' || u === 'SUM-' || u === 'Σ-') return '48';
    /* 1/X */   if (u === '1/X') return '60';
    /* Y↑X */   if (u === 'Y^X' || u === 'Y↑X') return '53';
    /* SQRT */  if (l === '\\v/' || l === '\\v/x' || l === '√' || u === '√X' || u === 'SQRT') return '52';
    /* X↑2 */   if (u === 'X^2' || u === 'X↑2') return '51';
    /* LOG */   if (u === 'LOG') return '56';
    /* 10↑X */  if (u === '10^X' || u === '10↑X') return '57';
    /* LN */    if (u === 'LN') return '50';
    /* E↑X */   if (u === 'E^X' || u === 'E↑X') return '55';

    if (/^[-+]?[\.0-9]/.test(l)) {
        return encodeNumber(l);
    }
    /* ******** SECOND ROW */
    /* COMPLEX */   if (u === 'COMPLEX') return 'A072';
    /* % */		    if (l === '%') return '4C';
    /* R↓ */	    if (u === 'R↓' || u === 'R\\V' || u === 'RV' || u === 'RDN') return '75'; /* HP-41 equivalent */
    /* PI */	    if (u === 'PI' || l === 'π' || u === '\\PI') return '72';
    /* SIN */	    if (u === 'SIN') return '59';
    /* ASIN */	    if (u === 'ASIN') return '5C';
    /* COS */	    if (u === 'COS') return '5A';
    /* ACOS */	    if (u === 'ACOS') return '5D';
    /* TAN */	    if (u === 'TAN') return '5B';
    /* ATAN */	    if (u === 'ATAN') return '5E';
    /* ******** THIRD ROW */
    /* ENTER */	    if (u === 'ENTER' || u === 'ENTER^' || u === 'ENTER↑') return '83'; /* HP-41 equivalent */
    /* X<>Y */	    if (u === 'X<>Y') return '71';
    /* LASTX */	    if (u === 'LASTX') return '76';
    /* +/- */	    if (u === '+/-' || u === 'CHS') return '54'; /* HP-41 equivalent */
    /* R/S -- STOP */
    if (u === 'STOP' || u === 'R/S') return '84';

    if (encodeMODESmenu(l, hex)) return hex.hex;

    /* DISP menu */
    if (encodeDISPmenu(l, hex)) return hex.hex;

    /* CLEAR menu */
    if (encodeCLEARmenu(l, hex)) return hex.hex;

    /* HP-41 RTC extensions */
    if (encodeHP41extensions(l, hex)) return hex.hex;

    /* SOLVER menu */
    if (encodeSOLVERmenu(l, hex)) return hex.hex;

    /* ∫f(x) menu */
    if (encodeINTEGmenu(l, hex)) return hex.hex;

    /* MATRIX menu */
    if (encodeMATRIXmenu(l, hex)) return hex.hex;

    /* STAT menu */
    if (encodeSTATmenu(l, hex)) return hex.hex;

    /* BASE menu */
    if (encodeBASEmenu(l, hex)) return hex.hex;

    /* CONVERT menu */
    if (encodeCONVERTmenu(l, hex)) return hex.hex;

    /* FLAGS menu */
    if (encodeFLAGSmenu(l, hex)) return hex.hex;

    /* PROB menu */
    if (encodePROBmenu(l, hex)) return hex.hex;
    /* ASSIGN? */
    if (encodeASSIGN(l, hex)) return hex.hex;
    /* PGM.FCN menu */
    if (encodePGMFCNmenu(l, hex)) return hex.hex;
    /* PRINT menu */
    if (encodePRINTmenu(l, hex)) return hex.hex;
    /* Miscellaneous remaining functions */
    if (encodeMiscFuncs(l, hex)) return hex.hex;
    /* Last ditch attempt, is it an XROM statement? */
    if (encodeXROM(l, hex)) return hex.hex;

    bombOut_e("Invalid instruction '" + l + "'");
}

function encodeLBL(line, hex) {
    let cmd = line.match(/^lbl\s+([^\s].*)$/i);
    hex.hex = '';
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    if (cmd !== null) {
        let data = encodeTarget(cmd[1], HP42_LABEL, typeReturned, lengthByte);

        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            hex.hex = 'C000' + (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + '00' + data;
        } else if ((typeReturned.typeReturned & HP42_0099_RETURNED) && (data < 15)) {
            hex.hex = (data + 1).toString(16).padStart(2, '0').toUpperCase();
        } else {
            hex.hex = 'CF' + data.toString(16).padStart(2, '0').toUpperCase();
        }
        return true;
    } else {
        return false;
    }
}

function encodeBranch(line, hex) {
    hex.hex = '';
    let cmd = line.match(/^(xeq|gto)\s+([^\s].*)$/i);
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    if (cmd !== null) {
        let op = cmd[1].toUpperCase();
        let data = this.encodeTarget(cmd[2], HP42_BRANCH_TARGET, typeReturned, lengthByte);
        let indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) !== 0);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            if (indirect) {
                var opcode = (op == 'GTO') ? 'AE' : 'AF';
                hex.hex = lengthByte.lengthByte.toString(16).padStart(2, '0').toUpperCase() + opcode + data;
            } else {
                var opcode = (op == 'GTO') ? '1D' : '1E';
                hex.hex = opcode + (lengthByte.lengthByte - 1).toString(16).padStart(2, '0').toUpperCase() + data;
            }
        } else if ((op == 'GTO') && (data < 15)) {
            var opcode = 0xb1 + data;
            hex.hex = opcode.toString(16).padStart(2, '0').toUpperCase() + '00';
        } else if (data >= 0x80) {
            if (op == 'GTO') data &= 0x7f;
            hex.hex = 'AE' + data.toString(16).padStart(2, '0').toUpperCase();
        } else if (op == 'XEQ') {
            hex.hex = 'E000' + data.toString(16).padStart(2, '0').toUpperCase();
        } else {
            hex.hex = 'D000' + data.toString(16).padStart(2, '0').toUpperCase();
        }
        return true;
    }
    return false;
}

function encodeMemOp(line_v, hex) {//1
    hex.hex = '';
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    let regex = /^(STO?|RCL)([+]|[-]|[x*×]|(\/|÷|\\\\:-))?\s+([^\s].*)$/i;
    if (line_v.match(/^LSTO\s+([^\s].*)$/i) !== null) {
        var cmd = line_v.match(/^LSTO\s+([^\s].*)$/);
        var data = encodeTarget(cmd[1], HP42_VARIABLE, typeReturned, lengthByte);
        var indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) !== 0);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            var base = 0xc7 + (indirect ? 0x08 : 0x00);
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + base.toString(16).padStart(2, '0').toUpperCase() + data;

        } else {
            hex.hex = 'F2ED' + data.toString(16).padStart(2, '0').toUpperCase();
        }
        return true;
    }
    if (line_v.match(regex) !== null) {
        var cmd = line_v.match(regex);
        var op = cmd[1].toUpperCase();
        var math = cmd[2];
        var target = cmd[4];
        var data = this.encodeTarget(target, HP42_STORAGE_TARGET, typeReturned, lengthByte);
        var indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) !== 0);
        switch (math) {
            case '+':
                var opMath = HP42_MEM_OP_PLUS;
                break;
            case '-':
                var opMath = HP42_MEM_OP_MINUS;
                break;
            case '*':
            case 'x':
            case '×':
                var opMath = HP42_MEM_OP_MULTIPLY;
                break;
            case '/':
            case '\\:-':
            case '÷':
                var opMath = HP42_MEM_OP_DIVIDE;
                break;
            default:
                var opMath = HP42_MEM_OP_NONE;
        }

        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            var base = 0x81 + opMath + (indirect ? 0x08 : 0) + ((op == 'RCL') ? 0x10 : 0);
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0') + base.toString(16).padStart(2, '0') + data;
        } else {
            if ((op == 'RCL') && (opMath != HP42_MEM_OP_NONE)) {
                var opcode = 0xd0 + opMath;
                hex.hex = 'F2' + opcode.toString(16).padStart(2, '0').toUpperCase() + data.toString(16).toUpperCase().padStart(2, '0');
            } else if ((data < 0x10) && (opMath == HP42_MEM_OP_NONE)) {
                var opcode = 0x20 + data + ((op == 'STO') ? 0x10 : 0);
                hex.hex = opcode.toString(16).toUpperCase().padStart(2, '0');
            } else {
                var opcode = 0x90 + ((op[0] == 'S') ? 1 : 0) + opMath;
                hex.hex = opcode.toString(16).padStart(2, '0').toUpperCase() + data.toString(16).padStart(2, '0').toUpperCase();

            }
        }
        return true;
    } else {
        return false;
    }
}

function encodeTarget(target, allowed, typeReturned, lengthByte, maxStrLen = 14) {
    typeReturned.typeReturned = '';
    lengthByte.lengthByte = '';
    const regex = /^(ind\s+)?("(.*)"|\d\d?|(st\s+)?([lxyzt])|[A-Ja-e])/i;
    if (regex.test(target)) {
        let parts = target.match(regex);
        let indirect = false;
        if (parts[1] == undefined) {
            indirect = false;
        } else indirect = (parts[1].length > 0);
        if (indirect && ((allowed & HP42_ALL_INDIRECT) === 0)) {
            bombOut_e("Indirect target '" + target + "' not allowed");
        }
        if (parts[2][0] === '"') {

            if ((!indirect && !(allowed & HP42_CAN_BE_NAME)) || (indirect && !(allowed & HP42_CAN_BE_IND_NAME))) {
                bombOut_e("Cannot use (indirect) variable/label");
            }
            let hex = encodeStringLiteral(parts[3]);

            if ((hex.length >> 1) > maxStrLen) {
                bombOut_e("Name '" + parts[3] + "' too long");
            }
            lengthByte.lengthByte = 0xf1 + (hex.length >> 1);
            typeReturned.typeReturned = HP42_NAME_RETURNED | (indirect ? HP42_INDIRECT_RETURNED : 0x00);
            return hex;
        }
        if ((parts[2].length === 1) && (parts[2].charCodeAt(0) >= 0x30) && (parts[2].charCodeAt(0) <= 0x39)) {

            if (indirect) bombOut_e("Indirect single digit not allowed");
            if (!(allowed & HP42_CAN_BE_SINGLE_DIGIT)) {
                bombOut_e("Single digit target cannot be used");
            }
            typeReturned.typeReturned = HP42_SINGLE_DIGIT_RETURNED;
            return parseInt(parts[2]);
        }
        if (/^\d\d$/i.test(parts[2])) {
            if ((indirect && !(allowed & HP42_CAN_BE_IND_0099)) | (!indirect && !(allowed & HP42_CAN_BE_0099))) {
                bombOut_e("Cannot use (indirect) register/label number");
            }
            typeReturned.typeReturned = HP42_0099_RETURNED | (indirect ? HP42_INDIRECT_RETURNED : 0x00);
            return parseInt(parts[2]) + (indirect ? 0x80 : 0x00);
        }
        // Nope. Maybe a stack register?
        if (/^(st\s+)?([lxyzt])$/i.test(parts[2])) {
            let register = parts[2].match(/^(st\s+)?([lxyzt])$/i)

            if ((indirect && !(allowed & HP42_CAN_BE_IND_STACK)) || (!indirect && !(allowed & HP42_CAN_BE_STACK))) {
                bombOut_e("Cannot use (indirect) stack register");
            }
            switch (register[2].toUpperCase()) {
                case 'T':
                    byte = 0x70;
                    break;
                case 'Z':
                    byte = 0x71;
                    break;
                case 'Y':
                    byte = 0x72;
                    break;
                case 'X':
                    byte = 0x73;
                    break;
                default:
                    byte = 0x74;
            }
            typeReturned.typeReturned = HP42_STACK_RETURNED;
            if (indirect) {
                byte |= 0x80;
                typeReturned.typeReturned |= HP42_INDIRECT_RETURNED;
            }
            return byte;
        }
        // Must be a local label
        if (indirect) bombOut_e("Indirect local label not allowed");
        if (allowed & HP42_CAN_BE_LCLBL) {

            byte = parts[2].charCodeAt(0);
            if (byte >= 0x61)
                byte += 0x1a;
            else
                byte += 0x25;
        } else {
            bombOut_e("Local label is not a valid target");
        }
        typeReturned.typeReturned = HP42_LCLBL_RETURNED;
        return byte;
    } else {
        bombOut_e("Cannot parse target '" + target + "'");
    }
}

function encodeNumber(str) {//1
    if (/^[-+]?(\d*\.)?\d+([eEᴇ][+-]?\d+)?$/i.test(str)) {
        let hex = '';
        while (str.length > 0) {
            let c = str.substring(0, 1);
            str = str.substring(1);
            if (c == '+') continue;
            if (c == '-')
                hex += '1C';
            else if ((c == 'E') || (c == 'e') || (c == 'ᴇ'))
                hex += '1B';
            else if (c == '.')
                hex += '1A';
            else
                hex += '1' + c;
        }
        return hex + '00';
    } else {
        bombOut_e("Invalid number format");
    }
}

function encodeString(str, append) {
    let hex = encodeStringLiteral(str);
    let chars = hex.length >> 1;
    let maxlength = (append ? 14 : 15);
    if (chars > maxlength) bombOut_e(`String "${str}" too long`);
    if (append) {
        hex = '7F' + hex;
        chars++;
    }
    let header = 0xf0 + chars;
    return header.toString(16).padStart(2, '0').toUpperCase() + hex;
}

function encodeStringLiteral(str, withHeader = false) {
    const hp42str = translateString(str);
    let hex = '';
    const len = hp42str.length;
    for (let i = 0; i < len; i++) {
        hex += hp42str[i].charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
    }
    let lenWithHeader = len + 0xf0;
    return (withHeader ? lenWithHeader.toString(16).padStart(2, '0') : '') + hex;
}

function encodeMODESmenu(line, hex) {
    hex.hex = "";
    if (/^deg$/i.test(line)) { hex.hex = '80'; return true; }
    if (/^rad$/i.test(line)) { hex.hex = '81'; return true; }
    if (/^gr(a)?d$/i.test(line)) { hex.hex = '82'; return true; }
    if (/^rect$/i.test(line)) { hex.hex = 'A25A'; return true; }
    if (/^polar$/i.test(line)) { hex.hex = 'A259'; return true; }
    if (/^size (.+)$/i.test(line)) {
        var arg = line.match(/^size (.+)$/i)[1];
        if (/^\d{1,4}$/i.test(arg)) {
            var nbRegs = parseInt(arg);
            hex.hex = 'F3F7' + nbRegs.toString(16).padStart(4, '0').toUpperCase();
            return true;
        } else {
            bombOut_e("Invalid number of registers '" + arg + "'");
        }
    }
    if (/^(cpx|real)res$/i.test(line)) {
        if (line.match(/^(cpx|real)res$/i)[1].toUpperCase() == 'REAL') {
            hex.hex = 'A26B';
        } else {
            hex.hex = 'A26A';
        }
        return true;
    }
    if (/^keyasn$/i.test(line)) { hex.hex = 'A263'; return true; }
    if (/^lclbl$/i.test(line)) { hex.hex = 'A264'; return true; }
    return false;
}

function encodeDISPmenu(line, hex) {
    hex.hex = "";
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    if (/^((fix|sci|eng)\s+(.*)|all)$/i.test(line)) {
        let precision = line.match(/^((fix|sci|eng)\s+(.*)|all)$/i);
        if (precision[1].toUpperCase() == 'ALL') {
            hex.hex = 'A25D';
            return true;
        }
        let cmd = precision[2].toUpperCase();
        let data = encodeTarget(precision[3], HP42_0099, typeReturned, lengthByte);
        if (typeReturned.typeReturned & HP42_INDIRECT_RETURNED) {
            // type of indirect
            let targetType = typeReturned.typeReturned & ~HP42_INDIRECT_RETURNED;
            if (targetType == HP42_NAME_RETURNED) {
                switch (cmd) {
                    case 'FIX': opcode = 'DC'; break;
                    case 'SCI': opcode = 'DD'; break;
                    default: opcode = 'DE';
                }
                hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0') + opcode + data;
            }
            else {
                switch (cmd) {
                    case 'FIX': opcode = '9C'; break;
                    case 'SCI': opcode = '9D'; break;
                    default: opcode = '9E';
                }
                hex.hex = opcode + data.toString(16).padStart(2, '0');
            }
        }
        else {
            if (data <= 9) {
                switch (cmd) {
                    case 'FIX': opcode = '9C'; break;
                    case 'SCI': opcode = '9D'; break;
                    default: opcode = '9E';
                }
                hex.hex = opcode + data.toString(16).padStart(2, '0');
            }
            else {
                if (data > 11) {
                    bombOut_e("Precision cannot be above 11");
                }
                switch (cmd) {
                    case 'FIX': base = 0xd5; break;
                    case 'SCI': base = 0xd6; break;
                    default: base = 0xd7;
                }
                base += 0x10 * (data - 10);
                hex.hex = 'F1' + base.toString(16).padStart(2, '0');
            }
        }
        return true;
    }
    if (line.match(/^rdx([.,])$/i) !== null) {
        let regs = line.match(/^rdx([.,])$/i);
        hex.hex = 'A25' + ((regs[1] == '.') ? 'B' : 'C');
        return true;
    }
    return false;
}

function encodeCLEARmenu(line, hex) {
    hex.hex = "";
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    if (/^cl(sum|\\\\gs|Σ)$/i.test(line)) {
        hex.hex = '70';
        return true;
    }
    if (/^clp\s+([^\s].*)$/i.test(line)) {
        let regs = line.match(/^clp\s+([^\s].*)$/i);
        let data = encodeTarget(regs[1], HP42_CAN_BE_NAME, typeReturned, lengthByte);
        hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + 'F0' + data;
        return true;
    }
    if (/^clv\s+([^\s].*)$/i.test(line)) {
        let regs = line.match(/^clv\s+([^\s].*)$/i);
        let data = encodeTarget(regs[1], HP42_VARIABLE, typeReturned, lengthByte);
        let indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) != 0);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            let opcode = (indirect ? 'B8' : 'B0');
            hex.hex = (lengthByte.lengthByte).toString(16).toUpperCase().padStart(2, '0') + opcode + data;
            return true;
        }
        if (typeReturned.typeReturned & HP42_0099_RETURNED) {
            hex.hex = 'F2D8' + data.toString(16).padStart(2, '0').toUpperCase();
            return true;
        }
        if (typeReturned.typeReturned & HP42_STACK_RETURNED) {
            hex.hex = 'F2D8' + data.toString(16).padStart(2, '0').toUpperCase();
            return true;
        }
    }

    const cmdRegex = /^cl(st|a|d|x|rg|keys|lcd|menu)$/i; // i flag for case-insensitivity
    if (cmdRegex.test(line)) {
        let regs = line.match(cmdRegex); // Use match to capture groups
        let firstChar = regs[1][0].toUpperCase();
        switch (firstChar) {
            case 'A': hex.hex = '87'; break;
            case 'D': hex.hex = '7F'; break;
            case 'K': hex.hex = 'A262'; break;
            case 'L': hex.hex = 'A763'; break;
            case 'M': hex.hex = 'A26D'; break;
            case 'R': hex.hex = '8A'; break;
            case 'S': hex.hex = '73'; break;
            default: hex.hex = '77';
        }
        return true;
    }
    return false;
}

function encodeHP41extensions(line, hex) {
    hex.hex = "";
    var cmd = line.toUpperCase();
    switch (cmd) {
        case 'ADATE': hex.hex = 'A681'; break;
        case 'ATIME': hex.hex = 'A684'; break;
        case 'ATIME24': hex.hex = 'A685'; break;
        case 'CLK12': hex.hex = 'A686'; break;
        case 'CLK24': hex.hex = 'A687'; break;
        case 'DATE': hex.hex = 'A68C'; break;
        case 'DATE+': hex.hex = 'A68D'; break;
        case 'DDAYS': hex.hex = 'A68E'; break;
        case 'DMY': hex.hex = 'A68F'; break;
        case 'DOW': hex.hex = 'A690'; break;
        case 'MDY': hex.hex = 'A691'; break;
        case 'TIME': hex.hex = 'A69C'; break;
        case 'YMD': hex.hex = 'A7D5'; break;
        default: return false;
    }
    return true;
}

function encodeSOLVERmenu(line, hex) {
    hex.hex = "";
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    let cmdRegex = /^(mvar|pgmslv|solve)\s+([^ ].*)$/i; // i flag for case-insensitivity
    let cmd = line.match(cmdRegex);
    if (cmdRegex.test(line)) {
        let initial = cmd[1][0].toUpperCase();
        if (initial === 'M') {
            let data = encodeTarget(cmd[2], HP42_CAN_BE_NAME, typeReturned, lengthByte);
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + '90' + data;
            return true;
        }
        let data = encodeTarget(cmd[2], HP42_VARIABLE, typeReturned, lengthByte);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            let opcode = (initial === 'P') ? ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) ? 'BD' : 'B5') : ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) ? 'BF' : 'B7');
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + opcode + data;
        } else {
            let opcode = (initial === 'P') ? 'F2E9' : 'F2EB';
            hex.hex = opcode + data.toString(16).padStart(2, '0').toUpperCase();
        }
        return true;
    }
    return false;
}

function encodeINTEGmenu(line, hex) {
    hex.hex = "";
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    const cmdRegex = /^(pgmint|integ)\s+([^ ].*)$/i;
    if (cmdRegex.test(line)) {
        let cmd = line.match(cmdRegex);
        let op = cmd[1].toUpperCase();
        let data = encodeTarget(cmd[2], HP42_VARIABLE, typeReturned, lengthByte);
        let indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) !== 0);
        let isPGMINT = (op === 'PGMINT');
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            if (isPGMINT) {
                var opcode = indirect ? 'BC' : 'B4';
            } else {
                var opcode = indirect ? 'BE' : 'B6';
            }
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + opcode + data;
        } else {
            var opcode = isPGMINT ? 'E8' : 'EA';
            hex.hex = 'F2' + opcode + data.toString(16).padStart(2, '0').toUpperCase();
        }
        return true;
    } else return false;
}

function encodeMATRIXmenu(l, hex) {
    hex.hex = "";
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    const cmdRegex = /^(dim|index|editn)\s+([^ ].*)$/i; // i flag for case-insensitivity

    if (cmdRegex.test(l)) {
        const cmd = l.match(cmdRegex); // Use match to capture groups
        let data = encodeTarget(cmd[2], HP42_VARIABLE, typeReturned, lengthByte);
        let op = cmd[1].toUpperCase();
        let indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) != 0);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            switch (op) {
                case 'DIM': opcode = indirect ? 'CC' : 'C4'; break;
                case 'EDITN': opcode = indirect ? 'CE' : 'C6'; break;
                default: opcode = indirect ? '8F' : '87';
            }
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0') + opcode + data;
        } else {
            switch (op) {
                case 'DIM': opcode = 'EC'; break;
                case 'EDITN': opcode = 'EF'; break;
                default: opcode = 'DA';
            }
            hex.hex = 'F2' + opcode + data.toString(16).padStart(2, '0');
        }
    } else {
        let op = l.toUpperCase();
        let found = true;
        switch (op) {
            case 'CROSS':
                hex.hex = 'A6CA';
                break;
            case 'DET':
                hex.hex = 'A6CC';
                break;
            case 'DOT':
                hex.hex = 'A6CB';
                break;
            case 'GETM':
                hex.hex = 'A6E8';
                break;
            case 'EDIT':
                hex.hex = 'A6E1';
                break;
            case 'INVRT':
                hex.hex = 'A6CE';
                break;
            case 'NEWMAT':
                hex.hex = 'A6DA';
                break;
            case 'PUTM':
                hex.hex = 'A6E9';
                break;
            case 'RCLEL':
                hex.hex = 'A6D7';
                break;
            case 'RCLIJ':
                hex.hex = 'A6D9';
                break;
            case 'STOEL':
                hex.hex = 'A6D6';
                break;
            case 'STOIJ':
                hex.hex = 'A6D8';
                break;
            case 'TRANS':
                hex.hex = 'A6C9';
                break;
            case 'UVEC':
                hex.hex = 'A6CD';
                break;
            case 'I+':
                hex.hex = 'A6D2';
                break;
            case 'I-':
                hex.hex = 'A6D3';
                break;
            case 'J+':
                hex.hex = 'A6D4';
                break;
            case 'J-':
                hex.hex = 'A6D5';
                break;
            default:
                return false;
        }
    }
    return true;
}

function encodeSTATmenu(l, hex) {
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    hex.hex = "";
    const cmdRegex = /^(Σ|sum|\\\\gs)reg\s+([^ ].*)$/i; // i flag for case-insensitivity

    if (cmdRegex.test(l)) {
        // ΣREG
        let cmd = l.match(cmdRegex);
        let data = encodeTarget(cmd[2], HP42_0099, typeReturned, lengthByte);

        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0') + 'DB' + data;
        } else {
            hex.hex = '99' + data.toString(16).padStart(2, '0');
        }
    }
    else {
        let u = l.toUpperCase();
        switch (u) {
            case 'SUM': hex.hex = 'A0A5'; break;
            case 'MEAN': hex.hex = '7C'; break;
            case 'WMEAN': hex.hex = 'A0AC'; break;
            case 'SDEV': hex.hex = '7D'; break;
            case 'ALLSUM':
            case 'ALL\\GS':
            case 'ALLΣ': hex.hex = 'A0AE'; break;
            case 'LINSUM':
            case 'LIN\\GS':
            case 'LINΣ': hex.hex = 'A0AD'; break;
            case 'SUMREG?':
            case '\\GSREG?':
            case 'ΣREG?': hex.hex = 'A678'; break;
            case 'FCSTX': hex.hex = 'A0A8'; break;
            case 'FCSTY': hex.hex = 'A0A9'; break;
            case 'SLOPE': hex.hex = 'A0A4'; break;
            case 'YINT': hex.hex = 'A0A6'; break;
            case 'CORR': hex.hex = 'A0A7'; break;
            case 'LINF': hex.hex = 'A0A1'; break;
            case 'LOGF': hex.hex = 'A0A2'; break;
            case 'EXPF': hex.hex = 'A0A0'; break;
            case 'PWRF': hex.hex = 'A0A3'; break;
            case 'BEST': hex.hex = 'A09F'; break;
            default: return false;
        }
    }
    return true;
}

function encodeBASEmenu(l, hex) {
    hex.hex = "";
    let u = l.toUpperCase();
    switch (u) {
        case 'HEXM': hex.hex = 'A0E2'; break;
        case 'DECM': hex.hex = 'A0E3'; break;
        case 'OCTM': hex.hex = 'A0E4'; break;
        case 'BINM': hex.hex = 'A0E5'; break;
        case 'AND': hex.hex = 'A588'; break;
        case 'OR': hex.hex = 'A589'; break;
        case 'XOR': hex.hex = 'A58A'; break;
        case 'NOT': hex.hex = 'A587'; break;
        case 'BIT?': hex.hex = 'A58C'; break;
        case 'ROTXY': hex.hex = 'A58B'; break;
        case 'BASE/':
        case 'BASE\\:-':
        case 'BASE÷': hex.hex = 'A0E9'; break;
        case 'BASE*':
        case 'BASEX':
        case 'BASE×': hex.hex = 'A0E8'; break;
        case 'BASE-': hex.hex = 'A0E7'; break;
        case 'BASE+': hex.hex = 'A0E6'; break;
        case 'BASE+/-': hex.hex = 'A0EA'; break;
        default: return false;
    }
    return true;
}

function encodeCONVERTmenu(l, hex) {
    hex.hex = "";
    let u = l.toUpperCase();
    switch (u) {
        case 'R-D':
        case '→DEG':
        case '\\->DEG': hex.hex = '6B'; break;
        case 'D-R':
        case '→RAD':
        case '\\->RAD': hex.hex = '6A'; break;
        case 'HR':
        case '→HR':
        case '\\->HR': hex.hex = '6D'; break;
        case 'HMS':
        case '→HMS':
        case '\\->HMS': hex.hex = '6C'; break;
        case 'P-R':
        case '→REC':
        case '\\->REC': hex.hex = '4E'; break;
        case 'R-P':
        case '→POL':
        case '\\->POL': hex.hex = '4F'; break;
        case 'INT':
        case 'IP': hex.hex = '68'; break;
        case 'FRC':
        case 'FP': hex.hex = '69'; break;
        case 'RND': hex.hex = '6E'; break;
        case 'ABS': hex.hex = '61'; break;
        case 'SIGN': hex.hex = '7A'; break;
        case 'MOD': hex.hex = '4B'; break;
        default: return false;
    }
    return true;
}

function encodeFLAGSmenu(l, hex) {
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    hex.hex = "";
    if (/^(sf|cf|fs[?]|fc[?]|fs[?]c|fc[?]c)\s+([^\s].*)$/i.test(l)) {
        let cmd = l.match(/^(sf|cf|fs[?]|fc[?]|fs[?]c|fc[?]c)\s+([^\s].*)$/i);
        let data = encodeTarget(cmd[2], HP42_0099, typeReturned, lengthByte);
        let op = cmd[1].toUpperCase();
        let opcode;
        switch (op) {
            case 'SF': opcode = 'A8'; break;
            case 'CF': opcode = 'A9'; break;
            case 'FS?': opcode = 'AC'; break;
            case 'FC?': opcode = 'AD'; break;
            case 'FS?C': opcode = 'AA'; break;
            default: opcode = 'AB'; break;
        }
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0') + opcode + data;
        } else {
            hex.hex = opcode + data.toString(16).padStart(2, '0');
        }
        return true;
    }
    return false;
}

function encodePROBmenu(l, hex) {
    hex.hex = "";
    var u = l.toUpperCase();
    switch (u) {
        case 'COMB': hex.hex = 'A06F'; break;
        case 'PERM': hex.hex = 'A070'; break;
        case 'FACT': /* HP-41 equivalent */
        case 'N!': hex.hex = '62'; break;
        case 'GAMMA': hex.hex = 'A074'; break;
        case 'RAN': hex.hex = 'A071'; break;
        case 'SEED': hex.hex = 'A073'; break;
        default: return false;
    }
    return true;
}

function encodeASSIGN(l, hex) {
    let typeReturned1 = { "typeReturned": "" };
    let typeReturned2 = { "typeReturned": "" };
    let lengthByte1 = { "lengthByte": "" };
    let lengthByte2 = { "lengthByte": "" };
    hex.hex = "";
    if (/^assign\s+(.+[^\s])\s+to\s+([^\s].*)$/i.test(l)) {
        let cmd = l.match(/^assign\s+(.+[^\s])\s+to\s+([^\s].*)$/i);
        let data1 = encodeTarget(cmd[1], HP42_CAN_BE_NAME, typeReturned1, lengthByte1, 13);
        let data2 = encodeTarget(cmd[2], HP42_CAN_BE_0099, typeReturned2, lengthByte2);
        if (data2 == 0 || data2 > 18) {
            throw new Error("Menu key number must be 01 to 18");
        }
        hex.hex = (lengthByte1.lengthByte + 1).toString(16).padStart(2, '0').toUpperCase() + 'C0' + data1 + (data2 - 1).toString(16).padStart(2, '0').toUpperCase();
        return true;
    }
    return false;
}

function encodePGMFCNmenu(l, hex) {
    
    hex.hex = "";
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    let u = l.toUpperCase();
    let found = true;

    switch (u) {
        case 'RTN': hex.hex = '85'; break;
        case 'AVIEW': hex.hex = '7E'; break;
        case 'PROMPT': hex.hex = '8E'; break;
        case 'PSE': hex.hex = '89'; break;
        case 'AIP': hex.hex = 'A631'; break;
        case 'XTOA': hex.hex = 'A66F'; break;
        case 'AGRAPH': hex.hex = 'A764'; break;
        case 'PIXEL': hex.hex = 'A765'; break;
        case 'BEEP': hex.hex = '86'; break;
        case 'GETKEY': hex.hex = 'A26E'; break;
        case 'MENU': hex.hex = 'A25E'; break;
        default: found = false;
    }
    if (found) return true;

    if (/^tone\s+([^ ].*)$/i.test(l)) {
        let cmd = l.match(/^tone\s+([^ ].*)$/i); // Use match to capture groups
        let data = encodeTarget(cmd[1], HP42_09, typeReturned, lengthByte);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + 'DF' + data;
        } else {
            hex.hex = '9F' + data.toString(16).padStart(2, '0').toUpperCase();

        }
        return true;
    }
    // INPUT/VIEW/ISG/DSE?

    if (/^(input|view|isg|dse)\s+([^ ].*)$/i.test(l)) {
        let cmd = l.match(/^(input|view|isg|dse)\s+([^ ].*)$/i);
        let data = encodeTarget(cmd[2], HP42_STORAGE_TARGET, typeReturned, lengthByte);
        let indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) != 0);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            switch (cmd[1].toUpperCase()) {
                case 'INPUT':
                    byte = 0xc5;
                    break;
                case 'VIEW':
                    byte = 0x80;
                    break;
                case 'ISG':
                    byte = 0x96;
                    break;
                default:
                    byte = 0x97;
            }
            if (indirect) byte += 0x08;
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + byte.toString(16).padStart(2, '0').toUpperCase() + data;
        } else {

            switch (cmd[1].toUpperCase()) {
                case 'INPUT':
                    opcode = indirect ? 'F2EE' : 'F2D0';
                    break;
                case 'VIEW':
                    opcode = '98';
                    break;
                case 'ISG':
                    opcode = '96';
                    break;
                default:
                    opcode = '97';
                    break;
            }
            hex.hex = opcode + data.toString(16).padStart(2, '0').toUpperCase();
        }
        return true;
    }
    if (/^varmenu\s+([^\s].*)$/i.test(l)) {
        let cmd = l.match(/^varmenu\s+([^\s].*)$/i);
        let data = encodeTarget(cmd[1], HP42_VARIABLE, typeReturned, lengthByte);
        let indirect = (typeReturned.typeReturned & HP42_INDIRECT_RETURNED) != 0;
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            let opcode = indirect ? 'C9' : 'C1';
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0').toUpperCase() + opcode + data;
        } else {
            hex.hex = 'F2F8' + data.toString(16).padStart(2, '0').toUpperCase();
        }
        return true;
    }
    // KEYG/KEYX?
    if (/^key\s+([1-9])\s+(xeq|gto)\s+([^\s].*)$/i.test(l)) {

        let cmd = l.match(/^key\s+([1-9])\s+(xeq|gto)\s+([^\s].*)$/i);
        let key = parseInt(cmd[1]);
        let jump = cmd[2].toUpperCase();
        let data = encodeTarget(cmd[3], HP42_BRANCH_TARGET, typeReturned, lengthByte, 13);
        let indirect = (typeReturned.typeReturned & HP42_INDIRECT_RETURNED) != 0;
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            let opcode = 0xc2 + (indirect ? 0x08 : 0) + (jump == 'GTO' ? 1 : 0);
            hex.hex = (++(lengthByte.lengthByte)).toString(16).padStart(2, '0').toUpperCase() + opcode.toString(16).padStart(2, '0').toUpperCase() + key.toString(16).padStart(2, '0').toUpperCase() + data;
        } else {
            let opcode = ((jump == 'GTO') ? 'E3' : 'E2');
            hex.hex = 'F3' + opcode + key.toString(16).padStart(2, '0').toUpperCase() + data.toString(16).padStart(2, '0').toUpperCase();
        }
        return true;
    }

    if (/^x(=|#|\\\\#|≠|<|\\\\<=|<=|≤|>|\\\\>=|≥|\\>=|>=)([y0])\?$/i.test(l)) {
    console.log("--------------")
        let reg = '/^x(=|#|\\\\#|≠|<|\\\\<=|<=|≤|>|\\\\>=|≥|\\>=|>=)([y0])\?$/i';
        let cmd = l.match(/^x(=|#|\\\\#|≠|<|\\\\<=|<=|≤|>|\\\\>=|≥|\\>=|>=)([y0])\?$/i)
        let zero = cmd[2] == '0';
        switch (cmd[1]) {
            case '=': hex.hex = zero ? '67' : '78'; break;
            case '#':
            case '\\#':
            case '≠': hex.hex = zero ? '63' : '79'; break;
            case '<': hex.hex = zero ? '66' : '44'; break;
            case '>': hex.hex = zero ? '64' : '45'; break;
            case '<=': /* HP-41 equivalent */
			case '\\<=':
            case '≤': hex.hex = zero ? '7B' : '46'; break;
            default: hex.hex = zero ? 'A25F' : 'A260';
            // HP
        }
        return true;
    }
    return false;
}

function encodePRINTmenu(l, hex) {
    hex.hex = "";
    let u = l.toUpperCase();
    let found = true; let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    switch (u) {
        case 'PRSUM':
        case 'PR\\GS':
        case 'PRΣ':
            hex.hex = 'A752';
            break;
        case 'PRSTK':
            hex.hex = 'A753';
            break;
        case 'PRA':
            hex.hex = 'A748';
            break;
        case 'PRX':
            hex.hex = 'A754';
            break;
        case 'PRUSR':
            hex.hex = 'A761';
            break;
        case 'ADV':
            hex.hex = '8F';
            break;
        case 'PRLCD':
            hex.hex = 'A762';
            break;
        case 'DELAY':
            hex.hex = 'A760';
            break;
        case 'PRON':
            hex.hex = 'A75E';
            break;
        case 'PROFF':
            hex.hex = 'A75F';
            break;
        case 'MAN':
            hex.hex = 'A75B';
            break;
        case 'NORM':
            hex.hex = 'A75C';
            break;
        case 'TRACE':
            hex.hex = 'A75D';
            break;
        default:
            found = false;
    }
    if (found) return true;
    // let cmd = l.match(/^prv\s+([^\s].*)$/);
    // if (cmd !== null) {
    if (/^prv\s+([^\s].*)$/i.test(l)) {
        let cmd = l.match(/^prv\s+([^\s].*)$/i)
        let data = encodeTarget(cmd[1], HP42_VARIABLE, typeReturned, lengthByte);
        let indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) !== 0);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            let opcode = indirect ? 'B9' : 'B1';
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0') + opcode + data;
        }
        else {
            hex.hex = 'F2D9' + data.toString(16).padStart(2, '0');
        }
        return true;
    }
    return false;
}

function encodeMiscFuncs(l, hex) {
    hex.hex = "";
    let u = l.toUpperCase();
    let found = true;
    let typeReturned = { "typeReturned": "" };
    let lengthByte = { "lengthByte": "" };
    switch (u) {
        // Misc alpha functions?
        case 'ALENG': hex.hex = 'A641'; break;
        case 'AOFF': hex.hex = '8B'; break;
        case 'AON': hex.hex = '8C'; break;
        case 'AROT': hex.hex = 'A646'; break;
        case 'ASHF': hex.hex = '88'; break;
        case 'POSA': hex.hex = 'A65C'; break;
        case 'ATOX': hex.hex = 'A647'; break;
        // Hyperbolic?
        case 'SINH': hex.hex = 'A061'; break;
        case 'COSH': hex.hex = 'A062'; break;
        case 'TANH': hex.hex = 'A063'; break;
        case 'ASINH': hex.hex = 'A064'; break;
        case 'ACOSH': hex.hex = 'A066'; break;
        case 'ATANH': hex.hex = 'A065'; break;
        // data types?
        case 'REAL?': hex.hex = 'A265'; break;
        case 'MAT?': hex.hex = 'A266'; break;
        case 'CPX?': hex.hex = 'A267'; break;
        case 'STR?': hex.hex = 'A268'; break;
        // Misc matrix functions
        case 'DELR': hex.hex = 'A0AB'; break;
        case 'INSR': hex.hex = 'A0AA'; break;
        case 'R<>R': hex.hex = 'A6D1'; break;
        case 'DIM?': hex.hex = 'A6E7'; break;
        case '^':
        case '↑': hex.hex = 'A6DE'; break;
        case '\\V':
        case '↓': hex.hex = 'A6DF'; break;
        case '\\->':
        case '→': hex.hex = 'A6DD'; break;
        case '\\<-':
        case '←': hex.hex = 'A6DC'; break;
        case 'FNRM': hex.hex = 'A6CF'; break;
        case 'GROW': hex.hex = 'A6E3'; break;
        case 'WRAP': hex.hex = 'A6E2'; break;
        case 'OLD': hex.hex = 'A6DB'; break;
        case 'RNRM': hex.hex = 'A6ED'; break;
        case 'RSUM': hex.hex = 'A6D0'; break;
        case '[MIN]': hex.hex = 'A6EA'; break;
        case '[MAX]': hex.hex = 'A6EB'; break;
        case '[FIND]': hex.hex = 'A6EC'; break;
        // remaining misc. crap
        case 'R↑':
        case 'R^': hex.hex = '74'; break;
        case 'DEC': /* HP-41 equivalent */
        case '\\->DEC':
        case '→DEC': hex.hex = '5F'; break;
        case 'OCT': /* HP-41 equivalent */
        case '\\->OCT':
        case '→OCT': hex.hex = '6F'; break;
        case '%CH': hex.hex = '4D'; break;
        case 'EXITALL': hex.hex = 'A26C'; break;
        case 'CUSTOM': hex.hex = 'A26F'; break;
        case 'HMS+': hex.hex = '49'; break;
        case 'HMS-': hex.hex = '4A'; break;
        case 'E^X-1':
        case 'E↑X-1': hex.hex = '58'; break;
        case 'LN1+X': hex.hex = '65'; break;
        case 'OFF': hex.hex = '8D'; break;
        case 'ON': hex.hex = 'A270'; break;
        default: found = false;
    }
    if (found) return true;
    // ARCL/ASTO?
    if (/^a(sto|rcl)\s+([^\s].*)$/i.test(l)) {
        let cmd = l.match(/^a(sto|rcl)\s+([^\s].*)$/i);
        let isSTO = (cmd[1].toUpperCase() == 'STO');
        let data = encodeTarget(cmd[2], HP42_STORAGE_TARGET, typeReturned, lengthByte);
        let indirect = ((typeReturned.typeReturned & HP42_INDIRECT_RETURNED) != 0);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            let opcode = '';
            if (isSTO) {
                opcode = indirect ? 'BA' : 'B2';
            } else {
                opcode = indirect ? 'BB' : 'B3';
            }
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0') + opcode + data;
        } else {
            let opcode = isSTO ? '9A' : '9B';
            hex.hex = opcode + data.toString(16).padStart(2, '0');
        }
        return true;
    }
    // X<> ?
    if (/^x<>\s+([^\s].*)$/i.test(l)) {
        let cmd = l.match(/^x<>\s+([^\s].*)$/i)
        let data = encodeTarget(cmd[1], HP42_STORAGE_TARGET, typeReturned, lengthByte);
        if (typeReturned.typeReturned & HP42_NAME_RETURNED) {
            let opcode = (typeReturned.typeReturned & HP42_INDIRECT_RETURNED) ? '8E' : '86';
            hex.hex = (lengthByte.lengthByte).toString(16).padStart(2, '0') + opcode + data;
        } else {
            hex.hex = 'CE' + data.toString(16).padStart(2, '0');
        }
        return true;
    }
    return false;
}

function encodeXROM(l, hex) {
    hex.hex = "";
    if (l.match(/xrom\s+(\d+)\s*,\s*(\d+)[^\d]*$/i) !== null) {
        var cmd = l.match(/xrom\s+(\d+)\s*,\s*(\d+)[^\d]*$/i);
        var xromNr = parseInt(cmd[1]);
        var xromFunc = parseInt(cmd[2]);
        if ((xromNr > 31) || (xromFunc > 63)) return false;
        var fullOpcode = 0xa000 | (xromNr << 6) | xromFunc;
        hex.hex = fullOpcode.toString(16).toUpperCase().padStart(4, '0');
        return true;
    }
    return false;
}

function bombOut_e(msg) {
    var message = msg + " in line " + (line - 1).toString().padStart(2, '0');
    throw new Error(message);
}