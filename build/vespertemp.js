/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 11/06/13
 * Time: 13:02
 * To change this template use File | Settings | File Templates.
 */

/*var VESPER =*/ (function() {
    var vesper = {};
    vesper.alerts = false;
    vesper.logRun = false;
    vesper.log = function () {
        if (vesper.logRun) {
            //console.log.apply (console, arguments);
            Function.prototype.apply.call(console.log, console, arguments);
        }
    };
    vesper.imgbase = "../img/";
    vesper.log (vesper);

    vesper.init = function () {
        vesper.tooltip.init();
        vesper.titles = $.t("vesper.visTitles", {"returnObjectTrees":true});
    };

    if (typeof define === "function" && define.amd) {
        define(vesper);
    } else if (typeof module === "object" && module.exports) {
        module.exports = vesper;
    } else {
        this.VESPER = vesper;
    }

    //return vesper;
}());
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

        function doWork () {

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
                       // if (k % 1000 == 0 && window.opera) {
                       //     window.opera.collect();
                      // }
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
            }

        }

        setTimeout (doWork, 1);
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

// TimeLine

VESPER.BarChart = function(divid) {
	
	//var svg;	// top level svg
	var timelineG; // matrix rectangle (i.e. not the axes)
    var xaxis = d3.svg.axis();
	
	var dims;

    this.format = undefined;
    this.barClass = "countBin";
    this.childScale = d3.scale.linear();
    var logCountScale = d3.scale.log();
    //var linearCountScale = d3.scale.linear();
    var currentCountScale = logCountScale;

    var domainLimits = [undefined, undefined];
    var binned, selBinned;
    var rangeSlider = MGNapier.NapVisLib.rangeSlider();
    rangeSlider.tooltipTemplates ({
        "min": function (r,s) { return $.t("barChart.minPrefix")+self.wrapDataType (self.makeToNearest (s.invert (r[0]))); },
        "max": function (r,s) { return $.t("barChart.maxPrefix")+self.wrapDataType (self.makeToNearest (s.invert (r[1]))); },
        "bar": function () { return null; }
    });
	
	var self;
    var model;

	var exitDur = 400, updateDur = 500, enterDur = 500;
	
	var ffields = {};

    var margin = {left: 40, right: 20, top : 15, bottom: 40};

    this.minBarWidth = 5;
    this.toNearest = 1;
    this.divisions = [1, 2, 10, 100];

    var sharedAttrs = function (group) {
        var wh = dims[1] - margin.bottom;
        group
            .attr("x", function(d) { return self.childScale (d.start); })
            .attr("width", function (d) { return self.childScale (d.end) -  self.childScale (d.start); })
            .attr ("y", function(d) { return currentCountScale (d.count + 1); })
            .attr ("height", function(d) { return wh - currentCountScale (d.count + 1); })
            .style ("opacity", 1)
        ;
    };


    this.set = function (fields, mmodel) {
        ffields.keyField = mmodel.makeIndices ([fields.identifyingField])[0];
        ffields.dateField = mmodel.makeIndices ([fields.dateField])[0];
        ffields.realField = mmodel.makeIndices ([fields.realField])[0];
        dims = MGNapier.NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };


    this.go = function () {
		self = this;

        // stop annoying scrollbar even when svg is same height as parent div
        d3.select(divid).style("overflow", "hidden");
		
		var svg = d3.select(divid).selectAll("svg").data([0]);

        svg.enter()
			.append("svg:svg")
			.attr("class", "visContainer")
			.attr("pointer-events", "all")
		;

        svg = d3.select(divid).select("svg");
		
		timelineG = svg
			.append ("svg:g")
			.attr("class", "treeSVG")
		;

        var controls = d3.select(divid).select(".visControl");
        var noHashId = divid.substring (1);
        if (controls.empty()) {
            var butdiv = d3.select(divid).append("div")
                .attr("class", "visControl")
                .attr("id", noHashId+"Controls")
            ;

            //MGNapier.NapVisLib.addHRGrooves (butdiv);
            VESPER.DWCAHelper.addDragArea (butdiv);
            MGNapier.NapVisLib.makeSectionedDiv (butdiv, [{"header":$.t("barChart.typeLabel"), "sectionID":"Totals"}],"section");

            var choices = {Interval: self.uncalcCumulative, Cumulative: self.calcCumulative};
            var spans = butdiv.select(divid+"ControlsTotals").selectAll("span.fieldGroup")
                .data (d3.entries(choices), function(d) { return d.key;})
            ;

            spans.enter()
                .append("span")
                .attr ("class", "fieldGroup")
            ;

            // spans now has the entered spans
            spans.append("input")
                .attr("type", "radio")
                .attr("id", function(d) { return noHashId+ d.key; })
                .attr("name", "chartYType")
                .property ("checked", function(d) { return d.key === "Interval"; })
                .on ("change", function(d) {
                    var barDataSets = [binned.bins, selBinned.bins];
                    var barDataTypes = ["unselected", "selected"];
                    for (var k = 0; k < barDataSets.length; k++) {
                        (d.value)(barDataSets[k]);
                        self.redraw (timelineG.selectAll("."+self.barClass+"."+barDataTypes[k])
                            .data(barDataSets[k], function(d) { return Math.floor (d.start); }),
                            barDataSets[k]
                        );
                    }
                })
            ;
            spans.append("label")
                .attr("for", noHashId+"count")
                .text (function(d) { return d.key; })
            ;

            $( divid+"Controls" ).draggable();
        }

        self.childScale.range([margin.left, dims[0] - margin.right]);
        makeBins();


        var rangeg = svg.select("g.rangeHolder");
        if (rangeg.empty()) {
            svg.append ("g")
                .attr ("class", "rangeHolder")
                .attr ("transform", "translate(0,"+(dims[1] - 20)+")")
            ;
        }
        rangeg = svg.select("g.rangeHolder");

        //rangeSlider = MGNapier.NapVisLib.rangeSlider();
        rangeSlider(rangeg);
        rangeSlider
            .scale(self.childScale)
            .dragEndFunc (function (r, rscale) {
                domainLimits = [
                    self.wrapDataType (self.makeToNearest (rscale.invert (r[0]))),
                    self.wrapDataType (self.makeToNearest (rscale.invert (r[1])))
                ];
                makeBins();
                self.update();
            })
            .update()
        ;

		self.update ();
	};

    function makeBins () {
        //var binCount = Math.ceil ((self.childScale.range()[1] - self.childScale.range()[0]) / self.minBarWidth);
        binned = self.chunkInfo (model, model.getData(), ffields/*, undefined, binCount, true*/);
        self.childScale.domain (binned.extremes);
        VESPER.log ("bin data", binned.extremes, binned);
    }

    this.makeToNearest = function (val) {
        return Math.round (val / self.toNearest) * self.toNearest;
    };

	this.update = function () {

        selBinned = self.chunkInfo (model, model.getData(), ffields, /*undefined, binned.bins.length - 1, true,*/
            function (key) { return model.getSelectionModel().contains (key); });

        var bins = binned.bins;
        VESPER.log ("Selection bins", selBinned);
        var maxh = d3.max(bins, function(d) { return d.count + 1; });
        VESPER.log ("Max height", maxh);
        var wh = dims[1] - margin.bottom;
        currentCountScale.domain([1, maxh]).range ([wh, margin.top]).nice();

        var exists = timelineG.select("g.valueAxis");
        if (exists.empty()) {
            exists = timelineG.append("g")
                .attr("class", "valueAxis vesperAxis")
                .attr ("transform", "translate (0,"+(dims[1]-margin.bottom)+")")
            ;
        }
        exists.call(d3.svg.axis()
            .scale(self.childScale)
            .orient("bottom")
            .tickFormat (self.format)
        );

        var barDataSets = [bins, selBinned.bins];
        var barDataTypes = ["unselected", "selected"];
        for (var k = 0; k < barDataSets.length; k++) {
            VESPER.log ("bins", barDataSets[k]);
            var barClass = self.barClass;// + barDataTypes[k];
            var visBins = timelineG.selectAll("."+barClass+"."+barDataTypes[k]).data(barDataSets[k], function(d) { return Math.floor (d.start); });

            visBins.exit()
                .on ("mouseout", null)
                .on ("mouseover", null)
                .on ("contextmenu", null)
                //.select("title")
               //     .text ("")
            ;
            visBins.exit().remove();

            self.redraw (visBins, barDataSets[k]); // redraw current selection (i.e. ones that aren't exiting/ yet to enter)
            var delay = visBins.empty() ? 0 : updateDur;

            visBins.enter()
                .append("svg:rect")
                .attr("class", barClass+" "+barDataTypes[k])
                .style ("opacity", 0)
                .on("contextmenu", function(d) {
                    //handle right click
                    model.getSelectionModel().clear();
                    var arr = self.returnMatches (model, ffields, d.start, d.end);
                    model.getSelectionModel().addAllToMap (arr);
                    //stop showing browser menu
                    d3.event.preventDefault();
                })
                .on ("mouseover", function(d) {
                    d3.select(this).classed("highlight", true);
                    var selected = d3.select(this).classed("selected");
                    VESPER.tooltip.updateText($.t("barChart."+(selected ? "allLabel" : "selLabel")), self.makeTitle (d));
                    VESPER.tooltip.updatePosition (d3.event);
                })
                .on ("mouseout", function() {
                    d3.select(this).classed("highlight", false);
                    VESPER.tooltip.setToFade();
                })
                .transition()
                .delay (delay)
                .duration(enterDur)
                .call(sharedAttrs)
                //.append ("svg:title")
            ;
        }
	};


    this.redraw = function (currentDataSelection) {
        //var maxh = d3.max(barData, function(d) { return d.count + 1; });
        var wh = dims[1] - margin.bottom;
        currentCountScale/*.domain([1, maxh])*/.range ([wh, margin.top]).nice();
        var exists2 = timelineG.select("g.countAxis");
        if (exists2.empty()) {
            exists2 = timelineG.append("g")
                .attr("class", "countAxis vesperAxis")
                .attr ("transform", "translate ("+(margin.left-1)+",0)")
            ;
        }
        exists2.call(xaxis
            .scale(currentCountScale)
            .orient("left")
            .ticks (5, d3.format(",d"))
        );

        currentDataSelection
            .transition()
            .duration(updateDur)
            .call(sharedAttrs)
        ;
    };

    this.makeTitle = function () {};

    this.updateVals = this.update;

    this.chunkInfo = function (model, data, fields, /*binSize, binCount, round,*/ includeFunc) {
        var chart = self;
        var min = domainLimits[0];
        var max = domainLimits[1];
        var hardMin = (min !== undefined);
        var hardMax = (max !== undefined);
        //VESPER.log ("fmm", min, max, hardMin, hardMax);
        var bins = [];
        var count = 0, mint, maxt;

        function findMinMax () {
            if (!hardMin || !hardMax) {
                for (var key in data) {
                    if (data.hasOwnProperty (key) /*&& (!includeFunc || includeFunc (key, data))*/) {
                        var val = chart.getVal (model, data, key, fields);
                        if (val !== undefined) {
                            val = chart.wrapDataType (val, key);
                            var uval = chart.unwrapDataType (val);
                            count++;

                            if (!hardMin && (min === undefined || mint > uval)) {
                                min = val;
                                mint = chart.unwrapDataType (min);
                            }
                            if (!hardMax && (max === undefined || maxt < uval)) {
                                max = val;
                                maxt = chart.unwrapDataType (max);
                            }
                        }
                    }
                }
            }
        }
        findMinMax();
        //VESPER.log ("Counted "+count+" properties.");
        //VESPER.log ("data", data[0], data[1], data[2]);

        if (min !== undefined && max !== undefined) {
            var mind = chart.unwrapDataType (min); //min.getTime() / this.msinaday;
            var maxd = chart.unwrapDataType (max); //max.getTime() / this.msinaday;
            var domRange = (Math.ceil (maxd / self.toNearest) * self.toNearest) - (Math.floor (mind / self.toNearest) * self.toNearest);
            VESPER.log ("Mins and Maxs", maxd, mind, min, max, domRange, self.childScale.range());

            var newBarVals = chart.makeBarSizes (self.childScale.range()[1] - self.childScale.range()[0], domRange);
            var binSize = newBarVals.newBinSize;
            var binCount = newBarVals.newBinCount;
            VESPER.log ("Bin size & count", binSize, binCount);
            var fmind = Math.floor (mind / binSize) * binSize;

            for (var n = 0; n < binCount + 1; n++) {
                var size = fmind + (binSize * n);
                bins[n] = {count:0, start: chart.wrapDataType (Math.max (size, mind)), end: chart.wrapDataType (Math.min (size + binSize, maxd + binSize))};
            }

            function assignDataToBin () {
                //var t = 0;
                for (var key in data) {
                    if (data.hasOwnProperty (key)) {
                        if (!includeFunc || includeFunc (key, data)) {   // only add the data if it's to be included according to includeFunc (if includeFunc exists)
                            var val = chart.getVal (model, data, key, fields);
                            if (val !== undefined) {
                                val = chart.unwrapDataType (chart.wrapDataType (val, key));
                                if (!isNaN(val) && val >= mind) {
                                    var bi = Math.floor ((val - fmind) / binSize); // this means items are binned as start <= item < end for each bin (so end is that start of the next bin)
                                    if (0 <= bi && bi <= binCount) {
                                        bins[bi].count++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            assignDataToBin ();
        }

        return {extremes:[min,max],bins:bins};
    };


    this.returnMatches = function (model, fields, min, max) {
        var arr = [];
        var data = model.getData();

        for (var key in data) {
            if (data.hasOwnProperty (key)) {
                var val = self.getVal (model, data, key, fields);
                if (val !== undefined) {
                    val = self.wrapDataType (val, key);
                    if (min <= val && val < max) {
                        arr.push (key);
                    }
                }
            }
        }
        VESPER.log ("Min, max, array of matches", min, max, arr);
        return arr;
    };

    this.calcCumulative = function (bins) {
        VESPER.log ("Bins", bins);
          var sofar = 0;
          for (var n = 0; n < bins.length; n++) {
              var add = bins[n].count;
              bins[n].count += sofar;
              sofar += add;
          }
    };


    this.makeBarSizes = function (width, range) {
        var barDomainWidth = (range / width) * self.minBarWidth;
        var binSize;
        for (var n = 0; n < self.divisions.length; n++) {
            if (self.divisions[n] > barDomainWidth || n === self.divisions.length - 1) {
                binSize = self.divisions[n];
                break;
            }
        }

        VESPER.log ("Bar domain width, phys range, phys width", barDomainWidth, range, width);

        var binCount = Math.ceil (range / binSize);
        return {newBinSize: binSize, newBinCount: binCount};
    };


    this.uncalcCumulative = function (bins) {
        var last = 0;
        for (var n = 0; n < bins.length; n++) {
            var sub = bins[n].count;
            bins[n].count -= last;
            last = sub;
        }
    };

    this.getRangeSlider = function () {
        return rangeSlider;
    };

    this.baseDestroy = function () {
        VESPER.DWCAHelper.recurseClearEvents (d3.select(divid));

        var visBins = timelineG.selectAll(self.barClass);
        visBins.remove();

        $(divid+"Controls").draggable("destroy");

        model.removeView (self);
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divid);
    };

    this.destroy = function () {
        this.baseDestroy ();
    };
};


VESPER.TaxaDistribution = function (div) {
    var chart = new VESPER.BarChart (div);
    chart.makeTitle = function (d) {
        return $.t("barChart.taxaTooltip", {count: d.end - d.start, start: d.start, end: d.end - 1})
            +"<br>"
            +$.t("barChart.taxaCountLabel", {count: d.count});
    };
    chart.wrapDataType = function (d) { return d; };
    chart.unwrapDataType = function (o) { return o; };
    chart.getVal = function (model, data, key, fields) {
        var keyID = model.getIndexedDataPoint (data[key], fields.keyField);
        var realID = model.getIndexedDataPoint (data[key], fields.realField);
        if (realID === keyID || realID == undefined) { // don't count synonyms
            var node = model.getNodeFromID(key);
            var subTaxa = model.getSubTaxa(node);
            //var pid = model.getDataPoint (node, {fieldType:"parentNameUsageID", rowType:model.getMetaData().coreRowType});
            return (subTaxa ? subTaxa.length : 0);
        }
        return undefined;
    };
    chart.divisions = [1,2,10,100,1000];

    return chart;
};



VESPER.TimeLine = function (div) {
    var chart = new VESPER.BarChart (div);
    var timeCache = {};
    chart.childScale = d3.time.scale();
    chart.barClass = "timeBin";
    chart.format = d3.time.format ("Y%Y"); // d3.time.format.iso;
    chart.makeTitle = function (d) {return d.start.toString()+"<br>to "+ d.end.toString()+"<br>Records: "+d.count; };
    chart.wrapDataType = function (d, key) {
        var val = (key === undefined ? undefined : timeCache[key]);
        return (val === undefined ? new Date (d) : val);
    };
    chart.unwrapDataType = function (date) { return date.getTime(); };
    chart.getVal = function (model, data, key, fields) {
        var val = model.getIndexedDataPoint(data[key], fields.dateField);
        if (!timeCache[key] && val !== undefined) {
            timeCache[key] = new Date (val);
        }
        return val;
    };
    chart.destroy = function () {
        chart.baseDestroy ();
        timeCache = {};     // clear time cache
    };
    chart.getRangeSlider().tooltipTemplates ({
        "min": function (r,s) { return $.t("barChart.timeMinPrefix")+chart.wrapDataType (chart.makeToNearest (s.invert (r[0]))); },
        "max": function (r,s) { return $.t("barChart.timeMaxPrefix")+chart.wrapDataType (chart.makeToNearest (s.invert (r[1]))); },
        "bar": function () { return null; }
    });
    var oneDayInMs = 24 * 60 * 60 * 1000;
    chart.toNearest = oneDayInMs * 7; // to nearest week
    // approx divisions for one day, week, season, year, decade. Not exactly aligned fanks to leap years.
    chart.divisions = [oneDayInMs, oneDayInMs * 7, oneDayInMs * 91.3125, oneDayInMs * 365.25, oneDayInMs * 365.25 * 10];

    return chart;
};

/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 17/06/13
 * Time: 14:59
 * To change this template use File | Settings | File Templates.
 */

/*
VESPER.Model = function (metaData, data) {
    VESPER.Model.prototype = {
        getNodeFromID: function (id) {},

        getTaxaData: function (node) {},
        getSubTaxa: function (node) {}
    };

}
*/

VESPER.DWCAModel = function (metaData, data) {
    this.getMetaData = function (){ return this.metaData; };
    // In an implicit taxonomy, data.records and data.tree are the same object, so getData and getImplicitTaxonomy return the same
    // In an explicit taxonomy i.e. a tree of specimens, data.records is the specimens, and data.tree is the taxonomy we generated on top.
    this.getData = function (){ return this.data.records; };
    this.getImplicitTaxonomy = function () { return this.data.impTree; };
    this.getImplicitRoot = function (){ return this.data.impRoot; };
    this.getExplicitTaxonomy = function () { return this.data.expTree; };
    this.getExplicitRoot = function (){ return this.data.expRoot; };

    var viewCount = 0;
    var sessionModelViewID = 0;
    var selectionModel = new MGNapier.SharedSelection ();

    this.getSelectionModel = function () { return selectionModel; };

    // Has to be here, as selectionModel has no access to model
    this.invertSelection = function () {
        var d = this.getData();
        var s = this.getSelectionModel();
        var arr = [];
        //var tempField = {fieldType:"acceptedNameUsageID", rowType:this.getMetaData().coreRowType};
        for (var iid in d) {
            if (!s.contains(iid)) {
                //var n = this.getNodeFromID(iid);
                //var accv = this.getDataPoint (n, tempField);
                //if (accv == iid) {
                    arr.push (iid);
                //}
            }
        }
        s.clear ();
        s.addAllToMap (arr);
    };

    this.getExtraData = function (node) {
        return node[VESPER.DWCAParser.EXT];
    };

    this.getTaxaData = function (node) {
        return node[VESPER.DWCAParser.TDATA];
    };

    this.getSynonyms = function (node) {
        return node[VESPER.DWCAParser.SYN];
    };

    this.getRowData = function (node, rid) {
        if (rid == undefined) {
            return this.getTaxaData (node);
        }
        return this.getExtraData(node) == undefined ? undefined : this.getExtraData(node)[rid];
    };

    this.getSubTaxa = function (node) {
        return node[VESPER.DWCAParser.TAXA];
    };

    this.getSpecimens = function (node) {
        return node[VESPER.DWCAParser.SPECS];
    };


    // Recursive count getters
    this.getDescendantCount = function (node) {
        return node.dcount;
    };

    // All synonyms in the node and node subtaxa
    this.getSynonymCount = function (node) {
        return node.syncount || (this.getSynonyms(node) ? this.getSynonyms(node).length : 0);
    };

    // All specimens in the node and node subtaxa
    this.getSpecimenCount = function (node) {
        //console.log ("this", this);
        return node.spcount || (this.getSpecimens(node) ? this.getSpecimens(node).length : 0);
    };

    this.getObjectCount = function (node) {
        return (node.dcount || 0) + this.getSynonymCount(node) + this.getSpecimenCount(node);
    };

    this.getSelectedDescendantCount = function (node) {
        return node.Sdcount;
    };

    this.getSelectedSynonymCount = function (node) {
        return node.Ssyncount;
    };

    this.getSelectedSpecimenCount = function (node) {
        return node.Sspcount;
    };

    this.getSelectedObjectCount = function (node) {
        return (node.Sdcount || 0) + (node.Ssyncount || 0) + (node.Sspcount || 0);
    };

    this.getLeafValue = function (node) {
        var s = this.getSpecimens(node);
        return s ? s.length : 1;
    };

    this.getNodeFromID = function (id) {
        return this.getData()[id] || (this.getExplicitTaxonomy() ? this.getExplicitTaxonomy()[id] : undefined);
    };

    this.getLabel = function (node) {
        var nameField = this.getMetaData().vesperAdds.nameLabelField;
        return this.getDataPoint (node, nameField);
    };

    this.getDataPoint = function (node, fieldAndRowObj) {
        var rowData = this.getMetaData().fileData[fieldAndRowObj.rowType];
        if (rowData == undefined) {
            VESPER.log ("UNDEFINED ROW", fieldAndRowObj, this.getMetaData());
        }
        var findexer = rowData.filteredFieldIndex;
        var fid = findexer[fieldAndRowObj.fieldType];
        if (fid == undefined) { return undefined; }
        var rid = rowData.extIndex;
        if (rid == undefined) {
            return this.getTaxaData(node)[fid];
        }
        return this.getExtraData(node) ? this.getExtraData(node)[rid][0][fid] : undefined;
    };

    this.getIndexedDataPoint = function (node, index) {
        if (index == undefined || index.fieldType == undefined) { return undefined; }
        if (index.rowIndex == undefined) {
            return this.getTaxaData(node)[index.fieldIndex];
        }
        return (this.getExtraData(node)) ? this.getExtraData(node)[index.rowIndex][0][index.fieldIndex] : undefined;
    };

    // Plural indexed data points requires an array to return multiple results
    this.getIndexedDataPoints = function (node, index, arr) {
        if (index !== undefined && index.fieldType !== undefined) {
            if (index.rowIndex == undefined) {
                arr.push (this.getTaxaData(node)[index.fieldIndex]);
            }
            else if (this.getExtraData(node)) {
                var dats = this.getExtraData(node)[index.rowIndex];
                //Array.prototype.push.apply (arr, dats);
                for (var n = 0; n < dats.length; n++) {
                    arr.push (dats[n]);
                }
            }
        }
    };

    // Finds first instance of field name in filedata structure
    this.makeIndices = function (fieldNames) {
        var fieldData = [];
        for (var n = 0, len = fieldNames.length; n < len; n++) {
            fieldData.push (this.makeIndex (fieldNames[n]));
        }
        return fieldData;
    };


    this.makeIndex = function (fieldName) {
        var fileData = this.getMetaData().fileData;
        for (var type in fileData) {
            if (fileData.hasOwnProperty(type)) {
                var i = fileData[type].filteredFieldIndex[fieldName];
                if (i !== undefined) {
                    return {"rowIndex": fileData[type].extIndex, "rowType": type, "fieldIndex": i, "fieldType":fieldName};
                }
            }
        }

        return null;
    };

    this.getRowRecords = function (node, rid) {
        if (rid == undefined) {
            return this.getTaxaData (node); // a single array
        }
        return this.getExtraData(node) ? this.getExtraData(node)[rid] : undefined; // an array of arrays
    };

    this.addView = function (view) {
        selectionModel.addSingleVis (view);
        viewCount++;
        sessionModelViewID++;
    };

    this.removeView = function (view) {
        selectionModel.removeVis (view);
        viewCount--;
    };

    this.getViewCount = function () {
        return viewCount;
    };

    this.getNextSessionModelViewID = function () {
        return sessionModelViewID;
    };

    this.update = function () {
        selectionModel.update();
    };

    this.countSelectedDesc = function (taxon, idField) {
        //var stopwatch = {base: 0};
        //MGNapier.NapVisLib.resetStopwatch (stopwatch);
        this.countSelectedDescNew (taxon, idField);
        //console.log ("new", MGNapier.NapVisLib.elapsedStopwatch (stopwatch), "ms");
    };


    this.countSelectedDescNew = function (taxon, idField) {
        this.doSelectCount (taxon, idField, "Sdcount", this.getSubTaxa, this.getDescendantCount);
        this.doSelectCount (taxon, idField, "Ssyncount", this.getSynonyms, this.getSynonymCount);
        this.doSelectCount (taxon, idField, "Sspcount", this.getSpecimens, this.getSpecimenCount);
    };

    // need to figure this out...
    this.doSelectCount = function (taxon, idField, countField, func, totFunc) {
        var taxa = this.getSubTaxa (taxon);
        var countables = func ? func (taxon) : undefined;
        var maxPossible = totFunc ? totFunc.call (this, taxon) : 0;
        var len = (countables ? countables.length : 0);
        var c = 0;

        if (maxPossible || len) { // no point testing for selections if no selectable objects beneath this point

            if (len) {
                for (var n = len; --n >= 0;) {
                    c += this.getSelectionModel().contains (this.getIndexedDataPoint (countables[n], idField)) ? 1 : 0;
                }
            }
            if (maxPossible > len) {  // no point burrowing further down the tree if maxpossible is zero
                for (var n = taxa.length; --n >= 0;) {
                    c += this.doSelectCount (taxa[n], idField, countField, func, totFunc);
                }
            }

            taxon[countField] = c;
        }

        return c || 0;
    };

    this.data = data;
    this.metaData = metaData;
};

/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 17/09/13
 * Time: 13:50
 * To change this template use File | Settings | File Templates.
 */




VESPER.demo = function (files, exampleDivID) {

    //VESPER.tooltip.init();
    VESPER.init();

    var selectionOptions = {useExtRows: true, selectFirstOnly: true};
    var DWCAHelper = VESPER.DWCAHelper;

    var visChoiceData = [
        {type: "VisLauncher", multiple: false, attList: ["unachievable"], matchAll: true, image: VESPER.imgbase+"tree.png", height: "null", width: "200px",
            newVisFunc: function (div) { return new VESPER.VisLauncher (div, {"autoLaunch":"on"});},
            setupFunc: function () {return {"visChoiceData":visChoiceData}; }
        },
        {type: "ImplicitTaxonomy", multiple: true, attList: VESPER.DWCAParser.neccLists.impTaxonomy, matchAll: true, image: VESPER.imgbase+"tree.png", height: "600px",
            newVisFunc: function (div) { return new VESPER.ImplicitTaxonomy (div);},
            setupFunc: function () {return {"rankField":"taxonRank"}; }
        },
        {type: "ExplicitTaxonomy", multiple: true, attList: VESPER.DWCAParser.neccLists.expTaxonomy, matchAtLeast: 2, matchAll: false, image: VESPER.imgbase+"tree.png", height: "600px",
            newVisFunc: function (div) { return new VESPER.ExplicitTaxonomy (div);},
            setupFunc: function () {return {"rankField":"taxonRank"}; }
        },
        {type: "DWCAMapLeaflet", multiple: true, attList: VESPER.DWCAParser.neccLists.geo, matchAll: true, image: VESPER.imgbase+"world.png", height: "400px",
            newVisFunc: function (div) { return new VESPER.DWCAMapLeaflet (div);},
            setupFunc: function () {return {"latitude":"decimalLatitude", "longitude":"decimalLongitude"}; }
        },
        {type: "TimeLine", multiple: true, attList: VESPER.DWCAParser.neccLists.basicTimes, matchAll: true, image: VESPER.imgbase+"calendar.png", height: "200px",
            newVisFunc: function (div) { return VESPER.TimeLine (div);},
            //setupFunc: function (coreFieldIndex) { return {"dateField":coreFieldIndex["eventDate"]}}
            setupFunc: function () { return {"dateField":"eventDate"}; }
        },
        {type: "Sanity", multiple: true, attList: [], matchAll: false, image: VESPER.imgbase+"comment.png", height: "400px",
            newVisFunc: function (div) { return new VESPER.Sanity (div);},
            setupFunc: function () { return undefined; }
        },
        {type: "RecordDetails", multiple: true, attList: [], matchAll: false, image: VESPER.imgbase+"comment.png", height: "500px",
            newVisFunc: function (div) { return new VESPER.RecordDetails (div);},
            setupFunc: function () { return undefined; }
        },
        {type: "TaxaDistribution", multiple: true, attList: VESPER.DWCAParser.neccLists.impTaxonomy, matchAll: true, image: VESPER.imgbase+"dist.png", height: "200px",
            newVisFunc: function (div) { return VESPER.TaxaDistribution (div);},
            setupFunc: function () { return {"realField":"acceptedNameUsageID", "rankField":"taxonRank"}; }
        },
        {type: "FilterView", multiple: true, attList: [], matchAll: false, image: VESPER.imgbase+"search.png", height: "150px", width: "200px",
            newVisFunc: function (div) { return new VESPER.FilterView (div);},
            setupFunc: function () { return {} ;}
        }
    ];
    var visTiedToSpecificAttrs = visChoiceData.slice (0, 6);
    var progressBarID = "vesperProgressBar"; // from id in demoNew.html

    var model;
    var meta;

    function getMeta () { return meta; }


    function showPanelsOnLoad (d) {
        DWCAHelper.divDisplay(["#showOnZipLoadDiv"], "none");
        DWCAHelper.divDisplay(["#selDiv"], "block");
        d3.select("#filenamePlaceholder").html(d.name);
        d3.select("#filesizePlaceholder").html("...");
        d3.select("#dynamicSelectDiv").selectAll("span input").property("checked", false);
        d3.select("#loadButton").property("disabled", true);
    }

    function setChoices (choiceData) {
        var descriptions = $.t("demo.descriptions", {"returnObjectTrees":true});
        var origins = $.t("demo.origins", {"returnObjectTrees":true});
        for (var n = choiceData.length; --n >= 0;) {
            choiceData[n].description = descriptions[files[n].name];
            choiceData[n].origin = origins[files[n].name];
        }


        var table = d3.select(exampleDivID).select("table");
        if (table.empty()) {
            table = d3.select(exampleDivID).append("table");
            var headerRow = table.append("tr");
            var headerText = [$.t("demo.dataHeader"), $.t("demo.descHeader"), $.t("demo.origHeader")];
            var headers = headerRow.selectAll("th").data(headerText);
            headers.enter().append("th").text(function(d) { return d; });
        }

        var choices = table.selectAll("tr").data (choiceData, function(d) { return d == undefined ? undefined : d.name; });
        var rows = choices.enter()
            .append ("tr")
        ;
        rows.append("td")
            .append ("button")
            .attr ("class", "choice")
            .attr ("type", "button")
            .attr ("id", function(d) { return d.name;})
            .text (function(d) { return d.name; })
            .on ("click", function(d) {
                MGNapier.NapVisLib.xhr2 (d.file, 'text/plain; charset=x-user-defined',
                    function (xhr) {
                        var bufferOrString = MGNapier.NapVisLib.getText (xhr);
                        MGNapier.NapVisLib.showProps (xhr);
                        asyncSetUpFromMeta (bufferOrString);
                    }
                );
                showPanelsOnLoad (d);
            })
        ;

        rows.append("td").text(function(d) { return d.description; });
        rows.append("td").text(function(d) { return d.origin; });

        // make progress bar
        DWCAHelper.makeProgressBar (undefined, progressBarID, "loadProgressDiv");

        MGNapier.NapVisLib.makeFileLoadButton (d3.select("#yourData"), "choice", "localLoader", "Load",
            function (file, content) {
                showPanelsOnLoad (file);
                asyncSetUpFromMeta (content);
            }
        );
    }




    function setPresets (visSetupData, radioChoices) {
        var checkListParent = d3.select("#listDiv");
        var bdiv = d3.select("#dynamicSelectDiv");

        for (var n = 0; n < visSetupData.length; n++) {
            var data = visSetupData[n];
            data.title = VESPER.titles [data.type];
            var spanSelection = DWCAHelper.addCheckbox (bdiv, data, "fieldGroup");
            var onVisOptClickFunc = function (d) {
                var setVal = d3.select(this).property("checked");
                DWCAHelper.setAllFields (checkListParent, setVal, d.attList, DWCAHelper.isIdWrap, getMeta(), selectionOptions);

                //var cBoxClass = d3.select(d3.select(this).node().parentNode).attr("class"); // up one
                var cBoxClass = d3.select(this.parentNode).attr("class"); // up one
                var cGroup = bdiv.selectAll("span."+cBoxClass+" input[type='checkbox']");
                var ggroup = DWCAHelper.reselectActiveVisChoices (cGroup, checkListParent, function() { return getMeta(); }, selectionOptions);
                d3.select("#loadButton").property("disabled", ggroup.empty());
            };
            DWCAHelper.configureCheckbox (spanSelection, data.attList, onVisOptClickFunc);
        }

        var ldiv = d3.select ("#labelSelectDiv");
        for (var n = 0; n < radioChoices.length; n++) {
            var data = {"fieldType":radioChoices[n], "rowType":undefined};
            var elem = DWCAHelper.addRadioButton (ldiv, data, "fieldGroup", "nameChoice", function(d) { return d.fieldType; });
            DWCAHelper.configureRadioButton (elem, checkListParent,
                function(result) {
                    // had to make copy of result, as otherwise previous metafile objects will be pointing to the same object.
                    // (remember, we can have more than one dataset open at a time)
                    getMeta().vesperAdds.nameLabelField = $.extend ({}, result);
                    reselectVisChoices();
                },
                function() { return getMeta(); },
            selectionOptions);
        }

        var setVisOptionBoxes = function (bool) {
            var cboxes = d3.select("#dynamicSelectDiv").selectAll(".fieldGroup input");
            cboxes = cboxes.filter (function() {return d3.select(this).style("display") !== "none"; });
            cboxes.property ("checked", bool);
            if (!bool) {
                var rbuts = d3.select("#labelSelectDiv").selectAll(".fieldGroup input");
                rbuts = rbuts.filter (function() {return d3.select(this).style("display") !== "none"; });
                rbuts.property ("checked", bool);
                getMeta().vesperAdds.nameLabelField = null;
            }
        };

        DWCAHelper.addHelperButton (d3.select("#advancedSelectDiv"), checkListParent, "Remove Verbose Fields", VESPER.DWCAParser.flabbyLists.wordyList,
            false, null, "selButtonStyle listCon", function() { return getMeta(); }, selectionOptions);
        var excepFunc = function exceptionFunc (d, i) { return i === 0; };
        d3.select("#allButton").on("click", function() {
            DWCAHelper.setAllFields (checkListParent, true, undefined, excepFunc, getMeta(), selectionOptions);
            setVisOptionBoxes (true);
            return false;
          });
        d3.select("#clearButton").on("click", function() {
            DWCAHelper.setAllFields (checkListParent, false, undefined, excepFunc, getMeta(), selectionOptions);
            setVisOptionBoxes (false);
            return false;
          });
        var useExtBox = DWCAHelper.addCheckbox (d3.select("#advancedSelectDiv"), {title:"Search DWCA Extensions", image:null}, "fieldGroup");
        useExtBox.select("input")
            .property ("checked", selectionOptions.useExtRows)
            .on("click", function() {
                selectionOptions.useExtRows = !selectionOptions.useExtRows;
                refilterNameChoices (getMeta());
                refilterVisChoices (getMeta());
        });
        var selectFirstOnlyBox = DWCAHelper.addCheckbox (d3.select("#advancedSelectDiv"), {title:"Select First Matching Field Only", image:null}, "fieldGroup");
        selectFirstOnlyBox.select("input")
            .property ("checked", selectionOptions.selectFirstOnly)
            .on("click", function() {
                selectionOptions.selectFirstOnly = !selectionOptions.selectFirstOnly;
            });
        var advSelFunc = function () {
            var val = d3.select(this).property("checked") ? "block" : "none";
            DWCAHelper.divDisplay(["#advancedSelectDiv", "#listDiv"], val);
            return false;
        };
        var advCheckbox = DWCAHelper.addCheckbox (d3.select("#advRevealPlaceholder"), {title:"Advanced Options", image: null}, "showAdv");
        advCheckbox.select("input").on("click", advSelFunc);
    }





    function proceed (zip, mdata) {

        DWCAHelper.divDisplay(["#"+progressBarID], "block");
        function notifyFunc (fileName, lines) {
            d3.select("#"+progressBarID).select("p").html($.t("demo.zipProcTemplate", {"fileName":fileName, "count": lines}));
        }
        VESPER.DWCAZipParse.setNotifyFunc (notifyFunc);

        var doneCallback = function (modelGen) {
            model = modelGen;
            afterZipFilesRead ();
        };
        //model =
            VESPER.DWCAParser.filterReadZipEntriesToMakeModel (zip, mdata, doneCallback);
    }

    function afterZipFilesRead () {
        VESPER.log ("META", meta);
        VESPER.log ("MODEL", model);
        if (VESPER.alerts) { alert ("mem monitor point X"); }

        DWCAHelper.divDisplay(["#selDiv"], "none");
        DWCAHelper.divDisplay(["#allVisDiv"], "block");
        d3.select("#"+progressBarID).select("p").html($.t("demo.initViewsMessage"));

        // Do a set timeout so the progressbar is updated with the above message before the views start initialising
        setTimeout (
            function() {
                // the replace regex rips out nonalphanueric strings as dots and hashes cause trouble when passing the name as an id to d3selectors
                model.name = d3.select("#filenamePlaceholder").text().replace(/\W/g, '');
                (new VESPER.VisLauncher()).makeVis (visChoiceData[0], model);
                DWCAHelper.divDisplay(["#"+progressBarID], "none");

                // Aid G.C.
                model = null;
                meta = null;
            },
            1   // timeout in ms
        );
    }


    var asyncSetUpFromMeta = function (bufferOrStringData) {
        var pHolder = d3.select("#filesizePlaceholder");
        pHolder.html(null);
        pHolder.append("img")
            .attr("class", "vesperIcon")
            .attr("src", VESPER.imgbase+"zipIcon.gif")
        ;
        pHolder.append("span")
            .text ((bufferOrStringData.length || bufferOrStringData.byteLength).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +" bytes")
        ;

        if (VESPER.alerts) { alert ("check memory use in task manager"); }
        var accessZip = VESPER.DWCAParser.accessZip (bufferOrStringData, "meta.xml");
        var metaData = accessZip.meta;
        meta = metaData;
        if (!meta.error) {
            var zip = accessZip.jszip;

            DWCAHelper.makeFieldSelectionBoxes (metaData, d3.select("#listDiv"));  // Makes checkboxes for all fields (normally hidden)
            d3.select("#loadButton").on("click", null).on("click", function() { proceed (zip, metaData); return false;});

            refilterVisChoices (metaData);
            refilterNameChoices (metaData);

            var nameChoiceGroup = d3.select("#labelSelectDiv").selectAll("span.fieldGroup");
            var first = true;
            nameChoiceGroup.each (function() {
                var disp = d3.select(this).style ("display");
                if (disp !== "none" && first) {
                    first = false;
                    var button = d3.select(this).select("input");
                    // this is cross-browser
                    var click_ev = document.createEvent("MouseEvent");
                    click_ev.initEvent("click", true /* bubble */, true /* cancelable */);
                    button.node().dispatchEvent(click_ev);
                    //button.node().click(); // this wasn't (didn't work in safari)
                }
            });

            DWCAHelper.divDisplay (["#showOnZipLoadDiv"], "block");
        } else {
            alert (meta.error+" "+$.t("demo.DWCAErrorMeta"));
            // flash up something to say not a dwca file (one we can read at least)
        }
    };

    // Decide which name options to show
    function refilterNameChoices (metaData) {
        var nameChoiceGroup = d3.select("#labelSelectDiv").selectAll("span.fieldGroup");
        nameChoiceGroup
            //.property ("checked", false)
            .style ("display", function(d) {
                var poss = DWCAHelper.fieldListExistence (metaData, [d.fieldType], true, undefined, selectionOptions.useExtRows);
                if (poss.fields.length > 0) {
                    d.rowType = poss.fields[0].rowName;
                }
                //VESPER.log ("NAME STATE", d, poss.match);
                return poss.match ? null : "none";
            })
        ;
    }

    // Decide which vis options to show
    function refilterVisChoices (metaData) {
        var visCheckBoxGroup = d3.select("#dynamicSelectDiv").selectAll("span.fieldGroup");
        visCheckBoxGroup
            .property ("checked", false)
            .style ("display", function(d) {
                var poss = DWCAHelper.fieldListExistence (metaData, d.attList, d.matchAll, d.matchAtLeast, selectionOptions.useExtRows);
                return poss.match ? null : "none";
            })
        ;
    }

    // Reselect active vis choices after a change (in case removing one vis or name choice removes fields another vis needs)
    function reselectVisChoices () {
        var visCheckBoxGroup = d3.select("#dynamicSelectDiv").selectAll("span.fieldGroup input");
        DWCAHelper.reselectActiveVisChoices (visCheckBoxGroup, d3.select("#listDiv"), function() { return getMeta(); });
    }

    setChoices (files);
    setPresets (visTiedToSpecificAttrs, VESPER.DWCAParser.labelChoiceData);
};

VESPER.DWCAHelper = new function () {

    var DWCAHelper = this; // self

    this.getSelectedTickBoxValues = function (parentElement, checkboxClass) {
        var argStr = "input[type=checkbox]"+(checkboxClass ? "."+checkboxClass : "");
        var extCBSel = d3.select(parentElement).selectAll (argStr);
        var values = {};

        extCBSel.each (localFunc);

        function localFunc () {
            if (this.checked) {
                values[this.value] = true;
            }
        }

        return values;
    };


    function setBackground (d) {
        var check = this.checked;
        var elem = d3.select(this.parentNode);
        var back = VESPER.DWCAParser.controlledVocabSet[d] ? "#999977" : "#888888";
        elem.style ("background", check ? "" : back);
    }

    function isCore (fd, metaData) { return fd.rowType === metaData.coreRowType; }
    function isId (fd, d) { return fd.invFieldIndex[fd.idIndex] === d; }
    function getItemSelection (fd, d) { return fd.selectedItems[d] === true || isId(fd, d); }
    function setItemSelection (fd, d, val) { fd.selectedItems[d] = val; }
    function getRowTypeSelection (d) { return d.selected === true; }
    function setRowTypeSelection (d, val) { d.selected = val; }

    this.isIdWrap = function (fd, d) { return isId (fd,d); };

    function updateTable (table, metaData, tableKey) {
        VESPER.log ("Table, metadata, table key", table, metaData, tableKey);
        var fd = metaData.fileData[tableKey];
        var s = getRowTypeSelection (fd);

        table
            .style ("background", s ? "" : "#888888")
        ;
        table.selectAll("td")
            .style ("background", function(d) {
                return getItemSelection(fd, d) && s ? setBackground(d) : "#888888";
            })
        ;
        table.selectAll("td input")
            .attr ("disabled", function(d) { return isId(fd, d) || !s ? "disabled" : null; })
            .property ("checked", function(d) { return getItemSelection (fd, d); })
        ;

	  table.selectAll("th")
		.style ("background", function(d) {
                return s ? setBackground(d) : "#888888";
            })
	  ;
	  table.selectAll("th input")
            .property ("checked", function() { return s; })
        ;
    }

    this.makeFieldSelectionBoxes = function (metaData, parentSelection) {
        setRowTypeSelection (metaData.fileData[metaData.coreRowType], true);

        VESPER.log ("meta", metaData);
        var boxData = d3.entries (metaData.fileData);
        for (var n = 0; n < boxData.length; n++) {
            boxData[n].value.selectedItems = boxData[n].value.selectedItems || {};
            //var pid =
        }
        var divs = parentSelection.selectAll("div.selectBox")
            .data (boxData, function (d) { return d.key; })
        ;

        divs.exit().selectAll("input").on ("click",  null);    // remove event handlers before removing things from dom. meant to avoid memory leaks.
        divs.exit().remove();

        var width = Math.floor (100 / boxData.length) - 2;

        // Make new divs and tables if necessary, then set width and class/id's for all divs/tables
        var newTables = divs.enter()
            .append ("div")
            .attr ("class", "selectBox")
            .append ("table")
        ;
        divs
            .style ("width", width+"%")
            .select("table")
                .attr ("class", function (d) { return d.key === metaData.coreRowType ? "coreTable" : null; })
                .attr ("id", function (d) { return d.value.mappedRowType; })
        ;

        var headers = newTables
            .append ("tr")
            .append ("th")
        ;
        headers.append ("input")
            .attr ("type", "checkbox")
            .attr ("class", "extensionFile")
            .attr ("id", function(d) { return "cbox"+d.value.mappedRowType;})
            .property ("checked", function(d) { return getRowTypeSelection (d.value); })
            .attr ("value", function(d) { return d.value.rowType; })
            .attr ("name", function(d) { return d.value.mappedRowType;})
            .attr ("disabled", function(d) { return d.key === metaData.coreRowType ? "disabled" : null; })
            .on ("click", function (d, i) {
                var check = this.checked;
                VESPER.log ("check", check, this);
                setRowTypeSelection (d.value, check);
                updateTable (d3.select(newTables[0][i]), metaData, d.key);
                return true;
            })
            .each (setBackground)
        ;
        headers.append ("label")
            .attr ("for", function(d) { return "cbox"+d.value.mappedRowType;})
            .text (function(d) { return d.value.mappedRowType; })
        ;

       // tables.each (makeRows);
        divs.selectAll("table").each (makeRows);


        function makeRows (d, i) {
            VESPER.log ("makerow args", arguments);
            var fdEntry = d;
            VESPER.log ("table index and datum", i, d);
            var table = d3.select(this);
            var tableId = table.attr ("id");
            var suffixNames = d.value.invFieldIndex.filter (function (elem) { return elem !== undefined; });
            var rows = table.selectAll("tr.col")
                .data (suffixNames)
            ;

            rows.exit().selectAll("input").on("click", null);
            rows.exit().remove();

            var newCells = rows.enter()
                .append ("tr")
                .attr ("class", "col")
                .append ("td")
            ;
            newCells.append ("input")
                .attr ("type", "checkbox")
                .attr ("class", "CSVField")
            ;
            newCells.append ("label");

            var existingCells = rows.select("td");
            existingCells.select("input")
                .property ("checked", function(d) { return getItemSelection (fdEntry.value, d); })
                .attr ("id", function (d) { return tableId+d;})
                .attr ("value", function(d, i) { return i;})
                .attr ("name", function(d) { return d;})
                .attr ("disabled", function(d) { return isId (fdEntry.value, d) ? "disabled" : null; })
                .on ("click", null)
                .on ("click", function (d) {
                    var check = this.checked;
                    //setBackground.call (this, d, i);
                    VESPER.log ("File data object entry", fdEntry, check, this);
                    setItemSelection (fdEntry.value, d, check);
                    updateTable (table, metaData, fdEntry.key);
                    return true;
                })
                .each (setBackground)
            ;

            existingCells.select("label")
                .attr ("for", function(d) { return tableId+d;})
                .text (function(d) { return d; })
            ;
        }
    };


    this.getAllSelectedFilesAndFields = function (metaData) {
        var struc = {};
        var fd = metaData.fileData;
        for (var prop in fd) {
            if (fd.hasOwnProperty (prop)) {
                var rowType = fd[prop];

                if (rowType.selected) {
                    var selItems = rowType.selectedItems;
                    VESPER.log ("selected items", selItems);
                    var nums = {};
                    var l = 0;
                    for (var i in selItems) {
                        if (selItems.hasOwnProperty (i) && selItems[i]) {
                            nums[i] = true;
                            l++;
                        }
                    }

                    if (l) {
                        //var idd = (metaData.coreRowType === prop) ? "id" : "coreid";
                        var idd = rowType.invFieldIndex [rowType.idIndex];
                        nums[idd] = true;
                        struc[prop] = nums;
                    }
                }
            }
        }

        VESPER.log ("Selected File and Fields Structure", struc);
        return struc;
    };


    // parentSelection - div of tables holding checkboxes
    // torf - true or false. Set or unset.
    // list - list of fieldnames to use in this op. Undefined if we're considering everything.
    // exceptionFunc - function that excludes some checkboxes from this operation
    // metaData - the DWCA metadata object
    // selectionOptions object
    //      .includeExtFiles - does this apply just to fields in core file or extension files too?
    //      .selectFirstOnly - select just the first field with the given name we come across? (selection only, clearing clears all such fields)
    this.setAllFields = function (parentSelection, torf, list, exceptionFunc, metaData, selectionOptions) {
        //VESPER.log ("efunc", exceptionFunc, parentSelection, list, metaData);
        var tables = parentSelection.selectAll("table");
        var includeExtFiles = (selectionOptions ? selectionOptions.useExtRows : true);
        var selectFirstOnly = (selectionOptions ? selectionOptions.selectFirstOnly : false);

        var fd = metaData.fileData;
        // make array ordered with core row type as first entry
        var fdArray = d3.entries(fd).sort(function(a,b) {
            return isCore (a.value, metaData) ? -1 : (isCore (b.value, metaData) ? 1: 0);
        });

        var nullableList = (list ? list.slice(0) : undefined); // list we can safely null values in with no side-effects (possible since list is passed in as a parameter)

        for (var n = 0; n < fdArray.length; n++) {
            var f = fdArray[n].value;
            var si = f.selectedItems;
            var llist = nullableList || f.invFieldIndex;
            if (si !== undefined) {
                for (var m = 0; m < llist.length; m++) {
                    var i = llist[m];
                    if (f.fieldIndex[i]) {
                        si[i] = (isCore (f, metaData) || includeExtFiles) ? ((exceptionFunc ? exceptionFunc (f, i) : false) || torf) : false;
                        if (torf && selectFirstOnly && nullableList) {
                            nullableList[m] = null;
                        }
                    }
                }

                var vals = d3.values (si);
                var uniq = d3.set(vals);
                setRowTypeSelection (f, uniq.has("true")); // set whether 'row' i.e. core or extension file is selected
                //VESPER.log (f.rowType, uniq.has("true"));
            }
        }

	    setRowTypeSelection (metaData.fileData[metaData.coreRowType], true); // make sure core extension file is selected

        tables.each (
            function (d) {
                updateTable (d3.select(this), metaData, d.key);
            }
        );
    };


    // check metamodel against list of fieldnames
    // needAll decides whether we need to match all the list or just part of it
    this.fieldListExistence = function (meta, list, needAll, orMatchAtLeast, checkExtRows, onFiltered) {

        var listSet = d3.set (list);
        var matchSet = d3.set ();
        var fieldCheck = onFiltered ? "filteredInvFieldIndex" : "invFieldIndex";

        var all = [];
        for (var prop in meta.fileData) {
            if (meta.fileData.hasOwnProperty (prop)) {
                var row = meta.fileData[prop];
                if (checkExtRows || isCore (row, meta)) {
                    for (var m = 0; m < row[fieldCheck].length; m++) {
                        var fieldName = row[fieldCheck][m];
                        if (listSet.has (fieldName)) {
                            matchSet.add (fieldName);
                            all.push ({fieldName: fieldName, rowName: prop});
                        }
                    }
                }
            }
        }

        VESPER.log ("Field List", list, "Match", all, matchSet.values());
        var matchLength = matchSet.values().length;
        var ok = needAll ? matchLength === list.length : (orMatchAtLeast ? matchLength >= orMatchAtLeast : matchLength > 0);
        return {match: ok, fields: all} ;
    };


    this.addHelperButton = function (parentSelection, fieldParentSelection, listName, list, add, img, klass, metaFunc, selOptions) {
        //VESPER.log ("IN", listName, list, add, parentSelection.selectAll("button[type=button]."+klass));
        var buttons = parentSelection
            .selectAll("button[type=button]."+klass)
            .data([{key: listName, value: list, add: add}], function (d) { return d.key; })
        ;

        buttons
            .enter()
            .append("button")
            .attr ("type", "button")
            .attr ("class", klass)
            .attr ("value", function (d) { return d.key; })
            .attr ("name", function (d) { return d.key; })
            .on ("click", function (d) { DWCAHelper.setAllFields (fieldParentSelection, d.add, d.value, isId, metaFunc(), selOptions); })
            .html (function (d) { return (img ? "<img src=\""+img+"\">" : "") + d.key; })
        ;
    };


    this.addCheckbox = function (parentSelection, cdata, klass) {
        var cboxGroup = parentSelection
            .selectAll("span")
            .data([cdata], function (d) { return d.title; })
        ;

        function titleOrName (d) { return d.title || d.name; }

        if (!cboxGroup.enter().empty()) {
            var newGroup = cboxGroup.enter()
                .append ("span")
                .attr ("class", klass)
            ;

            newGroup
                .append ("input")
                .attr ("type", "checkbox")
                .attr ("value", titleOrName)
                .attr ("name", titleOrName)
                .attr ("id", titleOrName)
                .property ("checked", false)
            ;



            var newLabel = newGroup
                .append("label")
                .attr ("for", titleOrName)
               // .text ( titleOrName)
            ;

            if (cdata.icon || cdata.image) {
                newLabel.append ("img")
                    .attr ("class", "vesperIcon")
                    .attr ("alt",  titleOrName)
                    .attr ("src", function(d) { return d.image || d.icon; })
                ;
            }

            newLabel.append("span")
                .text ( titleOrName)
            ;
        }

        return cboxGroup;
    };


    this.configureCheckbox = function (checkBoxSpanSelection, list, clickFunc) {
        if (list) {
            checkBoxSpanSelection.datum().attList = list;
        }

        checkBoxSpanSelection.select("input")
            .on ("click", clickFunc)
        ;
    };

    this.reselectActiveVisChoices = function (group, cboxListParentSelection, meta, selOptions) {
        group = group.filter (function() { return d3.select(this).property("checked"); });
        var list = [];
        group.each (function(d) { list.push.apply (list, d.attList); } );
        DWCAHelper.setAllFields (cboxListParentSelection, true, list, isId, meta(), selOptions);
        return group;
    };


    this.addRadioButton = function (parentSelection, cdata, klass, groupName, textFunc) {
        var rbutControl = parentSelection
            .selectAll("span")
            .data([cdata], function (d) { return textFunc(d); })
        ;

        if (!rbutControl.enter().empty()) {
            var rwrapper = rbutControl.enter()
                .append("span")
                .attr("class", klass)
            ;

            rwrapper
                .append ("input")
                .attr ("type", "radio")
                .attr ("value", textFunc)
                .attr ("name", groupName)
                .attr ("id", function (d) { return textFunc(d)+"RBChoice"; })
                .property ("checked", false)
            ;

            rwrapper
                .append("label")
                .attr ("for", function(d) { return textFunc(d)+"RBChoice";})
                .text (textFunc)
            ;
        }

        return rbutControl;
    };


    this.configureRadioButton = function (rbLabelWrapper, cboxListParentSelection, changeThisObjFunc, metaDataFunc, selOptions) {
        rbLabelWrapper
            .select("input")
            .on ("click", function (d) {
                var setVal = d3.select(this).property("checked");
                var gName = d3.select(this).attr("name");
                var rGroup = d3.selectAll("input[type='radio'][name='"+gName+"']");
                var list = [];
                rGroup.each (function(d) { list.push (d.fieldType); } );
                DWCAHelper.setAllFields (cboxListParentSelection, false, list, isId, metaDataFunc(), selOptions);
                DWCAHelper.setAllFields (cboxListParentSelection, setVal, [d.fieldType], isId, metaDataFunc(), selOptions);
                changeThisObjFunc(d);
        });
    };


    // make progress bar areas
    // if divid is not found, make a div with that id and attach it to the parentD3elem
    // then, for all cases, set the class and add the child p element if required
    // not using jquery-ui progressbar because indeterminate progress bars don't allow text updates easily
    this.makeProgressBar = function (parentD3Elem, divid, divClass) {
        var makeDiv = d3.select("#"+divid);
        if (makeDiv.empty() && parentD3Elem) {
            parentD3Elem.append("div").attr ("id", divid);
        }

        makeDiv = d3.select("#"+divid);

        if (!makeDiv.empty()) {
            makeDiv.attr("class", divClass);

            if (makeDiv.select("p").empty()) {
                makeDiv.append("p");
            }
        }

        return makeDiv;
    };


    this.addDragArea = function (parentD3Elem) {
        if (parentD3Elem) {
            var id = parentD3Elem.attr("id");
            parentD3Elem.append("div").attr("class", "dragHandle").attr("id", id+"dragger");
        }
    };


    this.divDisplay = function (divArray, displayStatus) {
        for (var n = 0; n < divArray.length; n++) {
            d3.select(divArray[n]).style("display", displayStatus);
        }
    };


    this.twiceUpRemove = function (divid) {
        var node = d3.select(divid).node();
        var containerNode = node.parentElement;
        //VESPER.log ("CONTAINER", containerNode, $(containerNode));
        $(function() {
            $(containerNode).draggable("destroy");
        });
        containerNode.parentElement.removeChild (containerNode);
    };

    this.recurseClearEvents = function (sel) {
        sel
            .on ("mouseout", null)
            .on ("mouseover", null)
            .on ("mousedown", null)
            .on ("mouseup", null)
            .on ("click", null)
            .on ("contextmenu", null)
        ;

        //VESPER.log ("REC SEL", sel);

        sel.each (function() {
           var obj = d3.select(this);
           var childrenSel = obj.selectAll("*");
           if (!childrenSel.empty()) {
                DWCAHelper.recurseClearEvents (childrenSel);
           }
        });
    };

    return DWCAHelper;
}();
VESPER.DWCAMapLeaflet = function (divid) {

	var dims;
    var self = this;
	var dividsub = divid.substring(1);
	
	//var exitDur = 400, updateDur = 1000, enterDur = 400;
	
	var keyField, longField, latField;
    var model;

	var dwcaid2Marker = {};

    var curSelLayer;
    var curSelMaskLayer;
    var markerGroup;
    var maskGroup;
    var map;

    var maxIconHeight = 60;
    var heightMultiplier = 5;

    var selIcon = L.icon({
        iconUrl: VESPER.imgbase+'selMarker.png',
        shadowUrl: '../lib/leafletjs/images/marker-shadow.png',

        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],

        shadowAnchor: [4, 62] // the same for the shadow
    });

    var oldIcon = new L.Icon.Default();

    var dFormat = d3.format(".6r");

    // what a markercluster does when the mouse is over it
    var clusterMouseOverListener = function (a) {
        var sCount = a.layer.getSelectedChildCount();
        // careful with lng, as i18text interprets var with that name as changing translation language!
        VESPER.tooltip.updateText ($.t("map.tooltipHeader", {count: a.layer.getChildCount()}),
            (sCount > 0 ? $.t("map.tooltipSel", {count: sCount}) : "")
            + $.t("map.tooltipLatLong", {lat: dFormat(a.latlng.lat), llong: dFormat(a.latlng.lng)})
        );
        VESPER.tooltip.updatePosition (a.originalEvent);
    };

    // what a markercluster does when right clicked
    var clusterSelectionListener = function (a) {
        var theseMarkers = [];
        var sel = [];
        a.layer.getAllChildMarkers (theseMarkers);
        if (theseMarkers.length > 0) {
            for (var n = 0; n < theseMarkers.length; n++) {
                sel.push (theseMarkers[n].extId);
            }
            model.getSelectionModel().clear();
            model.getSelectionModel().addAllToMap (sel);
        }
    };

    var markerMouseOverListener = function (e) {
        var eid = e.target.extId;
        var node = model.getNodeFromID (eid);
        VESPER.tooltip.updateText (model.getLabel (node),
            e.latlng+(model.getSelectionModel().contains (eid) ? $.t("map.tooltipIndSel") : "")
            + $.t("map.tooltipLatLong", {lat: dFormat(e.latlng.lat), llong: dFormat(e.latlng.lng)})
        );
        VESPER.tooltip.updatePosition (e.originalEvent);
    };

    var markerSelectionListener = function (e) {
        model.getSelectionModel().clear();
        model.getSelectionModel().addToMap (e.target.extId);
    };

    // What the map does when a shape is drawn on it
    var drawListener = function (e) {
        var type = e.layerType,
            layer = e.layer;
        var sel = [];

        if (type === 'circle') {
            VESPER.log ("circle", e);
            var cll = e.layer._latlng;
            var rad = e.layer._mRadius;
            markerGroup.eachLayer(function (layer) {
                var ll = layer.getLatLng();
                if (cll.distanceTo (ll) <= rad) {
                    sel.push(layer.extId);
                    //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within circle");
                }
            });
        }
        else if (type === 'rectangle') {
            VESPER.log ("rectangle", e);
            var clls = e.layer._latlngs;
            var bounds = new L.LatLngBounds (clls[0], clls[2]);
            markerGroup.eachLayer(function (layer) {
                var ll = layer.getLatLng();
                if (bounds.contains (ll)) {
                    sel.push(layer.extId);
                    //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within rectangle");
                }
            });
        }
        else if (type === 'polygon') {
            VESPER.log ("polygon", e);
            var clls = e.layer._latlngs;
            var bb = new L.LatLngBounds (clls);
            markerGroup.eachLayer(function (layer) {
                var ll = layer.getLatLng();
                if (containsLatLng (clls, bb, ll)) {
                    sel.push(layer.extId);
                    //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within polygon");
                }
            });
        }

        //if (curSelLayer) {
        //    map.removeLayer (curSelLayer);
        //}

        VESPER.log (sel.length, "specimens within", type);

        // Do whatever else you need to. (save to db, add to map etc)
        //map.addLayer(layer);
        curSelLayer = layer;

        model.getSelectionModel().clear();
        model.getSelectionModel().addAllToMap (sel);
    };


    this.set = function (fields, mmodel) {
        var ffields = mmodel.makeIndices ([fields.identifyingField, fields.longitude, fields.latitude]);
        keyField = ffields[0];
        longField = ffields[1];
        latField = ffields[2];
        dims = MGNapier.NapVisLib.getDivDims (divid);
        model = mmodel;
        VESPER.log ("set model for map", model);
    };
	
	
	this.go = function () {

        if (!map) {
            // create the tile layer with correct attribution
            var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib='Map data � OpenStreetMap contributors';
            var osm = new L.TileLayer(osmUrl, {minZoom: 1, maxZoom: 19, attribution: osmAttrib});

            d3.select(divid).style("overflow", "hidden"); // gets rid of scrollbars when the map tiles go over the edges of the display
            map = L.map(dividsub);//.setView([51.505, -0.09], 13); // set view dependent on markers now, drawControl is for draw toolbar
            map.addLayer (osm);

            // Adds leaflet.draw functionality
            var drawControl = new L.Control.Draw({
                draw: {
                    marker: false,
                    polyline: false
                }
            });
            map.addControl (drawControl);

            map.on('draw:created', drawListener);

            markerGroup = new L.MarkerClusterGroup ({
                iconCreateFunction: function(cluster) {
                    var clog = Math.log (cluster.getChildCount() + 1);
                    var height = 10 + (clog * heightMultiplier);
                    var selHeight = (height * Math.log (cluster.getSelectedChildCount() + 1)) / clog;
                    var unselHeight = height - selHeight;
                    // really small heights due to rounding errors emerge as numbers in scientific notation.
                    // this made them big in the style sheet as they took the mantissa (ooh) as the number so we squash them here.
                    if (unselHeight < 0.5 && (cluster.getChildCount() === cluster.getSelectedChildCount ())) {
                        unselHeight = 0;
                    }

                    return new L.DivIcon({ html: '<div class="unselected" style="height:'+unselHeight+'px;">' + cluster.getChildCount() + '</div>'
                            +'<div class="selected" style="height:'+selHeight+'px">' + cluster.getSelectedChildCount()+ '</div>',
                        className: 'vesperMapIcon',
                        iconSize: new L.Point(40, height)
                    });
                }
            });

            markerGroup.on('clustermouseover', clusterMouseOverListener);
            markerGroup.on('clustercontextmenu', clusterSelectionListener);
        }

        var latlngs = [];
		var markers = [];

		var struc = model.getData();
		if (latField && longField) {
             var arr = [], arr2 = [];
			 for (var prop in struc) {
				 if (struc.hasOwnProperty (prop)) {
                     //var lat = +model.getIndexedDataPoint (struc[prop], latField);
                     //var longi = +model.getIndexedDataPoint (struc[prop], longField);

                     arr.length = 0;
                     arr2.length = 0;
                     model.getIndexedDataPoints (struc[prop], latField, arr);
                     model.getIndexedDataPoints (struc[prop], longField, arr2);

                     for (var d = arr.length; --d >= 0;) {
                         var lat = +arr[d];
                         var longi = +arr2[d];
                         if (!isNaN(lat) && !isNaN(longi)) {
                             var coord= [lat, longi];
                             var marker = L.marker(coord)
                                     .on ('mouseover', markerMouseOverListener)
                                     .on ('contextmenu', markerSelectionListener)
                                 ;
                             marker.extId = prop;

                             markers.push (marker);
                             latlngs.push (coord);
                             if (dwcaid2Marker[prop]) {
                                 var val = dwcaid2Marker[prop];
                                 // if stored object is marker make an array from it to add second marker to
                                 if (val.extId) {
                                     var darr = [val];
                                     dwcaid2Marker[prop] = darr;
                                     val = darr;
                                 }
                                 val.push (marker);
                             } else {
                                dwcaid2Marker[prop] = marker;
                             }
                         }
                     }
				 }
			 } 
			 markerGroup.addLayers (markers);
		}

		map.addLayer (markerGroup);
		map.fitBounds ((new L.LatLngBounds (latlngs)).pad(1.05));


        // mask layers
        var maskLayer = L.TileLayer.maskCanvas({opacity: 0.6,
            radius: 5,  // radius in pixels or in meters (see useAbsoluteRadius)
            useAbsoluteRadius: false,  // true: r in meters, false: r in pixels
            color: '#aaf',  // the color of the layer
            noMask: true
        });
        maskLayer.setData (latlngs);

        curSelMaskLayer = L.TileLayer.maskCanvas({opacity: 0.8,
            radius: 5,  // radius in pixels or in meters (see useAbsoluteRadius)
            useAbsoluteRadius: false,  // true: r in meters, false: r in pixels
            color: '#f00',  // the color of the layer
            noMask: true
        });
        curSelMaskLayer.setData ([]);


        maskGroup = L.layerGroup ([maskLayer, curSelMaskLayer]);
        //map.addLayer (maskLayer);
        //map.addLayer (curSelMaskLayer);
		
		L.control.layers ({},{"Marker Group":markerGroup, "Direct Plot":maskGroup}).addTo(map);
		L.control.scale().addTo (map);

		VESPER.log ("group ", markerGroup);
		VESPER.log ("map ", map);

        recalcHeightMultiplier();
    };


    function recalcHeightMultiplier () {
        var cc = markerGroup._topClusterLevel.getChildCount();
        var allHeight = Math.log (cc + 1);
        heightMultiplier = maxIconHeight / allHeight;
    }


	this.update = function () {
        var vals = model.getSelectionModel().values();

        //VESPER.log ("MGROUP COUNT: ", markerGroup._topClusterLevel.getChildCount());

		//if (map.hasLayer (markerGroup)) {
        if (markerGroup) {
            recalcHeightMultiplier ();

            markerGroup.eachLayer (function(layer) {
                var sel = model.getSelectionModel().contains(layer.extId);
                //if (layer.options.icon != )
                layer.setIcon (sel ? selIcon : oldIcon);
            });

            //VESPER.log ("vals", vals);

            var lls = [];
            var lastLayer;
            for (var n = 0; n < vals.length; n++) {
                var layer = dwcaid2Marker[vals[n]];
                if (layer) {
                    if (layer.extId) {
                        lls.push (layer.getLatLng());
                        lastLayer = layer;
                    }
                    else {
                        for (var m = layer.length; --m >= 0;) {
                            var llayer = layer[m];
                            lls.push (llayer.getLatLng());
                            lastLayer = llayer;
                        }
                    }
                }
            }

            markerGroup.setAllSelectedChildCounts (model.getSelectionModel());

            if (lls.length === 1) {
                markerGroup.zoomToShowLayer (lastLayer, function () { lastLayer.openPopup(); });
            }
            else if (lls.length > 1) {
                var bb = new L.LatLngBounds (lls);
                map.fitBounds(bb);
            }

            curSelMaskLayer.setData (lls);
		}
	};

    this.destroy = function () {
        //DWCAHelper.recurseClearEvents (d3.select(divid));
        map.addLayer (markerGroup); // add it so it gets removed properly. Makes sense to me. And Google Chrome profiler.
        map.addLayer (maskGroup);

        model.removeView (self);
        model = null;

        markerGroup.removeEventListener();
        markerGroup.eachLayer (function(layer) {
            layer.removeEventListener();
        });
        markerGroup.clearLayers();

        maskGroup.eachLayer (function(layer) {
            layer.removeEventListener();
            layer.setData ([]);
        });
        maskGroup.clearLayers();
       // curSelMaskLayer.setData ([]);

        var lys = [];
        map.eachLayer (function(layer) {
            lys.push(layer);
        });
        map.removeEventListener();
        for (var n = 0; n < lys.length; n++) {
            map.removeLayer (lys[n]);
        }
        map.remove();

        dwcaid2Marker = {};
        VESPER.DWCAHelper.twiceUpRemove(divid);
    };


    this.updateVals = this.update;

    // polyLL - array of polygon lat longs
    // bb - bounding box of those polygon lat longs
    // ll - the lat long we wish to see is inside the polygon or not
    function containsLatLng (polyLL, bb, ll) {
        var inside = false, p1, p2, i, len;

        if (!bb.contains (ll)) {
            return false;
        }

        // ray casting algorithm for detecting if point is in polygon
        for (i = 0, len = polyLL.length; i < len; i++) {
            p1 = polyLL[i];
            p2 = polyLL[(i - 1 + len) % len];

            if (((p1.lat > ll.lat) !== (p2.lat > ll.lat)) &&
                (ll.lng < (p2.lng - p1.lng) * (ll.lat - p1.lat) / (p2.lat - p1.lat) + p1.lng)) {
                inside = !inside;
            }
        }

        return inside;
    }


    // extend Leaflet MarkerClusterGroup classes to count selected marker totals at each cluster, mjg

    // Extend MarkerClusterGroup
    // mjg
    L.MarkerClusterGroup.include( {
            //mjg
            setAllSelectedChildCounts: function (selectionModel) {
                return this._topClusterLevel.setAllSelectedChildCounts (selectionModel);
            }
        }
    );

    // Extend MarkerCluster
    //mjg
    L.MarkerCluster.include( {
            _selChildCount: 0, // mjg

            // mjg
            setAllSelectedChildCounts: function (selectionModel) {
                var curCount = 0;

                for (var j = this._markers.length - 1; j >= 0; j--) {
                    if (selectionModel.contains (this._markers[j].extId)) {
                        curCount++;
                    }
                }

                for (var i = this._childClusters.length - 1; i >= 0; i--) {
                    curCount += this._childClusters[i].setAllSelectedChildCounts (selectionModel);
                }

                this._selChildCount = curCount;
                this._updateIcon ();    // seem to need to poke icon to recalc html, doesn't do it dynamically

                return curCount;
            },

            //mjg
            getSelectedChildCount: function () {
                return this._selChildCount;
            }
        }
    );
};
		
VESPER.DWCAParser = new function () {

    this.TDATA = 0;     // taxa data, essentially the selected data from the core data file in the DWCA for each record/taxon
    this.TAXA = 1;      // taxa, i.e. in a taxonomy, the children of the current taxon
    this.EXT = 2;       // extra data, i.e. non-core data attachments
    this.SYN = 3;       // synonyms
    this.PID = 4;       // used when building explicit taxonomies, i.e. ones from name paths, quick ref to parent id;
    this.COUNTS = 5;
    this.SPECS = "s";

    this.TCOUNT = 0;
    this.SPECCOUNT = 1;
    this.SYNCOUNT = 2;
    this.SELOFFSET = 3;

    this.SUPERROOT = "superroot";
    var superrootID = "-1000";

    console.log ("This", this);

	// terms from old darwin core archive format superseded by newer ones
    // http://rs.tdwg.org/dwc/terms/history/index.htm
	var altTerms = {"class":"classs",   // done to avoid clashing with reserved class keyword in java. I don't think there is one in javascript though.
			"DarwinCore":"Occurrence",
			"SimpleDarwinCore":"Occurrence",
			"catalogNumberNumeric":"catalogNumber",
			"collectorNumber":"recordNumber",
			"collector":"recordedBy",
			"nativeness":"establishmentMeans",
			"latestDateCollected":"eventDate",
			"earliestDateCollected":"eventDate",
			"state":"stateProvince",
			"province":"stateProvince",
			"city":"municipality",
			"depth":"verbatimDepth",
			"elevation":"verbatimElevation",
			"latitude":"decimalLatitude",
			"longitude":"decimalLongitude",
			"datum":"geodeticDatum",
			"nameUsageID":"taxonID",
			"nameID":"scientificNameID",
			"acceptedTaxonID":"acceptedNameUsageID",
			"parentTaxonID":"parentNameUsageID",
			"higherTaxonID":"parentNameUsageID",
			"higherNameUsageID":"parentNameUsageID",
			"originalNameID":"originalNameUsageID",
			"originalTaxonID":"originalNameUsageID",
			"basionymID":"originalNameUsageID",
			"taxonAccordingToID":"nameAccordingToID",
			"acceptedTaxon":"acceptedNameUsage",
			"parentTaxon":"parentNameUsage",
			"higherTaxon":"parentNameUsage",
			"higherNameUsage":"parentNameUsage",
			"originalName":"originalNameUsage",
			"originalTaxon":"originalNameUsage",
			"basionym":"originalNameUsage",
			"taxonAccordingTo":"nameAccordingTo",
			"rank":"taxonRank",
            "scientificNameRank":"taxonRank",
			"taxonRemark":"taxonRemarks",
            "EventAttributeType":"measurementType",
            "eventMeasurementType":"measurementType",
            "SamplingAttributeType":"measurementType"
	};


    // terms which tend to be textual descriptions and as such aren't that amenable to the visualisations we
    // wish to do but do gobble up a lot of memory.
    this.flabbyLists = {};
    this.flabbyLists.wordyList = ["eventRemarks", "taxonRemarks", "georeferenceRemarks", "identificationRemarks"
                        ,"locationRemarks", "measurementRemarks", "occurrenceRemarks", "relationshipRemarks"
                        ,"verbatimCoordinates", "bibliographicCitation", "description"
    ];

    // list of terms that are necessary to do the basics of particular visualisations.
    // e.g. we need latitude and longitude values to do map plots
    // It's a given that we need the id for each entry.
    this.explicitRanks = ["kingdom", "phylum", "classs", "order", "family", "genus", "subgenus", "specificEpithet", "infraspecificEpithet"];
    this.neccLists = {};
    this.neccLists.geo = ["decimalLatitude", "decimalLongitude", "geodeticDatum"];
    this.neccLists.impTaxonomy = ["acceptedNameUsageID", "parentNameUsageID", "taxonRank"];
    this.neccLists.expTaxonomy = this.explicitRanks;
    this.neccLists.times = ["eventDate", "modified", "geodeticDatum", "georeferencedDate", "dateIdentified", "verbatimEventDate"];
    this.neccLists.basicTimes = ["eventDate"];

    // list of terms that convey a label for a taxon/specimen
    this.labelChoiceData = ["acceptedNameUsage", "scientificName", "originalNameUsage", "vernacularName"];



    // terms for which values are commonly repeated, often from a very small set of possible values.
    // utilising this we can save memory by pointing to a map of values for these fields rather than storing
    // a separate value for each entry.
    // Most are recognised as being suitable for controlled vocabularies by DWCA - http://rs.tdwg.org/dwc/terms/history/index.htm
    this.controlledVocabFields = ["continent", "country", "countryCode", "stateProvince", "county", "island", "islandGroup", "waterBody", "higherGeographyID",
                            "geodeticDatum", "georeferenceVerificationStatus", "verbatimCoordinateSystem", "verbatimSRS",
                            "taxonomicStatus", "language", "nomenclaturalCode", "nomenclaturalStatus", "identificationVerificationStatus",
                            "rightsHolder",
                            "type", "audience", "format",
                            "taxonRank", "verbatimTaxonRank",
                            "basisOfRecord", "dcterms:type", "dcterms:language",
                            "measurementUnit", "behavior",
                            "relationshipOfResource", "establishmentMeans", "occurrenceStatus", "disposition",
                            "sex", "lifeStage", "reproductiveCondition", "isPlural",
                            "threatStatus",
                            "isMarine", "isFreshwater", "isTerrestrial", "isInvasive", "isHybrid", "isExtinct",
                            "typeDesignationType"
    ];
    this.archiveLimitedFields = ["institutionID", "collectionID", "datasetID", "institutionCode", "collectionCode", "datasetName", "ownerInstitutionCode",
                                "year", "month", "day",
                                "source",
                                "nameAccordingToID", "isPreferredName", "typeStatus", "verbatimTaxonRank",
                                "superkingdom", "kingdom", "superphylum", "phylum", "subphylum", "superclass", "classs", "order", "family"
    ];


    this.controlledVocabSet = {};
    for (var i = 0; i < this.controlledVocabFields.length; i++) { this.controlledVocabSet[this.controlledVocabFields[i]] = true; }

    this.discreteTermList = this.controlledVocabFields.concat(this.archiveLimitedFields);
    this.discreteTermSet = {};
    for (var i = 0; i < this.discreteTermList.length; i++) { this.discreteTermSet[this.discreteTermList[i]] = true; }


    // sets of terms for which values can be shared, again opening them up to memory saving through a map.
    // When terms holds the same index in the object below, it indicates a shared value map could be common to those terms.
    // The most common example is parent and acceptedName ids, all parent name ids must turn up as name ids in another record (unless it's a root)
    // and parent name ids are often repeated anyways. It also works for the base taxonids which are often just copies of name ids.
    this.sharedValuesTerms = {"taxonID":1, "acceptedNameUsageID":1, "parentNameUsageID":1, "originalNameUsageID":1};


    // Translates URIs into simple labels for interface
    // If no label found will use URI in full
    this.recordURIMap = {
        "http://rs.tdwg.org/dwc/xsd/simpledarwincore/SimpleDarwinRecord": "Simple Darwin Record",
        "http://rs.tdwg.org/dwc/terms/Occurrence" : "Occurrence",
        "http://rs.tdwg.org/dwc/terms/Event" : "Event",
        "http://purl.org/dc/terms/Location" : "Location",
        "http://purl.org/dc/terms/GeologicalContext" : "GeologicalContext",
        "http://rs.tdwg.org/dwc/terms/Identification" : "Identification",
        "http://rs.tdwg.org/dwc/terms/Taxon" : "Taxon",
        "http://rs.tdwg.org/dwc/terms/ResourceRelationship" : "ResourceRelationship",
        "http://rs.tdwg.org/dwc/terms/MeasurementOrFact" : "MeasurementOrFact",
        "http://rs.gbif.org/terms/1.0/Distribution" : "Distribution",
        "http://rs.gbif.org/terms/1.0/VernacularName" : "VernacularName",
        "http://rs.gbif.org/terms/1.0/SpeciesProfile" : "SpeciesProfile",
        "http://rs.gbif.org/terms/1.0/TypesAndSpecimen" : "TypesAndSpecimen",
        "http://rs.gbif.org/terms/1.0/Reference" : "Reference",
        "http://rs.gbif.org/terms/1.0/Image" : "Image",
        "http://rs.gbif.org/terms/1.0/Identifier" : "Identifier",
        "http://rs.gbif.org/terms/1.0/Description" : "Description",
        "http://rs.nordgen.org/dwc/germplasm/0.1/terms/GermplasmSample" : "GermplasmSample",
        "http://purl.org/germplasm/germplasmTerm#GermplasmAccession" : "GermplasmAccession",
        "http://purl.org/germplasm/germplasmTerm#MeasurementExperiment" : "MeasurementExperiment",
        "http://purl.org/germplasm/germplasmTerm#MeasurementMethod" : "MeasurementMethod",
        "http://eol.org/schema/reference/Reference" : "EOL Reference",
        "http://eol.org/schema/media/Document" : "EOL Document",
        "http://eol.org/schema/agent/Agent" : "EOL Agent",
        "http://www.w3.org/ns/oa#Annotationt" : "W3 Annotation"
    };


    this.rowTypeDefaults = {};
    this.fieldAttrNames = {};
    this.xsd = null;

    this.loadxsd = function (xsdFile) {
        $.get(xsdFile, function(d){
            // stupid firefox reads in a BOM mark (probably stupid me somewhere else, but I ain't got time)
            //if (d.charCodeAt(0) > 65000 || d.charCodeAt(0) === 255) {
            //    d = d.slice(2);
            //}
            VESPER.log ("XSD", d, typeof d);
            VESPER.DWCAParser.xsd = (typeof d == "string" ? $(MGNapier.NapVisLib.parseXML(d)) : $(d));
            VESPER.DWCAParser.makeRowTypeDefaults (VESPER.DWCAParser.xsd);
            VESPER.DWCAParser.makeFieldAttrNames (VESPER.DWCAParser.xsd);
        });
    };


    this.accessZip = function (text, metaFileName) {
        var zip = new JSZip(text, {base64:false, noInflate:true});
        zip.dwcaFolder = "";
        var newMetaFileName;

        // look for metaFileName in zip entries. May be appended to a folder name.
        for (var n = 0; n < zip.zipEntries.files.length; n++) {
            var fname = zip.zipEntries.files[n].fileName;
            var subStrI = fname.indexOf(metaFileName);
            if (subStrI >= 0) {
                newMetaFileName = fname;
                zip.dwcaFolder = newMetaFileName.slice (0, subStrI);
                break;
            }
        }

        VESPER.log ("ZIP ENTRIES", zip.zipEntries, newMetaFileName);
        if (newMetaFileName !== undefined) {
            zip.zipEntries.readLocalFile (newMetaFileName);
            VESPER.log ("unzipped ", zip, zip.files);
            var metaFile = zip.zipEntries.getLocalFile (newMetaFileName);
            var metaData = VESPER.DWCAParser.parseMeta ($.parseXML (metaFile.uncompressedFileData));
            return {jszip: zip, meta: metaData};
        }
        return {jszip: zip, meta: {error:$.t("parser.zipError", {"file":metaFileName})}};
    };



    function afterFilterReadZipEntries (zip, mdata, selectedStuff) {
        // Aid GC by removing links to data from outside DWCAParse i.e. in the zip entries
        $.each (selectedStuff, function (key) {
            var fileData = mdata.fileData[key];
            var fileName = zip.dwcaFolder + fileData.fileName;
            zip.zipEntries.getLocalFile(fileName).uncompressedFileData = null; // Remove link from zip
        });

        if (VESPER.alerts) { alert ("mem monitor point 1"); }
    }


    // Read in csv files that are zip entries. Use selectedStuff and readField to pick out
    // which columns to snatch out the zip parsing routines.
    this.filterReadZipEntriesToMakeModel = function (zip, mdata, doneCallback) {
        var selectedStuff = VESPER.DWCAHelper.getAllSelectedFilesAndFields (mdata);
        var fileRows = {};
        //VESPER.log ("ZIP:", zip);

        // read selected data from zip
        var entries = d3.entries (selectedStuff);

        var i = 0;

        //for (; i < entries.length; i++) {
        function loadZipPart (streamFunc) {
            var key = entries[i].key;
            var value = entries[i].value;
            var fileData = mdata.fileData[key];
            var fileName = zip.dwcaFolder + fileData.fileName;
            var readFields = MGNapier.NapVisLib.newFilledArray (fileData.invFieldIndex.length, false);

            $.each (value, function (key, value) {
                readFields [fileData.fieldIndex[key]] = value;
            });

            //VESPER.log ("readFields", readFields);
            VESPER.DWCAZipParse.set (fileData, readFields);
            streamFunc.callbackQ = [];
            streamFunc.fileName = fileName;
            //var ii = i; // copy i otherwise it might(will) change before we run onLoad; Not needed now i is incremented in the callback itself

            var onLoad = function () {
                fileRows[fileData.rowType] = zip.zipEntries.getLocalFile(fileName).uncompressedFileData;
                VESPER.DWCAParser.updateFilteredLists (fileData, readFields);
                // final file dealt with
                if (i === entries.length - 1) {
                    afterFilterReadZipEntries (zip, mdata, selectedStuff);
                    // make taxonomy (or list)
                    doneCallback (new VESPER.DWCAModel (mdata, VESPER.DWCAParser.setupStrucFromRows (fileRows, mdata)));
                }

                streamFunc.callbackQ.length = 0;
                streamFunc.fileName = undefined;

                i++;
                if (i < entries.length) {
                    loadZipPart (streamFunc);
                }
            };
            streamFunc.callbackQ.push (onLoad);
            zip.zipEntries.readLocalFile (fileName, streamFunc);

            //fileRows[fileData.rowType] = zip.zipEntries.getLocalFile(fileName).uncompressedFileData;
            //VESPER.DWCAParser.updateFilteredLists (fileData, readFields);
        }

        loadZipPart (VESPER.DWCAZipParse.zipStreamSVParser2);

        //afterFilterReadZipEntries (zip, mdata, selectedStuff, doneCallback);
    };



    $.fn.filterNode = function(name) {
        return this.find('*').filter(function() {
            //VESPER.log (this);
            return this.nodeName ? (this.nodeName.toUpperCase() === name.toUpperCase()) : false;
        });
    };


    // Get attribute defaults from dwca.xsd file
    this.makeRowTypeDefaults = function (xsdFile) {
        var wat = xsdFile.find('xs\\:attributeGroup[name="fileAttributes"], attributeGroup[name="fileAttributes"]');
        var ffrag = $(wat);

        $(ffrag[0]).find('xs\\:attribute, attribute').each(function() {
            var xmlthis= $(this);
            var val = xmlthis.attr('default');
            var type = xmlthis.attr ('type');
            if (type == "xs:integer") {
                val = +val;
            }
            VESPER.DWCAParser.rowTypeDefaults[xmlthis.attr('name')] = val;
        });

        VESPER.log ("Row Type Defaults", VESPER.DWCAParser.rowTypeDefaults);
    };


    this.makeFieldAttrNames = function (xsdFile) {
        var wat = xsdFile.find('xs\\:complexType[name="fieldType"], complexType[name="fieldType"]');
        var ffrag = $(wat);
        //VESPER.log ("WAT", wat);

        $(ffrag[0]).find('xs\\:attribute, attribute').each(function() {
            var xmlthis= $(this);
            var name = xmlthis.attr ('name');
            var type = xmlthis.attr ('type');
            VESPER.DWCAParser.fieldAttrNames[name] = type;
        });

        VESPER.log ("Field Attribute Names", VESPER.DWCAParser.fieldAttrNames);
    };

	
	function getCurrentTerm (term) {
		var newTerm = altTerms [term];
		return (newTerm === undefined ? term : newTerm);
	}


	this.occArray2JSONArray = function (tsvData, idx) {
		var jsonObj = {};
        if (VESPER.alerts) { alert ("mem monitor point 1.4"); }

		for (var n = 0, len = tsvData.length; n < len; n++) {
			var rec = tsvData[n];
            if (rec) {
                var id = rec[idx];
                jsonObj[id] = {};
                jsonObj[id][this.TDATA] = rec;
            }
		}
		
		return jsonObj;
	};


    function addToArrayProp (obj, pname, addObj) {
        if (!obj[pname]) {
            obj[pname] = [];
        }
        obj[pname].push (addObj);
    }

	// This uses implicit id linking in the dwca file i.e. acceptedNameUsageID to parentNameUsageID
	this.jsonTaxaObj2JSONTree = function (jsonObj, tsvData, fileData, metaData) {
        var fieldIndexer = fileData.filteredFieldIndex;
        var idx = fileData.idIndex;
		//var jsonObj = this.occArray2JSONArray (tsvData, idx);

        if (VESPER.alerts) { alert ("mem monitor point 1.5"); }
		var hidx = fieldIndexer["parentNameUsageID"];
		var aidx = fieldIndexer["acceptedNameUsageID"];

        // First pass. Add nodes with child ids to nodes with parent ids
		for (var n = 0, len = tsvData.length; n < len; n++) {
			var rec = tsvData[n];
            if (rec) {
                var id = rec[idx];
                var pid = rec[hidx];
                var pRec = jsonObj[pid];

                if (pid !== id && pRec) {	// no self-ref loops and parent must exist
                    // Make child taxa lists
                    addToArrayProp (pRec, VESPER.DWCAParser.TAXA, jsonObj[id]);
                }
            }
		}

        // Second pass. Get synonyms and attach them and any existing children to the proper name node.
        for (var n = 0, len = tsvData.length; n < len; n++) {
            var rec = tsvData[n];
            if (rec) {
                var id = rec[idx];
                var pid = rec[hidx];
                var pRec = jsonObj[pid];

                if (pRec == undefined) {
                    // Make synonym lists
                    var aid = rec[aidx];
                    if (aid && id !== aid) {
                        var aRec = jsonObj[aid];
                        if (aRec) {
                            var sRec = jsonObj[id];
                            addToArrayProp (aRec, VESPER.DWCAParser.SYN, sRec);
                            var sChildren = sRec[VESPER.DWCAParser.TAXA];

                            if (sChildren) {
                                //VESPER.log ("ADDING SYNS CHILDREN", sRec, sChildren, sChildren.length);

                                for (var m = 0; m < sChildren.length; m++) {
                                    var scObj = sChildren[m];
                                    var scRec = scObj[VESPER.DWCAParser.TDATA];
                                    var scid = scRec[idx];
                                    var scaid = scRec[aidx];
                                    if ((scid === scaid) && (scaid !== undefined)) {
                                        addToArrayProp (aRec, VESPER.DWCAParser.TAXA, scObj);
                                    }
                                }
                                sRec[VESPER.DWCAParser.TAXA].length = 0;
                                //sChildren.length = 0;
                            }

                            //delete jsonObj[id];
                        }
                        else {
                            VESPER.log ($.t("parser.deadonymError", {aid: aid, rec: rec}));
                        }
                    }
                }
            }
        }
		
		var roots = this.findRoots (jsonObj, idx, fieldIndexer);
		this.createSuperroot (jsonObj, roots, fileData, metaData, fieldIndexer);
		VESPER.log ("roots", roots);
	
		VESPER.log ("JSON", jsonObj[1], jsonObj);
		return jsonObj; // basically the record set here is the tree (taxonomy)
	};

    function isSynonym (id, aid) {
       return (id !== aid && aid !== undefined);
    }


    // This uses explicit id linking in the dwca file i.e. kingdom, order, family, specificEpithet etc data
    // Make a taxonomy from the explicitly declared ranks
    this.jsonTaxaObj2ExplicitJSONTree = function (jsonObj, tsvData, fileData, metaData, addOriginalTo) {
        addFieldToIndices (fileData, "taxonRank");

        var idx = fileData.idIndex;
        var fieldIndexer = fileData.filteredFieldIndex;
        //var jsonObj = this.occArray2JSONArray (tsvData, idx);

        if (VESPER.alerts) { alert ("mem monitor point 1.5a ex"); }
        VESPER.log ("SPECS", VESPER.DWCAParser.SPECS);
        var rankList = VESPER.DWCAParser.explicitRanks;
        VESPER.log ("Vesper adds", metaData.vesperAdds);
        var nameField = fieldIndexer[metaData.vesperAdds.nameLabelField.fieldType];
        var rootObjs = {};
        var rLen = rankList.length;

        //var data = jsonObj;

        // I am separating the jsonObj from the tree organising structure here, as mixing integer and string property names
        // causes massive slowdown in webkit broswers (chrome 29 and opera 15 currently).
        // http://stackoverflow.com/questions/18895840/webkit-javascript-object-property-iteration-degrades-horribly-when-mixing-intege
        var treeObj = {};
        //treeObj = jsonObj; // revert

        // some ranks are partial names (below genus). And we need to make them more specific or there are clashes.
        var addLastNameTo = [], rankFields = [];
        for (var r = 0; r < rLen; r++) {
            var rank = rankList[r];
            if (rank === "specificEpithet" || rank === "infraspecificEpithet") {
                addLastNameTo[r] = true;
            }
            // speed up rank index finding
            rankFields[r] = fieldIndexer[rank];
        }


        for (var n = 0, len = tsvData.length; n < len; n++) {
            var rec = tsvData[n];

            if (rec) {
                var trace = false;
                /*
                if (rec[0] === "22792") {
                    VESPER.log ("REC", rec);
                    trace = true;
                }
                */
                var lastData = undefined;
                var lastId = undefined;
                var path = [];

                for (var r = 0; r < rLen; r++) {
                    var rank = rankList[r];
                    var rankField = rankFields[r];

                    if (rankField) {
                        var val = rec[rankField];
                        path[r] = val;

                        if (val) {
                            // if specificEpithet or infraSpecificEpithet, beef up name with previous strings from genus or species
                            if (addLastNameTo[r] && lastData) {
                                val = lastData[this.TDATA][nameField]+" "+val;
                            }

                            var id = val;   // id is normally the name unless there's a name clash

                            // test if this name has already been attached to something that wasn't the last rank used here
                            // this indicates the same name being used at different points in the taxonomy, i.e. two genus's called "Carex" under different families
                            // it's perfectly valid, but it knackers a simple id scheme
                            if (treeObj[id] && lastData) {
                                var lid = lastData[this.TDATA][idx];
                                var pid = treeObj[id][this.PID];
                                if (lid !== pid) {
                                    // aargh. name clash.
                                    id = lid+id;
                                    if (!treeObj[id]) {
                                        VESPER.log ("Introducing new id", id);
                                    }
                                }
                            }


                            if (!treeObj[id]) {
                                var rdata = [];
                                rdata[idx] = id;
                                rdata[nameField] = val;
                                rdata[fieldIndexer["taxonRank"]] = rank;
                                var obj = {};
                                obj[this.TDATA] = rdata;
                                treeObj[id] = obj;

                                if (lastData) {
                                    addToArrayProp (lastData, VESPER.DWCAParser.TAXA, obj);
                                }

                                // add parent id property used in resolving name clashes
                                obj[this.PID] = (lastData ? lastData[this.TDATA][idx] : -10);
                            }

                            if (!lastData) {
                                rootObjs[id] = true;
                            }
                            if (trace) {
                                VESPER.log ("trace", id, val, rankField, treeObj[id]);
                            }
                            lastData = treeObj[id];
                            lastId = id;
                        }
                    }
                }

                if (lastData) {
                    if (trace) {
                        console.log ("adding original", jsonObj[rec[idx]], rec[nameField]);
                    }
                    addOriginalTo (lastData, jsonObj[rec[idx]], treeObj, lastId /*rec[nameField]*/, idx, fieldIndexer, nameField);
                }
            }
        }

        var roots = d3.keys (rootObjs);
        this.createSuperroot (treeObj, roots, fileData, metaData, fieldIndexer);
        VESPER.log ("roots", roots);

        VESPER.log ("json", jsonObj, "tree", treeObj);
        return treeObj;
    };



    function addFieldToIndices (fileData, fieldName) {

        if (fileData.filteredFieldIndex[fieldName] == undefined) {
            var addAtIndex = fileData.filteredInvFieldIndex.length;
            fileData.filteredInvFieldIndex.push (fieldName);
            fileData.filteredFieldIndex[fieldName] = addAtIndex;

            // add to unfiltered indices. Shouldn't need this, but better safe than sorry.
            addAtIndex = fileData.invFieldIndex.length;
            fileData.invFieldIndex.push (fieldName);
            fileData.fieldIndex[fieldName] = addAtIndex;

            // don't add to fileData.fieldData so we can tell later what columns were in original dwca files and which we've added
        }
    }


    this.addOriginalAsSpecimenEntry = function (lastData, orig, taxa, name, idx, fieldIndexer, nameField) {
        var val = name;
        if (!taxa[val]) {
            var rdata = [];
            rdata[idx] = val;
            rdata[nameField] = val;
            rdata[fieldIndexer["taxonRank"]] = "Species";
            var obj = {};
            obj[VESPER.DWCAParser.TDATA] = rdata;
            taxa[val] = obj;

            if (lastData) {
                addToArrayProp (lastData, VESPER.DWCAParser.TAXA, taxa[val]);
            }

            //VESPER.log (val, taxa[val]);
        }
        addToArrayProp (taxa[val], VESPER.DWCAParser.SPECS, orig);
    };

    this.addOriginalAsLeaf = function (lastData, orig, taxa, name, idx, fieldIndexer, nameField) {
        addToArrayProp (lastData, VESPER.DWCAParser.TAXA, orig);
    };
	


	this.addExtRows2JSON = function (jsonData, extRowData, rowDescriptor) {
        var coreIDIndex = rowDescriptor.idIndex;

		var unreconciled = [];
		if (extRowData && (coreIDIndex != undefined)) {
            var extIndex = rowDescriptor.extIndex;
			for (var i = 0, len = extRowData.length; i < len; i++) {
				var dataRow = extRowData [i];

                if (dataRow) {
                    var coreid = dataRow[coreIDIndex];

                    if (coreid != undefined) {
                        var jsonins = jsonData[coreid];

                        if (jsonins) {
                            if (! jsonins[this.EXT]) {
                                jsonins[this.EXT] = [];
                            }
                            var jsonExt = jsonins[this.EXT];
                            addToArrayProp (jsonExt, extIndex, dataRow);
                        }
                    }
                    else {
                        unreconciled.push (i);
                    }
                }
			}
		}
		
		return unreconciled;
	};
	
	
	
	this.makeTreeFromAllFileRows = function (theFileRows, metaData) {
		var rowDescriptors = metaData.fileData;
		var coreFileData = rowDescriptors[metaData.coreRowType];

        var rawData = theFileRows[coreFileData.rowType];
        var jsonObj = this.occArray2JSONArray (rawData, coreFileData.idIndex);
        var impTree;
        var expTree;

        var impTreePoss = VESPER.DWCAHelper.fieldListExistence (metaData, VESPER.DWCAParser.neccLists.impTaxonomy, true, undefined, true, true);
        var expTreePoss = VESPER.DWCAHelper.fieldListExistence (metaData, VESPER.DWCAParser.neccLists.expTaxonomy, false, 2, true, true);
        VESPER.log ("TREE POS", impTreePoss, expTreePoss);
        VESPER.log ("MDR", metaData.coreRowType);
		//if (MGNapier.NapVisLib.endsWith (metaData.coreRowType, "Taxon")) {
        if (impTreePoss.match) {
			impTree = this.jsonTaxaObj2JSONTree (jsonObj, rawData, coreFileData, metaData);
		}
        if (expTreePoss.match) {
            expTree = this.jsonTaxaObj2ExplicitJSONTree (jsonObj, rawData, coreFileData, metaData,
                VESPER.DWCAParser.addOriginalAsSpecimenEntry
            );
		}

        var jsoned = {"records": jsonObj, "impTree":impTree, "expTree":expTree};

		for (var indRowDescriptorProp in rowDescriptors) {
			if (rowDescriptors.hasOwnProperty (indRowDescriptorProp)) {
				var indRowDescriptor = rowDescriptors[indRowDescriptorProp];
                if (metaData.coreRowType !== indRowDescriptor.rowType && indRowDescriptor.selected) {
                    var unreconciled = this.addExtRows2JSON (jsoned.records, theFileRows[indRowDescriptor.rowType], indRowDescriptor);
                    VESPER.log ("unreconciled in ",indRowDescriptorProp, unreconciled);
                }
			}
		}

		return jsoned;
	};
	

	
	this.setupStrucFromRows = function (theFileRows, metaData) {
        console.log ("METADATA", metaData);
		var struc = this.makeTreeFromAllFileRows (theFileRows, metaData);
        if (VESPER.alerts) { alert ("mem monitor point 2"); }

        if (struc.impTree) {
            struc.impRoot = struc.impTree[superrootID]; //this.createSuperroot (struc, this.findRoots (struc, fieldIndex), fieldIndex);
            VESPER.log ("root", struc.impRoot);
            if (struc.impRoot) {
                this.recursiveCount (struc.impRoot, "dcount", undefined, 1);
                this.recursiveCount (struc.impRoot, "syncount", VESPER.DWCAParser.SYN, 0);
            }
        }

        if (struc.expTree) {
            struc.expRoot = struc.expTree[superrootID]; //this.createSuperroot (struc, this.findRoots (struc, fieldIndex), fieldIndex);
            if (struc.expRoot) {
                this.recursiveCount (struc.expRoot, "dcount", undefined, 1);
                this.recursiveCount (struc.expRoot, "spcount", VESPER.DWCAParser.SPECS, 0);
            }
        }

        VESPER.log ("STRUC", struc);

        if (VESPER.alerts) { alert ("mem monitor point 3"); }
        VESPER.log ("root", struc.impRoot, struc.expRoot, struc.expTree);
        return struc;
	};
	
	
	this.findRoots = function (jsonObj, idx, fieldIndexer) {
		var roots = [];
		var hidx = fieldIndexer["parentNameUsageID"];
		var aidx = fieldIndexer["acceptedNameUsageID"];

		if (aidx !== undefined && hidx !== undefined) {
			for (var taxonProp in jsonObj) {
				if (jsonObj.hasOwnProperty (taxonProp)) {
					var taxon = jsonObj[taxonProp];
					var rec = taxon[this.TDATA];

                    if (rec) {
                        var id = rec[idx];
                        var aid = rec[aidx];
                        var pid = rec[hidx];
                        if ((id === aid || aid == undefined) && (pid === id || jsonObj[pid] == undefined)) { //Not a synonym, and parentid is same as id or parentid does not exist. possible root
                            roots.push (taxonProp);
                        }
                    }
				}
			}
		}
		
		return roots;
	};
	
	
	this.createSuperroot = function (jsonObj, roots, fileData, metaData, fieldIndexer) {
		if (roots.length === 0) {
			return undefined;
		}
		
		if (roots.length === 1) {
            jsonObj[superrootID] = jsonObj[roots[0]];
			return jsonObj[roots[0]];
		}

        var nameField = fieldIndexer[metaData.vesperAdds.nameLabelField.fieldType];
        var idName = fileData.invFieldIndex[fieldIndexer["id"]];
        var nameName = fileData.invFieldIndex[nameField];

		var hidx = fieldIndexer["parentNameUsageID"];
		var srData = {
            //id: superrootID,
            acceptedNameUsageID: superrootID,
            parentNameUsageID: superrootID,
            acceptedNameUsage: VESPER.DWCAParser.SUPERROOT,
            taxonRank: VESPER.DWCAParser.SUPERROOT,
            nameAccordingTo: "dwcaParse.js"
		};
        srData[nameName] = VESPER.DWCAParser.SUPERROOT;
        srData[idName] = superrootID;
		var srObj = {};
	
		srObj[this.TAXA] = [];
		for (var n = 0; n < roots.length; n++) {
			srObj[this.TAXA].push (jsonObj[roots[n]]);	// add root as child taxon of superroot
			jsonObj[roots[n]][VESPER.DWCAParser.TDATA][hidx] = superrootID;	// make superroot parent taxon of root
		}
		
		srObj[VESPER.DWCAParser.TDATA] = [];
		for (var prop in srData) {
			if (srData.hasOwnProperty (prop)) {
                if (fieldIndexer[prop] !== undefined) {
				    srObj[VESPER.DWCAParser.TDATA][fieldIndexer[prop]] = srData[prop];
                }
			}
		}
		
		VESPER.log ("superroot", srObj);

        jsonObj[superrootID] = srObj;  // add it to the json obj so it gets treated like a node everywhere else
		return srObj;	
	};


    /*
    recursively count a field size in the taxonomy
    countField is the array that's being counted
    storeField is where the count is stored
    inc is usually 1 or 0, 1 means each recursion adds to the count, 0 means it doesn't.
    it also doesn't store field counts unless it has to, which saves mem
     */
    this.recursiveCount = function (taxon, storeField, countField, inc) {
        var c = 0;

        if (taxon[this.TAXA]) {
            for (var n = 0; n < taxon[this.TAXA].length; n++) {
                c += this.recursiveCount (taxon[this.TAXA][n], storeField, countField, inc);
            }
            taxon[storeField] = c;
        }
        c += (countField && taxon[countField] ? taxon[countField].length : 0);

        if (taxon[storeField]) {
            taxon[storeField] = c;
        }

        return c + inc;
    };


	
	this.parseMeta = function (theXML) {
		var fileData = {};

		var coreRowType = this.getCoreRowType (theXML);
		fileData[coreRowType] = this.parseCore (theXML, coreRowType);

		var extRowTypes = this.getExtensionRowTypes (theXML);
		for (var n = 0; n < extRowTypes.length; n++) {
			fileData [extRowTypes[n]] = this.parseExtension (theXML, extRowTypes[n], n);
		}

		var metaData = {"coreRowType":coreRowType, "extRowTypes":extRowTypes, "fileData":fileData, "vesperAdds":{}};

        if (coreRowType == undefined) {
            metaData.error = $.t("parser.missingCoreError");
        }
        else if (fileData[coreRowType].error) {
            metaData.error = fileData[coreRowType].error;
        }
		return metaData;
	};


    // returns {error: true} if it can't find the right bits
	this.parseCore = function (theXML, coreRowType) {
		return this.parseFrag (theXML, 'archive core[rowType="'+coreRowType+'"]', 'id', coreRowType);
	};

    // returns {error: true} if it can't find the right bits
	this.parseExtension = function (theXML, extensionRowType, index) {
		var extObj = this.parseFrag (theXML, 'extension[rowType="'+extensionRowType+'"]', 'coreid', extensionRowType);
        extObj.extIndex = index;
        return extObj;
	};
	
	// returns {error: true} if it can't find the right bits
	this.parseFrag = function (theXML, fragQ, idAttrName, rowType) {
        VESPER.log ("thexml", typeof theXML, theXML);
		var frag = $(theXML).find(fragQ);

        if (frag[0] !== undefined) {
            var ffrag = $(frag[0]);

            var fileData = {};
            var fileNames = ffrag.find('files location').contents();

            if (fileNames[0] !== undefined) {
                fileData.fileName = fileNames[0].data;

                fileData.rowType = rowType;
                fileData.mappedRowType = this.recordURIMap [rowType] || rowType;
                for (var attrName in this.rowTypeDefaults) {
                    if (this.rowTypeDefaults.hasOwnProperty (attrName)) {
                        // AARGH. Remember, there is a difference between something being undefined and an empty value.
                        // Both equate to false, but only one (attribute is undefined) says there is no
                        // such attribute there and we should fall back to the default.
                        // The other, the attribute has been given an empty value, means the value is empty and we should use that, not the default.
                        // Caused Error. Grrrr.
                        //if (ffrag.attr(attrName) === undefined)
                        fileData[attrName] = (ffrag.attr(attrName) !== undefined ? ffrag.attr(attrName) : this.rowTypeDefaults[attrName]);
                        VESPER.log ("att", attrName, "#", fileData[attrName], "#");
                    }
                }
                VESPER.log (ffrag.attr("fieldsEnclosedBy"));


                var idIndex = +ffrag.find(idAttrName).attr('index'); // '+' makes it a number not a string
                fileData.idIndex = idIndex;
                var fields = ffrag.find('field');

                VESPER.log ("fieldsTerminatedBy", fileData.fieldsTerminatedBy);

                fileData.fieldIndex = {}; fileData.invFieldIndex = [];
                fileData.fieldData = {};
                fileData.fieldIndex[idAttrName] = idIndex;
                fileData.invFieldIndex[idIndex] = idAttrName;
                for (var fidx = 0; fidx < fields.length; fidx++) {
                    var fXml = $(fields[fidx]);
                    var fieldAttrs = {};
                    for (var fieldAttr in VESPER.DWCAParser.fieldAttrNames) {
                        if (VESPER.DWCAParser.fieldAttrNames.hasOwnProperty (fieldAttr)) {
                            var fieldAttrType = VESPER.DWCAParser.fieldAttrNames[fieldAttr];
                            var val = fXml.attr (fieldAttr);
                            if (fieldAttrType == "xs:integer") {
                                val = +val; // '+' makes it a number not a string
                            }
                            fieldAttrs[fieldAttr] = val;
                        }
                    }
                    fieldAttrs.shortTerm = getCurrentTerm (chopToLastSlash (fieldAttrs.term));
                    var index = fieldAttrs.index;
                    var fieldName = fieldAttrs.shortTerm;
                    fieldAttrs.discreteTermList = (VESPER.DWCAParser.discreteTermSet[fieldName] ? {} : undefined);

                   // VESPER.log ("FieldAttrs:", fieldAttrs);

                    if (!isNaN(index)) {
                        fileData.fieldIndex[fieldName] = index;
                        fileData.invFieldIndex[fileData.fieldIndex[fieldName]] = fieldName;
                    }

                    fileData.fieldData[fieldName] = fieldAttrs;
                }

                fileData.filteredFieldIndex = {}; //$.extend ({}, fileData.fieldIndex);
                fileData.filteredInvFieldIndex = []; //fileData.invFieldIndex.slice();

                VESPER.log ("filenames: ", fileNames);
                return fileData;
            }
            return {"error": $.t("parser.missingFilesError", {"part": fragQ})};
        }
        return {"error": $.t("parser.missingPathError", {"path": fragQ})};
	};


    this.updateFilteredLists = function (fileData, presentFieldIndex) {
        var i = 0;
        fileData.filteredInvFieldIndex.length = 0;
        var idName = fileData.invFieldIndex[fileData.idIndex];
        $.each(fileData.filteredFieldIndex, function (n) {
            if (n !== idName) {
                fileData.filteredFieldIndex[n] = undefined;
            }
        });

        for (var n = 0; n < presentFieldIndex.length; n++) {
            if (presentFieldIndex[n]) {
                var name = fileData.invFieldIndex [n];
                fileData.filteredFieldIndex[name] = i;
                fileData.filteredInvFieldIndex[i] = name;
                i++;
            }
        }

        VESPER.log ("fi", fileData.fieldIndex, fileData.filteredFieldIndex, fileData.invFieldIndex, fileData.filteredInvFieldIndex);
    };
	
	
	this.getCoreRowType = function (theXML) {
		var frags = $(theXML).find('core');
		var term = $(frags[0]).attr('rowType');	// should only be 1
		VESPER.log ("core", term);
		return term;
	};
	
	this.getExtensionRowTypes = function (theXML) {
		var frags = $(theXML).find('extension');
		var types = [];
		for (var n = 0; n < frags.length; n++) {
			var term = $(frags[n]).attr('rowType');
			types.push (term);
		}
		
		return types;
	};

    this.getFilteredIdIndex = function (metaData) {
        var coreData = metaData.fileData[metaData.coreRowType];
        return coreData.filteredFieldIndex [coreData.invFieldIndex [coreData.idIndex]];
    };

	
	function chopToLastSlash (term) {
		var chop = (term ? term.lastIndexOf("/") + 1 : -1);
		return (chop > 0) ? term.substring (chop) : term;
	}

    this.selectNodes = function (regex, selectorFunc, model, setSelectionFunc) {
        var count = 0;
        var data = model.getData();

        if (regex !== undefined && regex.length > 0) {
            for (var prop in data) {
                if (data.hasOwnProperty(prop)) {
                    var dataItem = data[prop];
                    var match = selectorFunc (model, dataItem, regex);
                    if (match) {
                        count++;
                        setSelectionFunc (prop);
                    }
                }
            }
        }

        return count;
    };


    // load in xsd and populate arrays/maps from it.
    this.loadxsd ('dwca.xsd');

    return this;
}();
/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 24/05/13
 * Time: 14:02
 * To change this template use File | Settings | File Templates.
 */

VESPER.Filters = new function () {

    this.nameLabelFilter = function (model, regex) {
        VESPER.log ("regex", regex);
        var metaData = model.getMetaData();
        var nameLabel = metaData.vesperAdds.nameLabelField;
        var rowDescriptor = metaData.fileData[nameLabel.rowType];
        var rowIndex = rowDescriptor.extIndex;
        var nameIndex = rowDescriptor.filteredFieldIndex[nameLabel.fieldType];
        var oneArray = [];

        //VESPER.log ("FILTER", nameLabel, nameIndex, rowIndex);

        var specificFilter = function (model, taxon, regex) {
            var rowRecords = model.getRowRecords (taxon, rowIndex);

            if (rowIndex == undefined) {
                oneArray[0] = rowRecords;
                rowRecords = oneArray;
            }

            if (rowRecords) {
                for (var n = rowRecords.length; --n >= 0;) {
                    var name = rowRecords[n][nameIndex];
                    if (name && name.match (regex) != null) {
                        return true;
                    }
                }
            }

            return false;
        };

        model.getSelectionModel().setUpdating (true);
        var count = VESPER.DWCAParser.selectNodes (regex, specificFilter, model, function(obj) { model.getSelectionModel().addToMap (obj); });
        //VESPER.log ("selected count", count, model.getSelectionModel().values());
        model.getSelectionModel().setUpdating (false);
        return count;
    };

    return this;
}();

/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 03/10/13
 * Time: 15:17
 * To change this template use File | Settings | File Templates.
 */
VESPER.modelComparisons = new function () {

    this.modelCoverageToSelection = function (model1, model2, linkField1, linkField2) {
        var small = smaller (model1, model2);
        var large = (small === model1 ? model2 : model1);
        var smallLinkField = (small === model1 ? linkField1 : linkField2);
        var largeLinkField = (small === model1 ? linkField2 : linkField1);
        var smallData = [small.getExplicitTaxonomy(), small.getData()];
        var largeData = [large.getExplicitTaxonomy(), large.getData()];
        var smallSelection = small.getSelectionModel();
        var largeSelection = large.getSelectionModel();
        //VESPER.log ("lf", linkField1, linkField2);

        smallSelection.clear();
        largeSelection.clear();

        smallSelection.setUpdating (true);
        largeSelection.setUpdating (true);

        var arr = [];
        for (var stset = 0; stset < smallData.length; stset++) {
            var tree = smallData[stset];
            if (tree) {
                for (var prop in tree) {
                    if (tree.hasOwnProperty (prop)) {
                        var val = small.getDataPoint (tree[prop], smallLinkField);
                        arr.push ([prop, val]);
                    }
                }
            }
        }

        var stopwatch = {base: 0};
        MGNapier.NapVisLib.resetStopwatch (stopwatch);

        arr.sort (function(a,b) {
            if ( a[1] < b[1] )
                { return -1; }
            if ( a[1] > b[1] )
                { return 1; }
            return 0;
        });

        //VESPER.log ("sorted array", arr);
        VESPER.log ("sort", MGNapier.NapVisLib.elapsedStopwatch (stopwatch), "ms");
        MGNapier.NapVisLib.resetStopwatch (stopwatch);

        var c = 0;

        var lastVal, lastWhere;
        for (var ltset = 0; ltset < largeData.length; ltset++) {
            var tree = largeData[ltset];
            if (tree) {

                for (var prop in tree) {
                    if (tree.hasOwnProperty (prop)) {
                        var val = large.getDataPoint (tree[prop], largeLinkField);
                        // lastVal === val is a useful shortcut when we have lots of specimens of the same name, usually they are grouped sequentially in the record data
                        var where = (lastVal === val ? lastWhere : binaryIndexOf (arr, val));
                        //var where = binaryIndexOf (invMap, val);
                        lastVal = val;
                        lastWhere = where;
                        c++;

                        // exact match
                        if (where >= 0) {
                            smallSelection.addToMap (arr[where][0]);
                            largeSelection.addToMap (prop);
                        } else {
                            where = ~where;
                            partMatch (prop, val, where, arr, smallSelection, largeSelection);
                        }
                    }
                }
            }
        }

        VESPER.log ("search", MGNapier.NapVisLib.elapsedStopwatch (stopwatch), "ms");
        VESPER.log ("Done",c,"comparisons");

        smallSelection.setUpdating (false);
        largeSelection.setUpdating (false);
    };

    function smaller (model1, model2) {
        var c1 = MGNapier.NapVisLib.countObjProperties (model1.getData());
        var c2 = MGNapier.NapVisLib.countObjProperties (model2.getData());
        return (c1 < c2 ? model1 : model2);
    }

    function jointPrefixLength (s1, s2) {
        var min = Math.min ((s1 ? s1.length : 0), (s2 ? s2.length : 0));
        for (var n = 0; n < min; n++) {
            if (s1[n] !== s2[n]) {
                return n;
            }
        }
        return min;
    }

    function startsWith (ls, ss) {
        return ls.lastIndexOf (ss, 0) === 0;
    }


    /**
     * Naive matching routine. Checks if one string is a prefix of another.
     * @param prop
     * @param val
     * @param where
     * @param arr
     * @param smallSel
     * @param largeSel
     */
    function partMatch (prop, val, where, arr, smallSel, largeSel) {
        var valL = val.length;

        if (where > 0) {
            var e1 = arr[where-1];
            var l1 = Math.min (valL, e1[1].length);
            var m1 = jointPrefixLength (val, e1[1]);
            if (m1 >= 10 && m1 === l1) {
                smallSel.addToMap (e1[0]);
                largeSel.addToMap (prop);
            }
        }

        if (where < arr.length) {
            var e2 = arr[where];
            var l2 = Math.min (valL, e2[1].length);
            var m2 = jointPrefixLength (val, e2[1]);
            if (m2 >= 10 && m2 === l2) {
                smallSel.addToMap (e2[0]);
                largeSel.addToMap (prop);
            }
        }
        /*
        if (startsWith (valL === l1 ? e1[1] : val)) {
            smallSel.addToMap (e1[0]);
            largeSel.addToMap (prop);
        }

        if (startsWith (valL === l2 ? e2[1] : val)) {
            smallSel.addToMap (e2[0]);
            largeSel.addToMap (prop);
        }
        */
    }

    /**
     * Performs a binary search on the host array. This method can either be
     * injected into Array.prototype or called with a specified scope like this:
     * binaryIndexOf.call(someArray, searchElement);
     *
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    // http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
    function binaryIndexOf (arr, searchElement) {
        var minIndex = 0;
        var maxIndex = arr.length - 1;
        var currentIndex;
        var currentElement;
        var resultIndex;

        while (minIndex <= maxIndex) {
            resultIndex = currentIndex = (minIndex + maxIndex) / 2 | 0;
            currentElement = arr[currentIndex][1]; // cos its an array of arrays

            if (currentElement < searchElement) {
                minIndex = currentIndex + 1;
            }
            else if (currentElement > searchElement) {
                maxIndex = currentIndex - 1;
            }
            else {
                return currentIndex;
            }
        }

        return (~(Math.max(maxIndex,minIndex))); // ~ unary not negates number and subtracts 1 if no match found. Subtract 1 needed to avoid minus zeroes.
    }

    this.test1 = function () {
        var arr = [["345", "ant"], ["2013","bat"], ["45", "cat"], ["133", "dog"], ["708", "eel"]];
        var tests = ["rabbit", "aardvark", "cat", "cattus fattus"];
        for (var n = 0; n < tests.length; n++) {
            console.log ("binary test", tests[n], binaryIndexOf (arr, tests[n]));
        }
    };


    return this;
}();
VESPER.FilterView = function (divID) {

    var model;
    var self = this;
    var typeAhead = true;
    var keyField;

    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        model = mmodel;
    };


	this.go = function () {
        var tid = d3.select(divID).attr("id")+"Text";
        var textSearch = d3.select(divID).append("span");
        textSearch.append("label")
            .attr("for", tid)
            .text ($.t("search.label"))
        ;
        textSearch.append("input")
            .attr("type", "search")
            .attr("id", tid)
            .attr("placeholder", $.t("search.placeholderText"))
        ;

        var typeAheadDiv = textSearch.append("div");

        typeAheadDiv
            .append ("input")
            .attr ("name", tid+"TypeAhead")
            .attr ("value", typeAhead ? "checked" : "")
            .attr ("checked", typeAhead)
            .attr ("type", "checkbox")
            .on ("click", function () {
                typeAhead = d3.event.target.checked;
            })
        ;

        typeAheadDiv
            .append ("label")
            .attr ("for", tid+"TypeAhead")
            .text ($.t("search.keystrokeLabel"))
        ;

        bindSearch ();
		this.update ();
	};

    function bindSearch () {
        var tfield = d3.select(divID).select("span input");
        tfield
            .on ("keyup", function() {
                if (typeAhead || (d3.event.keyCode | d3.event.charCode) === 13) {
                    model.getSelectionModel().clear();
                    /*var count = */VESPER.Filters.nameLabelFilter (model, d3.select(this).property("value"));
                }
            })
        ;
    }
	

	this.update = function () {};

    this.updateVals = this.update;


    this.destroy = function () {
        VESPER.DWCAHelper.recurseClearEvents (d3.select(divID));

        model.removeView (self);
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divID);
    };
};

