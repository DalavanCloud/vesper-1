/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 08/02/13
 * Time: 11:37
 * To change this template use File | Settings | File Templates.
 */
// this is invoked with ()
VESPER.DWCAZipParse = new function () {

    var fileData;
    var fieldDelimiter, fieldDelimiterVal, lineDelimiter, lineDelimVal, lineDelimLength, quoteDelimiter, qDelimVal, firstTrue, readFields, lineNo;
    var escapeCharVal = "\\".charCodeAt(0);
    var defaults = [], invDiscreteTermIndex = [], invSharedTermIndex = [];
    var pTime = 0;
    var notifyFunc;
    var first256 = [];

    var sharedMaps = [];

    var pb = 0;


    this.rowReader2 = function (strArray) {
        var field = 0;
        var fromI = 0, toI = 0;
        var use = readFields [field];
        var c;
        var str = [];
        //var subStr = [];
        var strLen = strArray.length;
        var quotes = false, esc = false;

        for (var n = 0; n < strLen; n++) {
            var sstr = strArray[n];
            c = sstr ? sstr : 0;

            if (quoteDelimiter && !esc && c === qDelimVal) {
                quotes = !quotes;
            }
            if (!quotes && (c === fieldDelimiterVal || n === strLen - 1)) {
                if (use) {
                    toI = n + ((c === fieldDelimiterVal) ? 0 : 1);
                    // strip out quotes if there
                    if (quoteDelimiter) {
                        if (strArray[fromI] === qDelimVal) {
                            fromI++;
                        }
                        if (strArray[toI - 1] === qDelimVal) {
                            toI--;
                        }
                    }
                    //toI = n + ((n === strLen - 1) ? 1 : 0);
                    if (fromI === toI) {    // empty field, adjacent delimiters
                        str.push (defaults[field]);
                        //console.log ("EMPTY");
                    } else {
                        var newStr = String.fromCharCode.apply (null, strArray.slice(fromI, toI));
                        // if field is deemed to be formed of a discrete set of entries (like ranks), then reuse strings to save mem
                        var dList = invDiscreteTermIndex [field];
                        var sIndex = invSharedTermIndex [field];
                        //console.log ("NEWSTR", newStr);

                        if (dList) {
                            var mapStr = dList[newStr];
                            if (!mapStr) {
                                dList[newStr] = newStr;
                                VESPER.log ("new entry for field", field, "at lineNo", lineNo, ":", newStr, newStr.length);
                            } else {
                                newStr = null;
                                newStr = mapStr;
                            }
                        }
                        else if (sIndex) {
                            var mapStr = sharedMaps[sIndex][newStr];
                            if (!mapStr) {
                                sharedMaps[sIndex][newStr] = newStr;
                            } else {
                                newStr = null;
                                newStr = mapStr;
                            }
                        }

                        pb += (toI - fromI);
                        str.push (newStr);
                    }

                    // If last char in string is field delimiter then there's actually an empty field after it
                    if (c === fieldDelimiterVal && n === strLen - 1) {
                        str.push (defaults[field]);
                        //console.log ("LAST EMPTY");
                    }
                }
                field++;
                use = readFields [field] | false;
                fromI = n + 1;
            }

            esc = (c === escapeCharVal);
        }
        lineNo++;

        if (lineNo % 10000 === 0 || lineNo === 10998) {
            VESPER.log (lineNo, ": ", str);
        }
        if (lineNo % 100 === 0) {
            var tt = MGNapier.NapVisLib.makeTime();
            if (tt - pTime > 1000) {
                pTime = tt;
                VESPER.log (lineNo, ": ", str);
            }
        }
        //VESPER.log (str);
        return str;
    };



    this.zipStreamSVParser2 = function (inflateFunc) {
        //return [];

        if (VESPER.alerts) { alert ("start partial parse with charcodes"); }

        var blength = 1024;
        var buff = new Array (blength);
        var out = [];
        var i, j;
        var bigOut = [];
        var k = 0;
        var esc = false, quotes = false;

        var stt = true;
        var ch, ch2;
        var utfwrap = 0;

        var startt = MGNapier.NapVisLib.makeTime();
        pTime = startt;
        var segmentLengthMs = 200;


        function doWork () {

            function matchEol (c, buf, off) {
                var fcmatch = (lineDelimVal === c);

                if (lineDelimLength === 1) { // if EOL is single char
                    return fcmatch;
                } else if (fcmatch) {
                    if (off + lineDelimLength <= buf.length) {  // <= rather than < cos off may already be the first char in linedelimiter
                        for (var l = lineDelimiter.length; --l >= 1;) { // 1 'cos first char matched remember (fcmatch)
                            if (lineDelimiter.charCodeAt(l) !== buf[off+l]) {
                                return false;
                            }
                        }
                        j += lineDelimiter.length - 1;  // move along over these read bytes
                        return true;
                    } else { // eol string (obv >1 character) is divided between this buffer and the next
                        utfwrap = i - j;
                        j = i;
                        ch = undefined;
                    }
                }
                return false;
            }

            var mt = MGNapier.NapVisLib.makeTime();
            while ((MGNapier.NapVisLib.makeTime() - mt < segmentLengthMs) && (i = inflateFunc (buff, utfwrap, blength - utfwrap)) > 0) {

                //if (lineNo > 10992 && lineNo < 10998) {
                //    VESPER.log (lineNo, utfwrap, "\nout", out.join(), "\nbuff", buff.length, i, buff.join(), "\n", buff[1023]);
                //}

                i += utfwrap; // 'cos we may have chars left over from not processing utf chars / eol strings chopped between buffer calls
                // and i only returns new chars added to the buffer from inflateFunc. Led to off by one(or two) errors.

                var n = 0;
                utfwrap = 0;


                if (stt) {
                    var possbom = String.fromCharCode(buff[0]) + String.fromCharCode(buff[1]) + String.fromCharCode(buff[2]);
                    VESPER.log ("possbom [", possbom, "]");
                    if (possbom === "\xEF\xBB\xBF") {
                        VESPER.log ("UTF8 bytemark detected");
                        n = 3;
                    }
                    stt = false;
                }

                for (j = n; j < i; j++) {
                    ch = buff[j];
                    if (ch >= 128) {
                        if( ch >= 0xC2 && ch < 0xE0 ) {
                            if (j < i - 1) {
                                ch = (((ch&0x1F)<<6) + (buff[++j]&0x3F));
                            } else {
                                utfwrap = 1;
                                j = i;
                                ch = undefined;
                            }
                        } else if( ch >= 0xE0 && ch < 0xF0 ) {
                            if (j < i - 2) {
                                ch = (((ch&0xFF)<<12) + ((buff[++j]&0x3F)<<6) + (buff[++j]&0x3F));
                            } else {
                                utfwrap = i - j;
                                j = i;
                                ch = undefined;
                            }
                        } else if( ch >= 0xF0 && ch < 0xF5) {
                            if (j < i - 3) {
                                var codepoint = ((ch&0x07)<<18) + ((buff[++j]&0x3F)<<12)+ ((buff[++j]&0x3F)<<6) + (buff[++j]&0x3F);
                                codepoint -= 0x10000;
                                var s = (
                                    (codepoint>>10) + 0xD800,
                                    (codepoint&0x3FF) + 0xDC00
                                );
                                ch = s.charAt[0];
                                ch2 = s.charAt[1];
                            } else {
                                utfwrap = i - j;
                                j = i;
                                ch = undefined;
                            }
                        }
                    }


                    if (quoteDelimiter && !esc && ch === qDelimVal) {
                        quotes = !quotes;
                        out.push (ch); //do this to add quotes to char data, otherwise we cant tell what delimiters need escaped
                    }
                    //else if (!quotes && ch == lineDelimVal) {  // end of line
                    else if (!quotes && matchEol (ch, buff, j)) {  // end of line
                        bigOut.push ((k >= fileData.ignoreHeaderLines) ? VESPER.DWCAZipParse.rowReader2 (out) : undefined);
                        k++;
                        out.length = 0;
                    } else if (ch !== undefined) {
                        out.push (ch);
                        if (ch2 !== undefined) {
                            out.push (ch2);
                            ch2 = undefined;
                        }
                    }

                    esc = (ch === escapeCharVal);
                }
                // VESPER.log (out.length);

                if (utfwrap) {
                    //VESPER.log ("buffer ends during utf character sequence, ", utfwrap);
                    for (var m = 0; m < utfwrap; m++) {
                        buff[m] = buff [i - utfwrap + m];
                    }
                }
            }

            //matchEol = undefined;

            if (notifyFunc) {
                notifyFunc (VESPER.DWCAZipParse.zipStreamSVParser2.fileName, lineNo);
            }

            if (i > 0) {
                //VESPER.log ("SEGMENT");
                setTimeout (doWork, 1);
            }
            else {
                if (out.length > 0) {
                    bigOut.push (VESPER.DWCAZipParse.rowReader2 (out));
                }

                startt = MGNapier.NapVisLib.makeTime() - startt;
                VESPER.log ("Time: ", startt/1000, " secs.");
                VESPER.log ("Shared Maps: "+sharedMaps.length+", "+MGNapier.NapVisLib.countObjProperties (sharedMaps[1]));
                VESPER.log ("pulled out "+pb+" characters from zip");
                sharedMaps.length = 0;  // used, discard, helps GC
                //return bigOut;
                var callbacks = VESPER.DWCAZipParse.zipStreamSVParser2.callbackQ;
                VESPER.log ("callback queue length", callbacks.length);
                for (var cb = callbacks.length; --cb >= 0;) {
                    callbacks[cb](bigOut);
                }

                out.length = 0;
                //bigOut.length = 0; don't do this here, as if we load another part of the zip this makes the last parsed data disappear
            }

        }

        setTimeout (doWork, 1); // first timeout call
    };



    this.setNotifyFunc = function (newNotifyFunc) {
        notifyFunc = newNotifyFunc;
    };

    this.set = function (ifileData, ireadFields) {

        fileData = ifileData;
        fieldDelimiter = ifileData.fieldsTerminatedBy.replace ("\\t", "\t").replace("\\n", "\n");    // 'cos reading in from file doesn't escape tabs or return
        lineDelimiter = ifileData.linesTerminatedBy.replace ("\\t", "\t").replace("\\n", "\n").replace("\\r", "\r");
        quoteDelimiter = ifileData.fieldsEnclosedBy.replace ("\\\"", "\"");
        readFields = ireadFields;
        firstTrue = readFields.indexOf (true);
        fieldDelimiterVal = fieldDelimiter.charCodeAt (0);
        lineDelimVal = lineDelimiter.charCodeAt (0);
        qDelimVal = quoteDelimiter ? quoteDelimiter.charCodeAt (0) : -1;
        lineDelimLength = lineDelimiter.length;
        lineNo = 0;

        VESPER.log (VESPER.DWCAParser.sharedValuesTerms);
        // quick field lookups
        sharedMaps.length = 0;
        for (var n = 0; n < ifileData.invFieldIndex.length; n++) {
            var field = ifileData.invFieldIndex[n];
            var fieldData = ifileData.fieldData[field];
            defaults[n] = fieldData ? fieldData.default : undefined;
            invDiscreteTermIndex[n] = fieldData ? fieldData.discreteTermList : undefined;
            invSharedTermIndex[n] = VESPER.DWCAParser.sharedValuesTerms[field];
            if (invSharedTermIndex[n]) {
                sharedMaps[invSharedTermIndex[n]] = {};
            }
        }

        first256.length = 0;
        for (var k = 0; k < 256; k++) {
            first256.push (String.fromCharCode(k));
        }

        VESPER.log ("readFields", readFields);
        VESPER.log ("Q#", quoteDelimiter, "#");
    };

    return this;
}();
