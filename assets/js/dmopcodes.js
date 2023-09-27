var _dmDecoder = function () {

    // Model of the machine we're dealing with
    this.model = '';

    // Should our dumps be backwards-compatible?
    this.compatible = false;

    // 256*7 bytes of RAM
    var RAM = [];

    // Registers
    var regA = [];
    var regB = [];
    var regC = [];
    var regM = [];
    var regN = [];
    var regS = [];
    var regG = 0;

    var initData = {};
    var testData = {};

    var currentDump = '';

    // Opcodes for the machine we're using
    var opcodes = [];

    // Byte codes that leave decoded output on the same line
    var sameLine = [];

    // collection of functions to return pointers to opcodes
    var addresses = {};

    // Machine types handled
    var validMachines = ['DM10', 'DM11', 'DM12', 'DM15', 'DM15_M80', 'DM15_M1B', 'DM16'];
    var defaultMachine = 'DM15';

    var that = null;

    // Object initialisation
    this.Init = function () {
        that = this;

        // $("#tabs").tabs();

        // if (document.location.hash != '') {
        //     selecttab(window.location.hash);
        // }

        $('.linked').scroll(function () {
            $('.linked').scrollTop($(this).scrollTop());
        });

        populateCalcSelect();
        $("#selected_calc").change(updateModel).val(defaultMachine);

        $("#decode").click(function (event) { decode(); });
        $("#encode").click(function (event) { encode(); });

        $("#testdump").click(function (event) {
            currentDump = $("#stored_dumps").val();
            populateDump();
        });

        $("#testpgm").click(function (event) {
            $("#mnemonic").val($("#stored_pgms").val());
        });

        $("#v11compatible").prop('checked', that.compatible).change(function (ev) {
            that.compatible = $("#v11compatible").prop('checked');
            populateDump();
        });
        setMachine(defaultMachine);
    }

    // encoder
    function encode() {
        var mnemonics, pgmcodes = "";
        // use default dump if calc dump is empty
        if ($("#dump_from_calc").val().trim().length == 0) $("#dump_from_calc").val(init_data.defaults[this.model]);
        if (!checkModel()) return;
        parseRAM();
        clearPrgmZone();

        addr = addresses.firstAddr(RAM);
        var offs = addresses.firstOffset(RAM) - 1;
        if (offs < 0) {
            offs += 7;
            addr++;
        }
        // construct bytestream
        mnemonics = $("#mnemonic").val().split("\n");
        for (var i = 0; i < mnemonics.length; i++) {
            var mnem = mnemonics[i].trim();
            // log("processing opcode " + mnem);
            if (mnem.length > 0) {
                // log("Hex token is " + lookup(mnem));
                pgmcodes += lookup(mnem);
            }
        }
        // shove bytes into RAM
        // log("byte stream is " + pgmcodes);
        for (var i = 0; i < pgmcodes.length; i += 2) {
            var code = parseInt(pgmcodes.substring(i, i + 2), 16);
            if (++offs == 7) {
                offs = 0;
                addr--;
            }
            // log("populating RAM[" + get2Hex(addr) + "][" + offs.toString() + "]");
            RAM[addr][offs] = code;
        }

        // log("Finished encoding at address 0x" + addr.toString(16) + ", offset " + offs.toString());
        addresses.setPrgmLength(RAM, addr, offs);
        addresses.resetPC(RAM);
        regS = init_data.defaultSReg[model].slice();

        currentDump = RAM2Str();
        populateDump();
    }

    // decoder
    function decode() {
        if (!checkModel()) return;
        parseRAM();
        var lastAddr = addresses.lastAddr(RAM);
        var lastOffs = addresses.lastOffset(RAM);
        var lastCode = logicalAddr(lastAddr, lastOffs);
        var addr = addresses.firstAddr(RAM);
        var offs = addresses.firstOffset(RAM);
        var code, sz;
        var mnemonic = "";
        var codedump = "";
        var cnt = 0;
        var instr, instKeys, instIx, extraLine = 0;
        var consecutive = 0;
        var wantNewLine = true;

        if (lastAddr > 0) {
            while (logicalAddr(addr, offs) >= lastCode) {
                sz = 2;
                code = RAM[addr][offs];
                if (isDoubleByte(code)) {
                    if (++offs == 7) {
                        offs = 0;
                        --addr;
                    }
                    code = (code << 8) | RAM[addr][offs];
                    sz = 4;
                }
                // log("Got code: 0x" + code.toString(16));
                if (++offs == 7) {
                    offs = 0;
                    addr--;
                }
                cnt++;

                instIx = hex2Index(getNHex(code, sz));
                if (instIx >= 0) {
                    instr = opcodes[instIx][1];
                    instKeys = opcodes[instIx][2];
                }
                else {
                    instr = instKeys = "???";
                }

                if (stayOnSameLine(code)) {
                    if (wantNewLine) {
                        mnemonic += "\n";
                        wantNewLine = false;
                    }
                    consecutive++;
                    // log("instr=" + instr + ", " + consecutive.toString() + " consecutive same-liners");
                }
                else {
                    var nbLines = Math.max(1, consecutive);
                    // log("instr=" + instr + ", adding " + nbLines.toString() + " newline(s)");
                    for (var i = 0; i < nbLines; i++) mnemonic += "\n";
                    consecutive = 0;
                    wantNewLine = true;
                }

                mnemonic += instr;
                codedump += cnt.toString(10).padL(3, "0") + "  " + instr.padR(12, " ") + " | " + instKeys + "\n";
            }
            mnemonic = mnemonic.trim();
        }
        $('#mnemonic').val(mnemonic);
        $('#codedump').val(codedump);
    }

    // private methods

    function clearPrgmZone() {
        var lastAddr = addresses.lastAddr(RAM);
        if (lastAddr == 0) return;
        var lastOffset = addresses.lastOffset(RAM);
        var lastCode = logicalAddr(lastAddr, lastOffset);
        var addr = addresses.firstAddr(RAM);
        var offs = addresses.firstOffset(RAM);

        while (logicalAddr(addr, offs) >= lastCode) {
            RAM[addr][offs] = 0x00;
            if (++offs == 7) {
                offs = 0;
                addr--;
            }
        }
    }

    function logicalAddr(addr, offs) { return (7 * addr - offs); }

    function lookup(mnemonic) {
        var i, j;
        var result = "";
        mnemonic = mnemonic.replace(/[ \t\r_]/g, '').toUpperCase();
        // look for the mnemonic in the opcodes
        for (i = 0; i < opcodes.length; i++) {
            if (mnemonic.toUpperCase() == opcodes[i][1].replace(/[ \t\r_]/g, '').toUpperCase())
                return opcodes[i][0];
        }
        // not found? maybe it's a sequence of [\d\.]?
        for (j = 0; j < mnemonic.length; j++) {
            var mnemonicFound = false;
            for (i = 0; i < opcodes.length; i++) {
                if (mnemonic.substring(j, j + 1) == opcodes[i][1]) {
                    result += opcodes[i][0];
                    mnemonicFound = true;
                    break;
                }
            }
            if (!mnemonicFound) break;
        }
        return ((result == "") ? "??" : result);
    }

    function hex2Mnemonic(hex) {
        hex = hex.toUpperCase();
        for (var i = 0; i < opcodes.length; i++)
            if (hex == opcodes[i][0]) return opcodes[i][1];
        return "??";
    }

    function hex2Index(hex) {
        hex = hex.toUpperCase();
        for (var i = 0; i < opcodes.length; i++) {
            if (hex == opcodes[i][0]) return i;
        }
        return -1;
    }

    function parseRAM() {
        clearRAM(0);
        var lines = $("#dump_from_calc").val().split("\n");
        for (var i = lines.length - 1; i > 0; i--) {
            var thisline = lines[i].trim();
            if (thisline.length == 0) continue;
            var vals = thisline.split("  ");
            if (vals[0][1] == ":") {
                for (var k = 0; k < vals.length; k++) {
                    var reg = str2Reg(vals[k].substring(3));
                    switch (vals[k][0]) {
                        case 'A': regA = reg; break;
                        case 'B': regB = reg; break;
                        case 'C': regC = reg; break;
                        case 'M': regM = reg; break;
                        case 'N': regN = reg; break;
                        case 'S': regS = reg; break;
                        case 'G': regG = parseInt(vals[k].substring(3), 16);
                    }
                }
            }
            else {
                if ((vals[0].length != 2) || (vals[0][1] == ' ')) continue;
                var addr = parseInt(vals[0], 16);
                if ((addr < 0) || (addr > 255)) continue;
                for (var j = 1; j < vals.length; j++) {
                    RAM[addr + j - 1] = str2Reg(vals[j]);
                }
            }
        }
    }

    function RAM2Str() {
        var s = this.model + "\n";
        for (var addr = 0; addr < 256; addr += 4) {
            if (isZeroReg(RAM[addr]) && isZeroReg(RAM[addr + 1]) && isZeroReg(RAM[addr + 2]) && isZeroReg(RAM[addr + 3])) continue;
            s += get2Hex(addr);
            for (var k = 0; k < 4; k++) s += "  " + reg2Str(RAM[addr + k]);
            s += "\n";
        }
        s += "A: " + reg2Str(regA) + "  B: " + reg2Str(regB) + "  C: " + reg2Str(regC) + "\n";
        s += "S: " + reg2Str(regS) + "\n";
        s += "M: " + reg2Str(regM) + "  N: " + reg2Str(regN) + "  G: " + get2Hex(regG) + "\n";
        return s;
    }

    function stayOnSameLine(token) {
        return (sameLine.indexOf(token) != -1);
    }

    function isZeroReg(reg) {
        for (var i = 0; i < reg.length; i++)
            if (reg[i] != 0) return false;
        return true;
    }

    function checkModel() {
        var lines = $("#dump_from_calc").val().split("\n");
        var calcModel = lines[0].trim();
        $("#errlog").html("");
        if (validMachines.indexOf(calcModel) == -1) {
            logError("Bad calculator model: <b>" + calcModel + "</b><br>First line of dump must be a valid calculator model.");
            return false;
        }
        $("#selected_calc").val(calcModel);
        return true;
    }

    function setMachine(id) {
        var machineIndex = validMachines.indexOf(id);
        if (machineIndex < 0) {
            logError('Unsupported machine type: ' + id);
            this.model = '';
            initData = "";
            testData = [];
            opcodes = [];
            sameLine = [];
            addresses = {};
            $("#stored_dumps").html("");
            $("#stored_pgms").html("");
        }
        else {
            this.model = validMachines[machineIndex];
            initData = init_data.defaults[this.model];
            testData = init_data.testData[this.model];
            opcodes = init_data.opcodes[init_data.opcodeTable[this.model]];
            sameLine = init_data.sameLine[init_data.opcodeTable[this.model]];
            addresses = init_data.addresses[init_data.opcodeTable[this.model]];
            populateStoredDumps();
            populateStoredPgms();
        }
        $("#errlog").html("");
        currentDump = initData;
        populateDump();
        $("#codedump").val("");
        $("#mnemonic").val("");
    }

    function populateDump() {
        var finaldump = that.compatible ? currentDump.replace(/S: [\da-f]{14}\s+/i, '') : currentDump;
        $("#dump_from_calc").val(finaldump);
    }

    function populateStoredDumps() {
        $("#stored_dumps").html("");
        var nTestData = testData[0];
        for (var i = 0; i < nTestData; i++) {
            var option = document.createElement("option");
            option.value = testData[2 * i + 2];
            option.appendChild(document.createTextNode(testData[2 * i + 1]));
            $("#stored_dumps").append(option);
        }
    }

    function populateStoredPgms() {
        $("#stored_pgms").html("");
        var nTestData = testData[0];
        var pgmOffset = 2 * nTestData + 1;
        var nTestPgms = testData[pgmOffset++];
        for (var i = 0; i < nTestPgms; i++) {
            var option = document.createElement("option");
            option.value = testData[pgmOffset + 1];
            option.appendChild(document.createTextNode(testData[pgmOffset]));
            $("#stored_pgms").append(option);
            pgmOffset += 2;
        }
    }

    function clearRAM(startOffset) {
        for (var i = startOffset; i < 256; i++) {
            RAM[i] = [];
            for (var j = 0; j < 7; j++) RAM[i][j] = 0;
        }
    }

    function log(msg) {
        console && console.log(msg);
    }

    function logError(msg) {
        // log(msg);
        $("#errlog").text(msg);
    }

    function getNHex(a, n) {
        return a.toString(16).padL(n, '0');
    }

    function get2Hex(a) { return getNHex(a, 2); }

    function reg2Str(reg) {
        var s = '';
        for (var i = 0; i < reg.length; i++) {
            s = get2Hex(reg[i]) + s;
        }
        return s;
    }

    function str2Reg(s) {
        var reg = [0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < 7; i++) {
            reg[6 - i] = parseInt(s.substring(i * 2, i * 2 + 2), 16);
        }
        return reg;
    }

    function updateModel() {
        setMachine($("#selected_calc").val())
    }

    function populateCalcSelect() {
        var opt;
        $("#selected_calc").html('');
        for (var i = 0; i < validMachines.length; i++) {
            opt = document.createElement("option");
            opt.value = validMachines[i];
            opt.appendChild(document.createTextNode(validMachines[i].replace("_", " ")));
            $("#selected_calc").append(opt);
        }
    }

    // function selecttab(tab) {
    //     $('#tabs').tabs("option", "active", $('#tabs a[href="' + tab + '"]').parent().index());
    // }

    function isDoubleByte(opcode) {
        return ((this.model.substring(0, 4) == "DM15") && (opcode >= 0xAF) && ((opcode & 0x0F) == 0x0F));
    }

}


$(document).ready(
    function () {
        var dmDecoder = new _dmDecoder();
        dmDecoder.Init();
    }
);

String.prototype.padL = function (len, what) {
    var s = this;
    while (s.length < len)
        s = what + s;
    return s;
}

String.prototype.padR = function (len, what) {
    var s = this;
    while (s.length < len)
        s += what;
    return s;
}

if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };
}