VESPER.modelBag = [];


VESPER.RecordDetails = function (divID) {

    var idField = "mappedRowType";
    var extDetailTable = "extDetailTable";
    var detailTable = "detailTable";

    var model;
    var self = this;
    var curID;
    var keyField;


    this.set = function (fields, mmodel) {
        var ffields = mmodel.makeIndices ([fields.identifyingField]);
        keyField = ffields[0];
        model = mmodel;
    };


    this.go = function () {
        var divSel = d3.select(divID);
        var recordInput = divSel.append("div");
        var iid = divSel.attr("id")+"textinput";
        recordInput.append("label")
            .attr("for", iid)
            .text ($.t("search.findLabel"))
        ;
        recordInput.append("input")
            .attr("type", "search")
            .attr("id", iid)
            .attr("placeholder", $.t("search.findPlaceholderText"))
        ;
        recordInput.append("span")
            .attr ("class", "vesperWarning")
            .text($.t("search.noResult"))
            .style("display", "none")
        ;


        var rfield = divSel.select("input");
        rfield
            .on ("keyup", function() {
                recordInput.select("span.vesperWarning").style("display","none");
                if ((d3.event.keyCode | d3.event.charCode) === 13) {
                    var val = d3.select(this).property("value");
                    newID (val);
                }
            })
        ;
    };


    this.update = function () {
        var divSel = d3.select(divID);

        if (curID !== undefined) {
            //VESPER.log ("METADATA", metaData);
            var metaData = model.getMetaData();
            var fileData = metaData.fileData;
            var node = model.getNodeFromID (curID);

            // Set up taxon data table
            var tableSel = makeTableAndHeader (divSel, detailTable, [$.t("search.fieldLabel"), $.t("search.valueLabel")]);
            var tableData = [];
            var tInvFields = fileData[metaData.coreRowType].filteredInvFieldIndex;
            var tdata = model.getTaxaData(node);
            for (var n = 0; n < tdata.length; n++) {
                if (tdata[n]) {
                    tableData.push ([tInvFields[n], tdata[n]]);
                }
            }

            var fieldBind = tableSel
                .selectAll("tr.nonHeader")
                .data(tableData)
            ;
            fieldBind.exit().remove();
            addFieldData (fieldBind);
            var newFields =
                fieldBind.enter()
                    .append ("tr")
                    .attr ("class", "nonHeader")
            ;
            addFieldData (newFields);


            var extKeys = d3.keys (model.getExtraData(node));
            var extTablesSel = divSel.selectAll("table."+extDetailTable);
            var extTablesBind = extTablesSel.data (extKeys);

            extTablesBind
                .exit()
                .remove()
            ;

            extTablesBind
                .enter ()
                .append ("table")
                .attr ("class", extDetailTable)
                .attr ("id", function (d) { return d+"Table"; })
            ;

            var rowTypeMap = {};
            for (var i = 0; i < metaData.extRowTypes.length; i++) {
                var rowType = metaData.extRowTypes[i];
                rowTypeMap [fileData[rowType][idField]] = rowType;
            }

            for (var n = 0; n < extKeys.length; n++) {
                addExtHeader (model.getExtraData(node), extKeys[n], rowTypeMap[extKeys[n]], divID);
                addExtData (model.getExtraData(node), extKeys[n], rowTypeMap[extKeys[n]], divID);
            }

            // Synonymy table
            var synTablesSel = makeTableAndHeader (divSel, "synTable", [$.t("search.recordSyn")]);
            var syns = model.getSynonyms(node);
            tableData = [];
            if (syns) {
                for (var n = 0; n < syns.length; n++) {
                    var syn = syns[n];
                    tableData.push ([model.getIndexedDataPoint(syn, keyField)]);
                }
            }
            synTablesSel.style("display", syns ? null : "none");

            fieldBind = synTablesSel
                .selectAll("tr.nonHeader")
                .data(tableData)
            ;
            fieldBind.exit().remove();
            addFieldData (fieldBind);
            newFields =
                fieldBind.enter()
                    .append ("tr")
                    .attr ("class", "nonHeader")
            ;
            addFieldData (newFields);
            //addFieldData (fieldBind);


            // Specimens table
            var specTablesSel = makeTableAndHeader (divSel, "specTable", [$.t("search.recordSpec")]);
            var specs = model.getSpecimens(node);
            tableData = [];
            if (specs) {
                for (var n = 0; n < specs.length; n++) {
                    var spec = specs[n];
                    tableData.push ([model.getIndexedDataPoint(spec, keyField)]);
                }
            }
            specTablesSel.style("display", specs ? null : "none");

            fieldBind = specTablesSel
                .selectAll("tr.nonHeader")
                .data(tableData)
            ;
            fieldBind.exit().remove();
            addFieldData (fieldBind);
            newFields =
                fieldBind.enter()
                    .append ("tr")
                    .attr ("class", "nonHeader")
            ;
            addFieldData (newFields);
        }

        divSel.selectAll("table").style("visibility", curID === undefined ? "collapse" : "visible");
    };

    this.updateVals = this.update;

    function makeTableAndHeader (under, tableClass, headerArray) {
        var tableSel = under.select("."+tableClass);
        if (tableSel.empty()) {
            d3.select(divID).append("table")
                .attr("class", tableClass)
            ;
            tableSel = d3.select(divID).select("."+tableClass);
            var headers = tableSel.append("tr").selectAll("th").data(headerArray);
            headers.enter().append("th").text(function(d) { return d; });
        }
        return tableSel;
    }

    function newID (val) {
        if (model.getNodeFromID(val)) {
            curID = val;
            self.update();
        } else {
            d3.select(divID).select("div").select("span.vesperWarning").style("display", null);
        }
    }

    function jumpToClick (d) {
        if (d) {
            d3.select(divID).select("input").property("value", d);
            newID (d);
        }
    }

    function addFieldData (existOrNew) {

        var cells = existOrNew.selectAll("td").data(function(d) { return d; });
        cells.enter().append("td");
        cells.each(addHrefIfNecc).on("click", jumpToClick).style("cursor", "pointer");

        function addHrefIfNecc (d) {
            if (d.substring && d.substring(0,7) === "http://") {
                d3.select(this).append ("a")
                    .attr ("href", function(d) { return d; })
                    .attr ("target", "_blank")
                    .text (function(d) { return d; })
                ;
            } else {
                d3.select(this).text(function(d) {
                    return d;
                });
            }
        }

    }


    function addExtHeader (ext, tableID, fileDataRowType, div) {
        var fileData = model.getMetaData().fileData;
        VESPER.log ("table", div, "#"+tableID+"Table", fileDataRowType);
        var extTable = d3.select(div).select("#"+tableID+"Table");
        var hrow = extTable.selectAll("tr.hrow");
        var hRowBind = hrow.data ([0]); // a dummy 1 element array for 1 header row

        hRowBind
            .enter()
            .append ("tr")
            .attr ("class", "hrow")
        ;

        var invFields = fileData[fileDataRowType].filteredInvFieldIndex;
        hrow = extTable.selectAll("tr.hrow");
        var headerCellBind = hrow.selectAll("th")
            .data (invFields);

        headerCellBind
            .text (function(d,i) { return invFields[i]; })
        ;

        headerCellBind
            .enter()
            .append("th")
            .text (function(d,i) { return invFields[i]; })
        ;
    }


    function addExtData (ext, tableID, fileDataRowType, div) {
        var extProp = tableID;
        //var fileData = model.getMetaData().fileData;
        //VESPER.log ("extData", ext, extProp);
        var extTable = d3.select(div).select("#"+tableID+"Table");
        var rowSel = extTable.selectAll ("tr.drow");
        var rowBind = rowSel.data (ext[extProp]);

        rowBind.exit()
            .remove();

        rowBind.enter()
            .append ("tr")
            .attr ("class", "drow")
            .attr ("id", function(d, i) { return tableID + i; })
        ;

        for (var n = 0; n < ext[extProp].length; n++) {
            var extEntry = ext[extProp][n];
            var indRowSel = extTable.select("#"+tableID+n).selectAll("td");
            var indRowBind = indRowSel.data (extEntry);

            indRowBind
                .exit()
                .text ("")
            ;

            indRowBind
                .text (function (d) { return d; })
            ;

            indRowBind.enter()
                .append ("td")
                .text (function (d) { return d; })
            ;
        }
    }

    this.destroy = function () {
        VESPER.DWCAHelper.recurseClearEvents (d3.select(divID));
        curID = undefined;
        model.removeView (self);
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divID);
    };
};
// TimeLine

VESPER.Sanity = function(divid) {

    var model;
    var self = this;
	var thisView;
    var dataChanged = true;

    var allVisComplete, allFieldsComplete, vocabCounts;

	//var exitDur = 400, updateDur = 1000, enterDur = 400;
    var maxBarWidth = 100;


    this.set = function (fields, mmodel) {
        model = mmodel;
        VESPER.log ("sanity model", model);
    };

    this.go = function () {
		thisView = this;
		this.update ();
	};


    var calcVisBasedSanity = function (filter) {
        var tests = [], testOutputs = [];
        var dataModel = model.getData();

        var lists = VESPER.DWCAParser.neccLists;
        for (var list in lists) {
            if (lists.hasOwnProperty(list)) {
                var present = model.makeIndices (lists[list]);
                var nullCount = MGNapier.NapVisLib.countNulls (present);
                if (nullCount === 0) {
                    tests.push (present);
                    testOutputs.push ({"listName":list, "all":0, "some":0});
                }
            }
        }

        var oc = 0;
        for (var obj in dataModel) {
            if (dataModel.hasOwnProperty(obj)) {
                if (!filter || filter (model, obj)) {
                    oc++;
                    for (var i = 0; i < tests.length; i++) {
                        var test = tests[i];
                        var some = false, all = true;

                        for (var j = 0; j < test.length; j++) {
                            var val = model.getIndexedDataPoint (dataModel[obj], test[j]);
                            if (val == undefined) {
                                some = true;
                            }
                            else {
                                all = false;
                            }
                        }

                        if (some) { testOutputs[i].some++; }
                        if (all) { testOutputs[i].all++; }
                    }
                }
            }
        }

        return {outputs: testOutputs, dataCount: oc};
    };


    var calcFieldBasedSanity = function (filter) {
        var fdEntries = d3.entries (model.getMetaData().fileData);
        var dataModel = model.getData();

        var results = {};
        for (var n = 0; n < fdEntries.length; n++) {
            var fIndex = fdEntries[n].value.filteredInvFieldIndex;
            var shortName = fdEntries[n].value.mappedRowType;
            results[shortName] = {};
            for (var f = 0; f < fIndex.length; f++) {
                results[shortName][fIndex[f]] = {"recordType":shortName, "name": fIndex[f], "count": 0};
            }
        }

        var activefdEntries = fdEntries.filter(function(k) { return k.value.filteredInvFieldIndex.length > 0; });
        //var c = 0;
        for (var obj in dataModel) {
            if (dataModel.hasOwnProperty(obj)) {
                if (!filter || filter (model, obj)) {
                    for (var n = 0; n < activefdEntries.length; n++) {
                        var fdata = activefdEntries[n].value;
                        var fIndex = fdata.filteredInvFieldIndex;
                        var tdat = model.getRowData (dataModel[obj], fdata.extIndex);
                        if (tdat && fdata.extIndex) {
                            tdat = tdat[0];
                        }
                        var shortName = fdata.mappedRowType;
                        for (var f = 0; f < fIndex.length; f++) {
                            var fName = fIndex[f];
                            if (tdat == undefined || tdat[f] == undefined) {
                                results[shortName][fName].count++;
                            }
                        }
                    }
                }
            }
        }

        var results2 = {};
        for (var rowType in results) {
            if (results.hasOwnProperty (rowType)) {
                var fields = results[rowType];
                for (var fieldType in fields) {
                    if (fields.hasOwnProperty (fieldType)) {
                        results2[rowType+" "+fieldType] = fields[fieldType];
                    }
                }
            }
        }

        return results2;
    };


    var calcControlledVocabFieldRanges = function () {
        var fdEntries = d3.entries (model.getMetaData().fileData);
        var results = {};
        for (var n = 0; n < fdEntries.length; n++) {
            var map = fdEntries[n].value.fieldData; //discreteTermLists;
            for (var field in map) {
                if (map.hasOwnProperty(field)) {
                    var arr = d3.values (map[field].discreteTermList);
                    if (arr.length > 0) {
                        results[field] = {"name": field, "count": arr.length};
                    }
                }
            }
        }

        return results;
    };

    function calcData () {
        allVisComplete = calcVisBasedSanity ();
        allFieldsComplete = calcFieldBasedSanity ();
        vocabCounts = calcControlledVocabFieldRanges ();
        dataChanged = false;
    }


    var selectedFilter = function (model, id) {
        return model.getSelectionModel().contains (id);
    };


	this.update = function () {
        var divSel = d3.select(divid);

        if (dataChanged) {
            calcData();
        }

        var selectedSize = model.getSelectionModel().values().length;
        var selVisComplete = calcVisBasedSanity (selectedFilter);
        var selFieldsComplete = calcFieldBasedSanity (selectedFilter);

        var testOutputs = allVisComplete.outputs;
        var oc = allVisComplete.dataCount;

        // merge static and selected counts
        for (var n = 0; n < testOutputs.length; n++) {
            var testOutput = testOutputs[n];
            var selOutput = selVisComplete.outputs[n];
            testOutput.selSome = selOutput.some;
            testOutput.selAll = selOutput.all;
        }
        for (var obj in allFieldsComplete) {
            if (allFieldsComplete.hasOwnProperty (obj)) {
                var allObj = allFieldsComplete[obj];
                var selObj = selFieldsComplete[obj];
                allObj.selCount = selObj.count;
            }
        }


        var intro = divSel.select("div.sanityHeader");
        if (intro.empty) {
            divSel
                .append ("div")
                .attr ("class", "sanityHeader")
                .append ("p")
            ;
        }

        divSel.select("div.sanityHeader")
            .select("p")
            .text (oc+" Records"+(selectedSize > 0 ? ", "+selectedSize+" Selected" : ""))
        ;

        function createTable (klass, headings) {
            var table = divSel.select("table."+klass);
            if (table.empty()) {
                var topRow = divSel
                    .append("table")
                    .attr ("class", klass)
                    .append ("tr")
                ;

                topRow.selectAll("th").data(headings)
                    .enter()
                    .append("th")
                    .attr ("class", "sanityTableHeading")
                    .text (function(d) { return d;})
                ;
            }
            return divSel.select("table."+klass);
        }

        function eraseTable (klass) {
            var table = divSel.select("table."+klass);
            table.remove();
        }

        function popTable (rows, cellFiller)  {
            rows.exit().remove();

            rows.enter()
                .append ("tr")
                .attr ("class", "sanityRow")
            ;

            rows.each(cellFiller);
        }

        var pcFormat = d3.format (".2%");

        function fillCells (d) {
            var arr = [];
            // google chrome doesn't do returning object properties in the order they were added.
            for (var n = 0; n < processors.length; n++) {
                var item = processors[n].name;
                if (d[item] !== undefined) {
                    arr.push ({"key":item, "value":d[item]});
                }
            }

            var cells = d3.select(this).selectAll("td").data(arr);
            cells.enter().append ("td")
                .attr ("class", function(d,i) { return processors[i] && processors[i].klass ? processors[i].klass : null; })
            ;

            function dstring (d,i) {
                var pcVal = (processors[i].func ? processors[i].func(d.value) : d.value);
                return d.value.toString() + (isNaN(d.value) || pcVal === undefined ? "" : " ("+ pcFormat (pcVal)+ ")") ;
            }


            if (cells.select("div").empty()) {
                cells.append("div").attr("class", function(d,i) {
                    var barClass = (processors[i].func === getSelPC) ? "selected" : "unselected";
                    return barClass;
                });
                cells.selectAll("div")
                    .style("height", "10px")
                ;
            }

            cells.select("div")
                .style ("width", function(d,i) {
                    var pcVal = (processors[i].func ? processors[i].func(d.value) : d.value);
                    return isNaN(d.value) ? 0 : Math.min (maxBarWidth, pcVal * maxBarWidth) + "px";
                })
            ;

            if (cells.select("span.sanityBarText").empty()) {
                cells.append("span").attr("class", "sanityBarText");
            }
            cells.select("span.sanityBarText").text (dstring);
            cells.attr ("title", dstring);
        }


        function getOrig () { return undefined; }
        function getAllPC (val) { return val / oc; }
        function getSelPC (val) { return selectedSize > 0 ? val / selectedSize : 0; }

        // Check missing data by vis type
        var visSanHeaders = [];
        for (var n = 0; n < 5; n++) {
            visSanHeaders.push ($.t("sanity.visSanHeaders."+n));
        }
        var sTable = createTable ("visSanityTests", visSanHeaders);
        var processors = [{name:"listName", func:getOrig, klass:"showSanityText"}, {name:"some", func:getAllPC, klass:"dontShowSanityText"}, {name:"all", func:getAllPC, klass:"dontShowSanityText"},
                {name:"selSome", func:getSelPC, klass:"dontShowSanityText"}, {name:"selAll", func:getSelPC, klass:"dontShowSanityText"}
        ];
        popTable (sTable.selectAll("tr.sanityRow").data(testOutputs), fillCells);


        // Check missing data by field type
        var fieldSanHeaders = [];
        for (var n = 0; n < 4; n++) {
            fieldSanHeaders.push ($.t("sanity.fieldSanHeaders."+n));
        }
        if (!$.isEmptyObject(allFieldsComplete)) {
            sTable = createTable ("fieldSanityTests", fieldSanHeaders);
            processors = [{name:"recordType", func:getOrig, klass:"showSanityText"}, {name:"name", func:getOrig, klass:"showSanityText"}, {name:"count", func:getAllPC, klass:"dontShowSanityText"},
                {name:"selCount", func:getSelPC, klass:"dontShowSanityText"}
            ];
            popTable (sTable.selectAll("tr.sanityRow").data(d3.values(allFieldsComplete)), fillCells);
        }

        // Check fields with controlled vocabularies
        var vocabSanHeaders = [];
        for (var n = 0; n < 2; n++) {
            vocabSanHeaders.push ($.t("sanity.vocabSanHeaders."+n));
        }
        if (!$.isEmptyObject(vocabCounts)) {
            sTable = createTable ("vocabSanityTests", vocabSanHeaders);
            processors = [{name:"name", func:getOrig, klass:"showSanityText"}, {name:"count", func:getOrig, klass:"showSanityText"}];
            popTable (sTable.selectAll("tr.sanityRow").data(d3.values(vocabCounts)), fillCells);
        } else {
            eraseTable ("vocabSanityTests");
        }
	};

    this.updateVals = this.update;

    this.destroy = function () {
        VESPER.DWCAHelper.recurseClearEvents (d3.select(divid));

        model.removeView (self);
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divid);
    };
};
// Tree

VESPER.Tree = function (divid) {

    var self = this;

	var svg;	// top level svg
	var treeG; // matrix rectangle (i.e. not the axes)
	
	var dims;

    var absRoot;
    var curRoot;
    var spaceAlloc;
    var layout;
	var curSort;

    var thisView;
    var model;
    var noHashID;

    var ffields;

    var zoomObj = d3.behavior.zoom();	// zoom object, need to keep as we reference it later. calling d3.behavior.zoom() again gets us a different object/function
    zoomObj.scaleExtent ([1.0, 4.0]); // constrain zooming

    var exitDur = 400, updateDur = 1000, enterDur = 400;
    var keyField, rankField;
    var firstLayout = true;
    //var color = d3.scale.category20c();
    //var colourScale = d3.scale.linear().domain([0, 1]).range(["#ffcccc", "#ff6666"]);
    var cstore = {}, pstore = {};
    var patternName = "hatch", patternID = "hatch";

    var allowedRanks = {"superroot": true, "ROOT": true, "FAM": true, "ORD": true, "ABT": true, "KLA": true, "GAT": true, "SPE": true};
	var sortOptions = {
		"Alpha": function (a,b) { var n1 = model.getLabel(a), n2 = model.getLabel(b);
								return ( n1 < n2 ) ? -1 : ( n1 > n2 ? 1 : 0 );},
		"Descendants": function (a,b) {
            var s1 = containsCount (a) || 0;
            var s2 = containsCount (b) || 0;
            return s1 > s2 ? -1 : ((s1 < s2) ? 1 : 0);
		},
        "Selected": function (a,b) {
            var sModel = model.getSelectionModel();
            var sel1 = sModel.contains(model.getIndexedDataPoint (a,keyField));
            var sel2 = sModel.contains(model.getIndexedDataPoint (b,keyField));
            return (sel1 === sel2) ? 0 :  (sel1 === true ? -1 : 1);
        },
        "SelectedDesc": function (a,b) {
            //console.log (a,b);
            var sel1 = model.getSelectedDescendantCount(a);
            var sel2 = model.getSelectedDescendantCount(b);
            return (sel1 === sel2) ? 0 :  (sel1 === undefined ? 1 : (sel2 === undefined ? -1 : (sel1 - sel2)));
        }
	};
    var sortOptionLabels = {"Alpha": $.t("tree.sortAlpha"), "Descendants": $.t("tree.sortDesc"),
        "Selected": $.t("tree.sortSel"), "SelectedDesc": $.t("tree.sortDescSel")};

    this.tooltipString = function () {
        var tooltipStr = "Placeholder";
        return tooltipStr;
    };



    var spaceAllocationOptions = {
        bottomUp: MGNapier.AdaptedD3.bottomUp()
            .sort (null)
            //.value(function(d) { return 1; })// having a value for err value, makes the layout append .value fields to each node, needed when doing bottom-up layouts
            .value(function(d) { return model.getLeafValue (d); }) // having a value for err value, makes the layout append .value fields to each node, needed when doing bottom-up layouts
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
        ,

        bottomUpLog: MGNapier.AdaptedD3.logPartition()
            .sort (null)
            .value (function(d) { return model.getLeafValue (d); })
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
        ,

        topDown: MGNapier.AdaptedD3.topDown()
            .sort (null)
            .value (null)
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
           // .filter (function (d) { return allowedRanks[model.getTaxaData(d)[rankField]]; })
    };
    var spaceAllocationLabels = {"bottomUp": $.t("tree.sizeBottomUp"), "bottomUpLog": $.t("tree.sizeBottomUpLog"), "topDown": $.t("tree.sizeTopDown")};

    function patternFill (nodeId) {
        if (nodeId !== undefined && nodeId.charAt(0) === '*') {
            //return "#000";
            return ("url(#"+patternID+")");
        }
        return null;
    }

    function logSelProp (node) {
        //var containCount = containsCount (node);
        //var sdcount = model.getSelectedDescendantCount(node);
        var containCount = model.getObjectCount (node);
        var sdcount = model.getSelectedObjectCount(node);
        var prop = sdcount > 0 && containCount > 0 ? Math.log (sdcount + 1) / Math.log (containCount + 1) : 0;
        return prop;
    }


    var partitionLayout = {

        cutoffVal: 4,

        sizeBounds: function () {
            return [dims[1], dims[0]];
        },

        booleanSelectedAttrs: function (group) {
            group
                .attr ("class", function(d) { return model.getSelectionModel().contains(d.id) ? "selected" : "unselected"; })
                .attr ("y", function (d) { return d.x; })
                .attr ("x", function (d) { return d.y; })
                .attr("width", function (d) { return d.dy; })
                .attr("height", function (d) { return d.dx; })
            ;
        },

        widthLogFunc: function (d) {
            var node = getNode (d.id);
            return logSelProp (node) * d.dy;
        },

        xFunc: function (d) {
            var node = getNode (d.id);
            var prop = logSelProp (node);
            return d.y + ((1.0 - prop) * d.dy);
        },

        propSharedAttrs: function (group, xFunc, widthFunc) {
            group
                .attr ("class", "holdsSelected")
                .attr ("y", function (d) { return d.x; })
                .attr ("x", xFunc)
                .attr("height", function (d) { return d.dx; })
                .attr("width", widthFunc)
            ;
        },

        sharedTextAttrs: function (sel) {
            function rotate (d, elem) {
                return d.dx > d.dy && elem.getComputedTextLength() < d.dx - 4;
            }

            sel
                .attr ("transform", function (d) {
                    var rot = rotate (d, this);

                    if (rot) {
                        var sl = this.getComputedTextLength();
                        var mg = Math.max (0, (d.dx - sl) / 2);
                        return "translate ("+ (d.y)+","+d.x+") "
                            + " rotate (90 0 0)"
                            + " translate ("+mg+", -"+(d.dy/2)+")"
                        ;
                    } else {
                        return "translate ("+ (d.y)+","+(d.x + Math.max (((d.dx - 14) / 2) + 14, 14))+") " ;
                    }
                })
                .attr ("clip-path", function (d) { return rotate(d, this) ? null : "url(#"+noHashID+"depthclipR0)";})
            ;
        },

        prep: function (coordSet) {
            treeG.attr("transform", "translate(0,0)");
            partitionLayout.makeTextClips (coordSet);
        },

        removeOld: function (exitSel) {
            clearMouseController (exitSel);
            MGNapier.NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
        },

        makeNew: function (enterSel) {
            var newNodes = enterSel
                .append ("svg:g")
                .attr("class", "treeNode")
                .style("opacity", 0)
                .call (mouseController)
            ;

            newNodes.append ("svg:rect")
                .call (partitionLayout.booleanSelectedAttrs)
                .style ("fill", function(d) { return patternFill (d.id); })
            ;

            newNodes.append ("svg:rect")
                .style ("opacity", 0.75)
                .call (partitionLayout.propSharedAttrs, this.xFunc, this.widthLogFunc)
            ;

            newNodes.append ("svg:text")
                .text (function(d) { return model.getLabel (getNode (d.id)); })
                //.style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": textHide; })
                .style ("display", function (d) { return d.dx > 15 && d.dy > 15 ? null: "none"; })
                .call (partitionLayout.sharedTextAttrs)
            ;

            return newNodes;
        },

        redrawExistingNodes: function (group, delay) {
            group.select("rect:not(.holdsSelected)")
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.booleanSelectedAttrs)
            ;

            group.select("rect.holdsSelected")
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.propSharedAttrs, this.xFunc, this.widthLogFunc)
            ;

            group.select("text")
                //.style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": textHide; })
                .style ("display", function (d) { return d.dx > 15 && d.dy > 15 ? null: "none"; })
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.sharedTextAttrs)
            ;
        },

        makeTextClips: function (viewableNodes) {
            var height = svg.node().getBoundingClientRect().height;
            var depths = [];
            for (var n = 0; n < viewableNodes.length; n++) {
                var coord = viewableNodes[n];
                var node = getNode (coord.id);
                if (!depths [node.depth]) {
                    // right, right, right. Because these are text clips I have to offset the clips so they actually show the text
                    // that's what the -20 on y is doing
                    depths [node.depth] = {depth: node.depth, x: coord.y, y: -20, width: coord.dy, height: height + 20}; // y/x swap - horizontal icicle remember
                    //depths [node.depth] = {depth: node.depth, x: node.cd[1], y: 0, width: node.cd[3], height: height}; // y/x swap - horizontal icicle remember
                }
            }
            //VESPER.log ("depths", depths);

            // aaargh, webkit has a bug that means camelcase elements can't be selected
            // which meant I spent a fruitless morning trying to select "clipPath" elements.
            // Instead you have to add a class type to the clipPaths and select by that class.
            // http://stackoverflow.com/questions/11742812/cannot-select-svg-foreignobject-element-in-d3
            // https://bugs.webkit.org/show_bug.cgi?id=83438

            var clipBind = svg
                .select ("defs")
                .selectAll (".napierClipR")
                .data (depths)
            ;


            var sharedClipAttrs = function (group) {
                group
                    .attr ("x", function(d) { return d.x; })
                    .attr ("y", function(d) { return d.y; })
                    .attr ("width", function(d) { return d.width; })
                    .attr ("height", function(d) { return d.height; })
                ;
            };

            clipBind.exit().remove();

            clipBind
                .select ("rect")
                .call (sharedClipAttrs)
            ;

            clipBind.enter()
                .append ("clipPath")
                .attr ("class", "napierClipR")
                .attr ("id", function(d) { return noHashID+"depthclipR"+d.depth; })
                .append ("rect")
                .call (sharedClipAttrs)
            ;
        }
    };

    var sunburstLayout = {

        cutoffVal: 0.05,

        sizeBounds: function () {
            var radius = d3.min(dims) / 2;
            VESPER.log ("DIMS", dims, radius);
            return [2 * Math.PI, radius * radius];
        },

        booleanSelectedAttrs: function (group) {
            group
                 .attr ("class", function(d) { return model.getSelectionModel().contains(d.id) ? "selected" : "unselected"; })
            ;
        },

        propSelectedAttrs: function (group) {
            group.attr ("class", "holdsSelected") ;
        },

        sharedTextAttrs: function (sel) {

            sel
                .attr ("transform", function (d) {
                    var node = getNode (d.id);
                    if (node.depth === 0) {
                        return "translate (0,0)" ;
                    }

                    var ang = (d.x + (d.dx/2)) * (360 / (2 * Math.PI)) - 90;
                    return "rotate ("+ang+" 0 0) "
                        + "translate ("+Math.sqrt(d.y)+",0) "
                    ;
                 })
                .style ("text-anchor", function (d) { return getNode(d.id).depth === 0 ? "middle" : null; })
                .style ("display", function (d) { return d.dx > 0.1 && (Math.sqrt(d.y+ d.dy) - Math.sqrt(d.y)) > 20 ? null: "none"; })
                .attr ("clip-path", function (d) { return "url(#"+noHashID+"depthclip"+getNode(d.id).depth+")";})
            ;
        },

        arc: d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
        ,

        parc: d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) {
                var oRad = Math.sqrt(d.y + d.dy);
                var diff = oRad - Math.sqrt (d.y);
                var node = getNode (d.id);
                var prop = logSelProp (node);
                prop *= prop; // square cos area of ring is square of radius
                return oRad - (prop * diff);
            })
            .outerRadius(function(d) {
                return Math.sqrt(d.y + d.dy);
            })
        ,


        // Stash the old values for transition.
        cstash: function (d) {
            cstore[d.id] = {x0: d.x, dx0: d.dx, y0: d.y, dy0: d.dy};
        },
        pstash: function (d) {
            pstore[d.id] = {x0: d.x, dx0: d.dx, y0: d.y, dy0: d.dy};
        },

        // Interpolate the arcs in data space.
        arcTween: function (a) {
            //VESPER.log ("a", a, a.dx0);
            var cs = cstore [a.id];
            if (cs === undefined) {
                VESPER.log ("No STORE", a.id, a);
            }
            if (cs) {
                var i = d3.interpolate({x: cs.x0, dx: cs.dx0, y: cs.y0, dy: cs.dy0}, a);
                return function(t) {
                    var b = i(t);
                    cs.x0 = b.x;
                    cs.dx0 = b.dx;
                    cs.y0 = b.y;
                    cs.dy0 = b.dy;
                    return sunburstLayout.arc(b);
                };
            }
        },

        parcTween: function (a) {
            //VESPER.log ("a", a, a.dx0);
            var ps = pstore [a.id];
            var i = d3.interpolate({x: ps.x0, dx: ps.dx0, y: ps.y0, dy: ps.dy0}, a);
            return function(t) {
                var b = i(t);
                ps.x0 = b.x;
                ps.dx0 = b.dx;
                ps.y0 = b.y;
                ps.dy0 = b.dy;
                return sunburstLayout.parc(b);
            };
        },

        prep: function (coordSet) {
            treeG.attr("transform", "translate(" + dims[0] / 2 + "," + dims[1] / 2 + ")");
            sunburstLayout.makeTextClips (coordSet);
        },

        removeOld: function (exitSel) {
            clearMouseController (exitSel);
            exitSel
                .transition()
                .delay(0)
                .duration(0)
                .each ("end", function() {
                    var id = d3.select(this).datum().id;
                    cstore[id] = undefined;
                    pstore[id] = undefined;
                })
            ;
            MGNapier.NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
        },

        makeNew: function (enterSel) {

            var newNodes = enterSel
                .append ("svg:g")
                .attr("class", "treeNode")
                .style("opacity", 0)
                 .call (mouseController)
            ;

            newNodes
                .append("path")
                //.attr("display", function(d) { var node = getNode (d.id); return node.depth ? null : "none"; }) // hide inner ring
                .attr("d", sunburstLayout.arc)
                //.attr ("id", function(d) { return "arc"+ d.id; })
                .call (sunburstLayout.booleanSelectedAttrs)
                .style ("fill", function(d) { return patternFill (d.id); })
                .each(sunburstLayout.cstash)
            ;

            newNodes
                .append("path")
                //.attr("display", function(d) { var node = getNode (d.id); return node.depth ? null : "none"; }) // hide inner ring
                .attr("d", sunburstLayout.parc)
                //.attr ("id", function(d) { return "parc"+ d.id; })
                .style ("opacity", 0.75)
                .call (sunburstLayout.propSelectedAttrs)
                .each(sunburstLayout.pstash)
            ;

            newNodes
                .append("svg:text")
                    .text (function(d) { return model.getLabel (getNode (d.id)); })
                    .call (sunburstLayout.sharedTextAttrs)
            ;

            return newNodes;
        },

        redrawExistingNodes: function (group, delay) {
           group
               .select("path:not(.holdsSelected)")
               .call (sunburstLayout.booleanSelectedAttrs)
                .transition()
                .delay (delay)
                .duration(updateDur)
                .attrTween("d", sunburstLayout.arcTween)
                .each ("end", sunburstLayout.cstash)
            ;

            group
                .select("path.holdsSelected")
                .call (sunburstLayout.propSelectedAttrs)
                .transition()
                .delay (delay)
                .duration(updateDur)
                .attrTween("d", sunburstLayout.parcTween)
                .each ("end", sunburstLayout.pstash)
            ;

            var endFunc = function () {
                d3.select(this)
                    .call (sunburstLayout.sharedTextAttrs)
                ;
            };

            group.select("text")
                .style ("display", "none")
                .transition()
                .delay (delay)
                .duration (updateDur)
                .each ("end", endFunc)
            ;
        },

        makeTextClips: function (viewableNodes) {
            //var height = svg.node().getBoundingClientRect().height;
            //var width = svg.node().getBoundingClientRect().width;
            var depths = [];
            for (var n = 0; n < viewableNodes.length; n++) {
                var coord = viewableNodes[n];
                var node = getNode (coord.id);
                if (!depths [node.depth]) {
                    depths [node.depth] = {depth: node.depth, inner: Math.sqrt(coord.y), outer: Math.sqrt(coord.y + coord.dy)};
                }
            }
            //VESPER.log ("depths", depths);

            // aaargh, webkit has a bug that means camelcase elements can't be selected
            // which meant I spent a fruitless morning trying to select "clipPath" elements.
            // Instead you have to add a class type to the clipPaths and select by that class.
            // http://stackoverflow.com/questions/11742812/cannot-select-svg-foreignobject-element-in-d3
            // https://bugs.webkit.org/show_bug.cgi?id=83438

            var clipBind = svg
                .select ("defs")
                .selectAll (".napierClip")
                .data (depths)
            ;

            // hnng. 'r' is related to the difference between inner and outer radii and not just the outer radius
            // this appears to be because the text elements all start at (0,0) and are transformed from there
            // rather than given x,y values as directa attributes
            var sharedClipAttrs = function (group) {
                group
                    .attr ("cx", 0)
                    .attr ("cy", 0)
                    .attr ("r", function(d) { return d.outer - d.inner; })
                ;
            };

            clipBind.exit().remove();

            clipBind
                .select ("circle")
                .call (sharedClipAttrs)
            ;

            clipBind.enter()
                .append ("clipPath")
                .attr ("class", "napierClip")
                .attr ("id", function(d) { return noHashID+"depthclip"+d.depth; })
                .append ("circle")
                .call (sharedClipAttrs)
            ;
        }
    };

    var layoutOptions = {Icicle: partitionLayout, Sunburst: sunburstLayout};
    var layoutOptionLabels = {Icicle:$.t("tree.layoutIcicle"), Sunburst: $.t("tree.layoutSunburst")};

    this.set = function (fields, mmodel) {
        ffields = mmodel.makeIndices ([fields.identifyingField, fields.rankField]);
        keyField = ffields[0];
        rankField = ffields[1];
        //VESPER.log ("FFIELDS", ffields);
        dims = MGNapier.NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };

	
	this.go = function () {
		thisView = this;

        // stop annoying scrollbar even when svg is same height as parent div
        d3.select(divid).style("overflow", "hidden");
        noHashID = divid.substring(1);

        // make patternid unique to view, as having the same id in different views caused problems
        // i.e. the pattern would be regarded as undisplayable in other taxonomies if the view it was first connected to was hidden
        patternID = patternName + noHashID;

		svg = d3.select(divid)
			.append("svg:svg")
			.attr("class", "visContainer")
			.attr("pointer-events", "all")
		;
		
		svg.append ("defs");
        var hatchPattern = svg.select("defs")
            .append("pattern")
            .attr("id", patternID)
        ;
        hatchPattern
            .attr ("x", 0)
            .attr ("y", 0)
            .attr ("width", 4)
            .attr ("height", 4)
            .attr ("patternUnits", "userSpaceOnUse")
            .attr ("viewBox", "0 0 4 4 ")
        ;

        var hatch = [0,2];
        hatchPattern.selectAll("rect").data(hatch)
            .enter()
            .append("rect")
                .attr ("x", function(d,i) { return i * 2; })
                .attr ("y", function(d,i) { return i * 2; })
                .attr ("width", 2)
                .attr ("height", 2)
                .attr ("class", "indHatch")
                .classed ("unselected", true)
        ;

		
		treeG = svg
			.append ("svg:g")
			.attr("class", "treeSVG")
		;

        var vals = model.getSelectionModel().values();
        var root = (vals.length === 1) ? getNode(vals[0]) : self.getRoot(model);
        if (root === undefined) {
            VESPER.log ("no root defined for tree", self.getRoot(model), root, vals);
            return;
        }

        absRoot = root;

        //var spaceAllocs = d3.values(spaceAllocationOptions);
        /*
        for (var n = 0; n < spaceAllocs.length; n++) {
            var indAlloc = spaceAllocs[n];
            //indAlloc.size ([dims[1], dims[0]]);
            //indAlloc.size (partitionLayout.sizeBounds());
        }
        */
        spaceAlloc = spaceAllocationOptions.bottomUpLog;
		curSort = sortOptions.Alpha;
        layout = layoutOptions.Sunburst;

		//depthCharge (root);
        setupControls ();

		this.update ();
	};



    function setupControls () {
        var cpanel = d3.select(divid)
            .append("div")
            .attr ("class", "visControl")
            .attr ("id", noHashID+"controls")
        ;

        VESPER.DWCAHelper.addDragArea (cpanel);

        MGNapier.NapVisLib.makeSectionedDiv (cpanel,
            [{"header":$.t("tree.sizeLabel"), "sectionID":"Space"},{"header":$.t("tree.layoutLabel"), "sectionID":"Layout"},
                {"header":$.t("tree.sortLabel"), sectionID:"Sort"}],
        "section");

        var allocBinds = d3.select(divid+"controlsSpace").selectAll("button.allocChoice")
            .data(d3.entries (spaceAllocationOptions), function(d) { return d.key; });
        var aHolders = allocBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        aHolders.append("input")
            .attr ("class", "allocChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashID+ d.key; })
            .attr ("name", function() { return noHashID+"alloc"; })
            .property ("checked", function(d) { return spaceAlloc === d.value; })
            .on ("change", function(d) {
               // if (spaceAlloc !== d.value) {
                    spaceAlloc = d.value;
                    reroot (curRoot);
                    //thisView.update();
               // }
                return false;
            })
        ;
        aHolders.append("label")
            .attr ("for", function(d) { return noHashID+ d.key; })
            .html (function(d) { return spaceAllocationLabels[d.key]; })
        ;

        var layoutBinds = d3.select(divid+"controlsLayout").selectAll("button.layoutChoice")
            .data(d3.entries (layoutOptions), function(d) { return d.key; });
        var lHolders = layoutBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        lHolders.append ("input")
            .attr ("class", "layoutChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashID+ d.key; })
            .attr ("name", function() { return noHashID+"layout"; })
            .property ("checked", function(d) { return layout === d.value; })
            .on ("change", function(d) {
               // if (layout !== d.value) {
                    layout = d.value;
                    var nodeBind = treeG.selectAll(".treeNode");
					clearMouseController (nodeBind);
                    nodeBind.remove();
                    reroot (curRoot);
               // }
                return false;
            })
            .html (function(d) { return d.key; })
        ;
        lHolders.append ("label")
            .attr("for", function(d) { return noHashID+ d.key; })
            .html (function(d) { return layoutOptionLabels[d.key]; })
        ;

        var sortBinds = d3.select(divid+"controlsSort").selectAll("button.sortChoice")
            .data(d3.entries (sortOptions), function(d) { return d.key; });
        var sHolders = sortBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        sHolders.append ("input")
            .attr ("class", "sortChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashID+ d.key; })
            .attr ("name", function() { return noHashID+"sort"; })
            .property ("checked", function(d) { return curSort === d.value; })
            .on ("change", function(d) {
               // if (layout !== d.value) {
                    curSort = d.value;
                    reroot (curRoot);
               // }
                return false;
            })
            .html (function(d) { return d.key; })
        ;
        sHolders.append ("label")
            .attr("for", function(d) { return noHashID+ d.key; })
            .html (function(d) { return sortOptionLabels[d.key]; })
        ;

        $("#"+noHashID+"controls").draggable();
    }


	function getNode (id) {
        var node = model.getNodeFromID (id);
        if (node == undefined) {
            node = model.getNodeFromID (id.substring(1));
        }
        return node;
    }

    function containsCount (node) {
        var cc = (model.getDescendantCount(node) || 0);// + (model.getSynonymCount(node) || 0);
        if (!cc) {
            var specs = model.getSpecimens(node);
            if (specs) {
                cc = specs.length;
            }
        }
        return cc;
    }


    function reroot (root) {
        if (firstLayout) {
            if (VESPER.alerts) { alert ("about to calc layout"); }
            firstLayout = false;
        }

        spaceAlloc
            .size (layout.sizeBounds())
            .cutoff (layout.cutoffVal)
			.sort (curSort)
        ;
        VESPER.log ("what alloc reports ",spaceAlloc.size());
        VESPER.log ("root", root);
        var coordSet = spaceAlloc.nodes (root);
        VESPER.log (coordSet.length, coordSet);
        curRoot = root;

        var nodeBind = treeG
            .selectAll(".treeNode")
            .data(coordSet, function(d) { return d.id /*d[DWCAParser.TDATA][keyField]*/; })
        ;

        layout.prep (coordSet);

        // remove old nodes
        layout.removeOld (nodeBind.exit());
        var cumDelay = (nodeBind.exit().empty() ? 0 : exitDur);

        // process existing nodes
        layout.redrawExistingNodes (nodeBind, cumDelay);
        cumDelay += (nodeBind.empty()) ? 0 : updateDur;

        // add new nodes
        var newNodes = layout.makeNew (nodeBind.enter());
        //VESPER.log (newNodes);
        MGNapier.NapVisLib.d3fadeInNewGroups ([newNodes], enterDur, cumDelay);
    }


	this.update = function () {
        var vals = model.getSelectionModel().values();
        var root = (vals.length === 1) ? getNode(vals[0]) : self.getRoot(model);
        VESPER.log ("Root", root, vals[0]);

        model.countSelectedDesc (self.getRoot(model), keyField);
        root = firstBranch (self.getRoot(model));
        reroot (root);
	};


    this.getRoot = function (mod) {
        return mod.getImplicitRoot();
    };

    this.updateVals = this.update;


    // calculate suitable root for vis
    // suitable root is first node who has more than one child either holding selected descendants or is selected
    function firstBranch (node) {
        var nid = model.getIndexedDataPoint (node, keyField);
        if (!model.getSelectedDescendantCount(node) || model.getSelectionModel().contains (nid)) {
            return node;
        }
        var children = model.getSubTaxa (node);
        if (children) {
            var splitCount = 0;
            var singleNode;
            for (var n = 0; n < children.length; n++) {
                var child = children[n];
                var cid = model.getIndexedDataPoint (child, keyField);
                if (model.getSelectionModel().contains (cid)) {
                    splitCount++;
                }
                else if (model.getSelectedDescendantCount(child) > 0) {
                    splitCount++;
                    singleNode = child;
                }
            }
            // is a split if more than one child is selected or has selected descendants, so make root here
            if (splitCount > 1) {
                return node;
            }

            // if just one child holds selected descendants (and isn't selected itself, guaranteed by else if above) then pursue that path recursively
            if (singleNode) {
                node = firstBranch (singleNode);
            }
            /*
            else {
                node = node; // otherwise return the current node (parent to single selected node)
            }
            */
        }
        return node;
    }


    this.redraw = function () {
        var nodes = treeG.selectAll(".treeNode");
        layout.redrawExistingNodes (nodes, 0);
    };


    this.destroy = function () {
        clearMouseController (treeG.selectAll(".treeNode"));
        treeG.selectAll(".treeNode").remove();
        $(divid+"controls").draggable("destroy");
        model.removeView (self);
        // null model and roots, basically any var that points to the data. Help GC along.
        // Google chrome profiler says it does so ner
        model = null;
        absRoot = null;
        curRoot = null;
        cstore = {};
        pstore = {};

        VESPER.DWCAHelper.twiceUpRemove(divid);
    };


    function clearMouseController (group) {
        group
            .on ("click", null)	// remove event handler
            .on ("mouseover", null)	// remove event handler
            .on ("mouseout", null)	// remove event handler
            .on ("contextmenu", null) // remove event handler
        ;
    }

	function mouseController (group) {
        group
        .on("click", function (d) {
            var node = getNode (d.id) /*d*/;
            reroot ((node === curRoot && node.parent != undefined) ? node.parent : node);
        })
        .on("mouseover", function(d) {
            d3.select(this).selectAll("*").classed("highlight", true);
            //handle mouse over
            var node = getNode (d.id) /*d*/;
            var val = self.tooltipString (node, model, ffields);
            VESPER.tooltip.updateText (model.getLabel(node), val);
            VESPER.tooltip.updatePosition (d3.event);
        })
        .on ("mouseout", function() {
            d3.select(this).selectAll("*").classed("highlight", false);
        })
        .on("contextmenu", function(d) {
            //handle right click
            selectSubTree (getNode (d.id));
            //stop showing browser menu
            d3.event.preventDefault();
        });

    }

    function selectSubTree (node) {
        model.getSelectionModel().clear();
        var ids = [];
        selectSubTreeR (node, ids, true);
        model.getSelectionModel().addAllToMap(ids);
    }

    function selectSubTreeR (node, ids, recurse) {
        //var id = model.getTaxaData(node)[keyField];
        var id = model.getIndexedDataPoint (node, keyField);
        ids.push(id);

        var taxa = model.getSubTaxa (node);
        if (taxa) {
            for (var n = taxa.length; --n >= 0;) {
                selectSubTreeR (taxa[n], ids, recurse);
            }
        }
        var specs = model.getSpecimens (node);
        if (specs) {
            for (var n = specs.length; --n >= 0;) {
                selectSubTreeR (specs[n], ids, recurse);
            }
        }
        var syns = model.getSynonyms (node);
        if (syns) {
            for (var n = syns.length; --n >= 0;) {
                selectSubTreeR (syns[n], ids, false);
            }
        }
    }

    /*
	function reset() {
		d3.event.scale = 1.0;
		d3.event.translate = [0,0];
		zoomObj.translate([0,0]).scale(1);
		//redraw ();
	}
	*/
};

VESPER.ImplicitTaxonomy = function (div) {
    var tree = new VESPER.Tree (div);
    tree.type = "impTree";
    tree.getRoot = function (mod) {
        return mod.getImplicitRoot();
    };
    tree.tooltipString = function (node, model, ffields) {
        console.log ("tooltip node", node);
        var desc = model.getDescendantCount (node);
        var sdesc = model.getSelectedDescendantCount(node);
        var subt = model.getSubTaxa(node);

        var tooltipStr = "";

        for (var n = 0; n < ffields.length; n++) {
            if (ffields[n]) {
                tooltipStr += ((n > 0) ? "<br>" : "")+ffields[n].fieldType+": "+model.getIndexedDataPoint (node, ffields[n]);
            }
        }

        tooltipStr += (subt === undefined ? "" : "<hr>"+$.t("tree.taxaTooltip", {count: desc}))
            + (sdesc > 0 ?
                (subt === undefined ? "" : "<br>"+$.t("tree.taxaSelTooltip", {count: sdesc}))
            : "")
        ;

        var synCount = model.getSynonymCount (node);
        if (synCount) {
            tooltipStr+="<hr>"+$.t("tree.synTooltip", {count: synCount});
            var synSelCount = model.getSelectedSynonymCount (node);
            if (synSelCount) {
                tooltipStr+="<br>"+$.t("tree.synSelTooltip", {syn: synSelCount});
            }
        }

        var syn = model.getSynonyms(node);
        if (syn) {
            tooltipStr += "<hr><i>"+$.t("tree.synLabel")+"</i>";
            for (n = 0; n < syn.length; n++) {
                var id = model.getIndexedDataPoint(syn[n], ffields[0]);
                var klass = model.getSelectionModel().contains (id) ? "selected" : "";
                tooltipStr += "<br><span class=\""+klass+"\">" + id+"</span>: "+model.getLabel (syn[n]);
            }
        }

        return tooltipStr;
    };
    return tree;
};

VESPER.ExplicitTaxonomy = function (div) {
    var tree = new VESPER.Tree (div);
    tree.type = "expTree";
    tree.getRoot = function (mod) {
        return mod.getExplicitRoot();
    };
    tree.tooltipString = function (node, model, ffields) {
        console.log ("tooltip node", node);
        var specs = model.getSpecimens(node);
        var tooltipStr = "";
        var limit = 10;

        for (var n = 0; n < ffields.length; n++) {
            if (ffields[n]) {
                tooltipStr += ((n > 0) ? "<br>" : "")+ffields[n].fieldType+": "+model.getIndexedDataPoint (node, ffields[n]);
            }
        }

        var specCount = model.getSpecimenCount(node);
        if (specCount) {
            tooltipStr += "<hr>"+$.t("tree.specTooltip", {count: specCount});
            var SspecCount = model.getSelectedSpecimenCount (node);
            if (SspecCount) {
                tooltipStr += "<br>"+$.t("tree.specSelTooltip", {count: SspecCount});
            }
        }

        // specimens directly attached to node
        if (specs) {
            tooltipStr += "<hr><i>"+$.t("tree.specLabel")+"</i>";
            for (n = 0; n < Math.min(specs.length, limit); n++) {
                var spec = specs[n];
                var id = model.getIndexedDataPoint(spec, ffields[0]);
                var klass = model.getSelectionModel().contains (id) ? "selected" : "";
                tooltipStr += "<br><span class=\""+klass+"\">" + id+"</span>, "+model.getLabel(spec);
            }
            if (specs.length - limit > 0) {
                tooltipStr += "<br>"+$.t("tree.andMore", {count: specs.length - limit});
            }
        }

        return tooltipStr;
    };


    return tree;
};
VESPER.tooltip = new function () {
    this.holdDuration = 10000;
    this.fadeDuration = 200;
    var self = this;

    this.init = function () {
        var tooltip = d3.select("body").selectAll("#vesperTooltip").data([0])
            .enter()
            .append("div")
                .attr ("id", "vesperTooltip")
                .attr ("class", "vesperTooltip")
                .style ("visibility", "hidden")
        ;
        tooltip.append("h2");
        tooltip.append("p");
    };

    this.setToFade = function () {
        var tooltip = d3.select("#vesperTooltip");
        tooltip
            .transition()
            .duration (self.fadeDuration)
            .style ("opacity", 0)
            .each ("end", function () {
                d3.select(this).style ("visibility", "hidden");
            })
        ;
    };

    this.updateText = function (title, str) {
        var tooltip = d3.select("#vesperTooltip");
        tooltip.select("h2").text(title);
        tooltip.select("p").html(str);
        tooltip
            .transition()
            .style ("visibility", "visible")
            .style ("opacity", null)
            .transition()
            .duration(self.holdDuration)
            .each ("end", function() {
                self.setToFade ();
            })
        ;
    };

    this.updatePosition = function (e) {
        var tooltip = d3.select("#vesperTooltip");
        tooltip
            .style ("top", (e.pageY+10)+"px")
            .style ("left", (e.pageX+10)+"px")
        ;
     };

    return this;
}();
/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 02/10/13
 * Time: 16:05
 * To change this template use File | Settings | File Templates.
 */

VESPER.VisLauncher = function (divid, options) {

    var model;
    var self = this;
    var keyField, dims, choiceData;

    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        choiceData = fields.visChoiceData;
        dims = MGNapier.NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };


    this.go = function () {
        var buttonVisBlockSel = d3.select(divid);
        setVisChoices (choiceData);
        showButtons (buttonVisBlockSel);
        setSelectionOps ();
        setModelCompareOps ();

        $(function() {
            $(divid).accordion({
                heightStyle: "content",
                collapsible: true
            });
        });

        if (options && options.autoLaunch === "on") {
            for (var n = 0; n < choiceData.length; n++) {
                var visData = choiceData[n];
                if (isVisDoable(visData) && isVisDataDependent(visData)) {
                    self.makeVis (visData, model);
                }
            }
        }
    };

    this.update = function () {};

    this.updateVals = this.update;


    function isVisDoable (visData) {
        var indices = model.makeIndices (visData.attList);
        var nullCount = MGNapier.NapVisLib.countNulls (indices);
        return (indices.length === 0 || (visData.matchAll && nullCount === 0) || (!visData.matchAll && nullCount < indices.length));
    }

    function isVisDataDependent (visData) {
        var indices = model.makeIndices (visData.attList);
        return (indices.length > 0);
    }

    function setVisChoices (data) {
       // MGNapier.NapVisLib.makeSectionedDiv (d3.select(divid), [{"header":"Launch Visualisation", "sectionID":"Vis", "init":"none"}], "encloser");
        d3.select(divid).append("H3").text($.t("launcher.launchHeader"));
       // var visChoices = d3.select(divid).select(divid+"Vis").selectAll("button").data (data);
        var visChoices = d3.select(divid).append("div").attr("id", divid+"Vis").selectAll("button").data (data);

        var buttons = visChoices.enter()
            .append ("button")
            .attr ("class", "visChoice")
            .attr ("type", "button")
            .on ("click", function(d) {
                self.makeVis (d, model);
                return false;
            })
        ;

        buttons.append ("img")
                .attr("src", function(d) { return d.icon || d.image; })
                .attr ("class", "vesperIcon")
        ;

        buttons.append ("span")
            .text (function(d) { return VESPER.titles [d.type]; })
        ;
    }

    function setSelectionOps () {
        d3.select(divid).append("H3").text($.t("launcher.selectHeader"));
        var encloser = d3.select(divid).append("div").attr("id", divid+"Sel");

        encloser.append("button")
            .attr ("type", "button")
            .text ($.t("launcher.selectSave"))
        ;

        if (window.requestFileSystem) {
            encloser.select("button")
                .on ("click", function() {
                    MGNapier.NapVisLib.prepareForWrite (MGNapier.NapVisLib.writeArray, model.getSelectionModel().values());
                })
            ;
        } else {
            MGNapier.NapVisLib.html5LacksOnButton(encloser.select("button"), $.t("launcher.noFileWriter"));
        }


        encloser.append("button")
            .attr ("type", "button")
            .text ($.t("launcher.selectInvert"))
            .on ("click", function() {
                model.invertSelection ();
            })
        ;

        encloser.append("button")
            .attr ("type", "button")
            //.attr ("id", "clearSel")
            .text ($.t("launcher.selectClear"))
            .on ("click", function() {
                model.getSelectionModel().clear();
                model.getSelectionModel().update();
            })
        ;

        encloser.selectAll("button").style("display", "block").attr("class", "safetyGap");
    }



    function setModelCompareOps () {
        d3.select(divid).append("H3").text($.t("launcher.compareHeader"));
        var encloser = d3.select(divid).append("div").attr("id", divid+"TComp");
        var basicText = $.t("launcher.compareLabel");

        encloser.append("button")
            .attr ("type", "button")
            .attr ("class", "compareVesperModel")
            .text (basicText)
            .on ("click", function() {
                VESPER.modelBag.push ({"model":model});
                VESPER.log ("ModelBag", VESPER.modelBag);
                if (VESPER.modelBag.length > 1) {
                    VESPER.modelComparisons.modelCoverageToSelection(VESPER.modelBag[0].model, VESPER.modelBag[1].model,
                        VESPER.modelBag[0].model.getMetaData().vesperAdds.nameLabelField,
                        VESPER.modelBag[1].model.getMetaData().vesperAdds.nameLabelField
                    );
                    VESPER.modelBag.length = 0;
                    d3.selectAll("button.compareVesperModel")
                        .classed ("taxonomyCompareActive", false)
                        .text (basicText)
                    ;
                } else {
                    var curButtonSel = d3.select(this);
                    curButtonSel.classed ("taxonomyCompareActive", true);
                    d3.selectAll("button.compareVesperModel").filter("*:not(.taxonomyCompareActive)").text (basicText+" to "+model.name); // smart alec way using css conditional selectors
                    //d3.selectAll("button.compareVesperModel").text (basicText+" to "+model.name);
                    //curButtonSel.text (basicText);
                }
            })
        ;

        encloser.selectAll("button").style("display", "block");
    }



    function showButtons (divSel) {
        var visChoices = divSel.selectAll("button.visChoice");
        visChoices.style("display", function(d) {
            var allowed = isVisDoable (d);
            return allowed ? "block" : "none";
        });
    }

    this.makeVis = function (details, aModel) {
        var id = aModel.name + "view" + (details.multiple ? aModel.getNextSessionModelViewID() : "");
        id = id.replace(/\s+/g, '');    // Spaces not allowed in html5 ID's
        var title = VESPER.titles [details.type];
        var vid = title + " " + aModel.name;

        if (d3.select("#"+id).empty()) {
            var newDiv = d3.select("#allVisDiv")
                .append("div")
                .attr("class", "visWrapper")
                .attr ("id", id+"container")
                .style("width", details.width ? details.width : "50%")
            ;

            var topBar = newDiv.append("div").attr("class","dragbar").attr("id", id+"dragBar");
            var buttonSpan = topBar.append("div").attr("class", "buttonBank");
            topBar.append("div").attr("class", "visTitle").text(vid);

            /*var indVisDiv = */newDiv.append("div").attr("class", "vis").attr("id", id).style("height", details.height != "null" ? details.height : "100%");

            var coreType = aModel.getMetaData().coreRowType;
            var fileData = aModel.getMetaData().fileData;
           // var coreFieldIndex = fileData[coreType].filteredFieldIndex;

            var newVis = details.newVisFunc ("#"+id);
            VESPER.log ("newvis", newVis, newVis.set);
            var fields = details.setupFunc () || {};
            var keyFieldName = fileData[coreType].filteredInvFieldIndex [VESPER.DWCAParser.getFilteredIdIndex (aModel.getMetaData())];
            fields.identifyingField = keyFieldName;
            newVis.set (fields, aModel);
            aModel.addView (newVis);
            newVis.go (aModel);


            addHideShowButton (buttonSpan, "#"+id);
            addKillViewButton (buttonSpan, newVis);
            $("#"+id+"container").draggable({ handle: "div.dragbar"});
        }
    };

    // where and div are d3 single selections, view is a view object
    function addKillViewButton (where, view) {
        where.append("button")
            .attr("type", "button")
            .on ("click", function() {
                if (view && view.destroy) { view.destroy(); }
                d3.select(d3.event.target).on ("click", null); // remove event from this very button to avoid dom holding refs to data
            } )
            .attr ("title", $.t("launcher.closeTooltip"))
            .append ("img")
            .attr ("src", VESPER.imgbase+"close.png")
            .attr ("alt", "Close")
        ;
    }

    function addHideShowButton (where, toggleThisID) {
        var initPoly = "1,1 12,1";
        where.append("button")
            .attr("type", "button")
            .on ("click", function() {
                var vdiv = d3.select(toggleThisID);
                var dstate = vdiv.style("display");
                //dstate is current vis display state, not the one we are switching it into...
                vdiv.style("display", dstate === "none" ? null : "none");
                //var svg = d3.select(this).select("svg polygon");
                d3.select(this).select("svg polygon")
                    .attr("points", dstate === "none" ?
                         initPoly : "1,1 12,1 12,12 1,12"
                );
            } )
            .attr ("title", $.t("launcher.hideTooltip"))
            .append("svg")
            .attr ("width", 14)
           // .attr ("height", 13)
                .append("polygon")
                .attr("points", initPoly)
                .attr("class", "showHideColours")
        ;
    }


    this.destroy = function () {
        var vizzes = model.getSelectionModel().getVis();
        for (var n = 0; n < vizzes.length; n++) {
            if (vizzes[n] !== self) {
                if (vizzes[n].destroy) {
                    vizzes[n].destroy ();
                }
                model.removeView (vizzes[n]);
            }
        }

        // remove model from modelbag if it's in there, memory leak if we don't
        var modelIndex = $.inArray (model, VESPER.modelBag);
        if (modelIndex >= 0) {
            // supersafe and redundant code
            VESPER.modelBag[modelIndex] = undefined;
            VESPER.modelBag = VESPER.modelBag.splice (modelIndex, 1);
            VESPER.modelBag.length = 0;
        }

        VESPER.DWCAHelper.recurseClearEvents (d3.select(divid));

        model.removeView (self);
        model.getSelectionModel().clear();
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divid);
    };

};
