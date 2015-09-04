VESPER.DWCAParser = new function () {

    this.TDATA = 0;     // taxa data, essentially the selected data from the core data file in the DWCA for each record/taxon
    this.TAXA = 1;      // taxa, i.e. in a taxonomy, the children of the current taxon
    this.EXT = 2;       // extra data, i.e. non-core data attachments
    this.SYN = 3;       // synonyms
    this.PID = 4;       // used when building explicit taxonomies, i.e. ones from name paths, quick ref to parent id;

    this.SPECS = "s";


    this.DCOUNT = "dct";
    this.SYNCOUNT = "syct";
    this.SPECCOUNT = "spct";

    this.SEL_DCOUNT = "Sdct";
    this.SEL_SYNCOUNT = "Ssyct";
    this.SEL_SPECCOUNT = "Sspct";


    /*
    this.DCOUNT = 6;
    this.SYNCOUNT = 8;
    this.SPECCOUNT = 10;

    this.SEL_DCOUNT = 7;
    this.SEL_SYNCOUNT = 9;
    this.SEL_SPECCOUNT = 11;
    */

    this.SUPERROOT = "superroot";
    var superrootID = "-1000";

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
            "individualID":"organismID",
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
            "higherTaxonName":"higherClassification",
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
    this.GBIFRanks = ["domain", "kingdom", "subkingdom", "superphylum", "phylum", "subphylum", "superclass", "class", "subclass", "supercohort",
        "cohort", "subcohort", "superorder", "order", "suborder", "infraorder", "superfamily", "family", "subfamily", "tribe", "subtribe",
        "genus", "subgenus", "section", "subsection", "series", "subseries", "speciesAggregate", "species", "subspecificAggregate", "subspecies",
        "variety", "subvariety", "form", "subform", "cultivarGroup", "cultivar", "strain"];
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
        "http://www.w3.org/ns/oa#Annotationt" : "W3 Annotation",
        "http://rs.gbif.org/terms/1.0/Multimedia" : "Multimedia"
    };


    this.rowTypeDefaults = {};
    this.fieldAttrNames = {};
    this.xsd = null;

    this.loadxsd = function (xsdFile) {
        return $.get(xsdFile, function(d){
            // stupid firefox reads in a BOM mark (probably stupid me somewhere else, but I ain't got time)
            //if (d.charCodeAt(0) > 65000 || d.charCodeAt(0) === 255) {
            //    d = d.slice(2);
            //}
            VESPER.log ("LOADED XSD", d, typeof d);
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



    function cleanUpUnzippedDataRefs (zip, mdata, selectedStuff, fileRows) {
        // Aid GC by removing links to data from outside DWCAParse i.e. in the zip entries
        VESPER.log ("SELECTED STUFF", selectedStuff, fileRows);
        $.each (selectedStuff, function (key) {
            var fileDatum = mdata.fileData[key];
            var fileName = zip.dwcaFolder + fileDatum.fileName;
            // the two properties below are pointing to the same data, need rid of both
            zip.zipEntries.getLocalFile(fileName).uncompressedFileData = null; // Remove link from zip
            fileRows[fileDatum.fileName].length = 0;
            fileRows[fileDatum.fileName] = null;
        });
        zip.zipEntries.reader.stream = null;    // clear compressed zip data

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
            var fileDatum = mdata.fileData[key];
            var fileName = zip.dwcaFolder + fileDatum.fileName;
            var readFields = MGNapier.NapVisLib.newFilledArray (fileDatum.invFieldIndex.length, false);

            $.each (value, function (key, value) {
                readFields [fileDatum.fieldIndex[key]] = value;
            });

            //VESPER.log ("readFields", readFields);
            VESPER.DWCAZipParse.set (fileDatum, readFields);
            streamFunc.callbackQ = [];
            streamFunc.fileName = fileName;
            //var ii = i; // copy i otherwise it might(will) change before we run onLoad; Not needed now i is incremented in the callback itself

            var onLoad = function () {
                fileRows[fileDatum.fileName] = zip.zipEntries.getLocalFile(fileName).uncompressedFileData;
                VESPER.DWCAParser.updateFilteredLists (fileDatum, readFields, zip.zipEntries.getLocalFile(fileName));

                // final file dealt with
                if (i === entries.length - 1) {
                    // make taxonomy (or list)
                    doneCallback (new VESPER.DWCAModel (mdata, VESPER.DWCAParser.setupStrucFromRows (fileRows, mdata)));
                    cleanUpUnzippedDataRefs (zip, mdata, selectedStuff, fileRows);
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
	this.jsonTaxaObj2JSONTree = function (jsonObj, tsvData, fileDatum, metaData) {
        var fieldIndexer = fileDatum.filteredFieldIndex;
        var idx = fileDatum.idIndex;
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
		var sroot = this.createSuperroot (jsonObj, roots, fileDatum, metaData, fieldIndexer);
		VESPER.log ("roots", roots);
	
		VESPER.log ("JSON", jsonObj[1], jsonObj);
		return {"tree":jsonObj, "root":sroot}; // basically the record set here is the tree (taxonomy)
	};

    function isSynonym (id, aid) {
       return (id !== aid && aid !== undefined);
    }


    // This uses explicit id linking in the dwca file i.e. kingdom, order, family, specificEpithet etc data
    // Make a taxonomy from the explicitly declared ranks
    this.jsonTaxaObj2ExplicitJSONTree = function (jsonObj, tsvData, fileDatum, metaData, addOriginalTo) {
        addFieldToIndices (fileDatum, "taxonRank");

        var idx = fileDatum.idIndex;
        var fieldIndexer = fileDatum.filteredFieldIndex;
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
        VESPER.log ("tsvdata", tsvData, tsvData[0], tsvData[1]);

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
                //var path = [];

                for (var r = 0; r < rLen; r++) {
                    var rank = rankList[r];
                    var rankField = rankFields[r];

                    if (rankField) {
                        var val = rec[rankField];
                        //path[r] = val;

                        if (val) {
                            // if specificEpithet or infraSpecificEpithet, beef up name with previous strings from genus or species
                            if (addLastNameTo[r] && lastData) {
                                val = lastData[this.TDATA][nameField]+" "+val;
                            }

                            var id = val;   // id is normally the name unless there's a name clash

                            // test if this name has already been attached to something that wasn't the last rank used here
                            // this indicates the same name being used at different points in the taxonomy, i.e. two genus's called "Carex" under different families
                            // it's perfectly valid, but it knackers a simple id scheme
                            if (treeObj[id] /*&& lastData*/) {  // commented out lastData as this caused error when taxa name was reused and had no parent
                                var lid = lastData ? lastData[this.TDATA][idx] : superrootID;   // instead make the last id superrootid if no lastData
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
                                obj[this.PID] = (lastData ? lastData[this.TDATA][idx] : superrootID);
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
        var sroot = this.createSuperroot (treeObj, roots, fileDatum, metaData, fieldIndexer);
        VESPER.log ("roots", roots);

        VESPER.log ("json", jsonObj, "tree", treeObj);
        VESPER.log ("root", sroot);
        return {"tree":treeObj, "root":sroot};
    };



    function addFieldToIndices (fileDatum, fieldName) {

        if (fileDatum.filteredFieldIndex[fieldName] == undefined) {
            var addAtIndex = fileDatum.filteredInvFieldIndex.length;
            fileDatum.filteredInvFieldIndex.push (fieldName);
            fileDatum.filteredFieldIndex[fieldName] = addAtIndex;

            // add to unfiltered indices. Shouldn't need this, but better safe than sorry.
            addAtIndex = fileDatum.invFieldIndex.length;
            fileDatum.invFieldIndex.push (fieldName);
            fileDatum.fieldIndex[fieldName] = addAtIndex;

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



	this.getFileRowName = function (metaData, isCore, extIndex) {
        var fdata = this.getFileDatum (metaData, isCore, extIndex);
        return fdata ? fdata.fileName : undefined;
    };
	
	
	this.makeTreeFromAllFileRows = function (fileRows, metaData) {
		var rowDescriptors = metaData.fileData;
		var coreFileDatum = this.getFileDatum(metaData, true);    //rowDescriptors[metaData.coreRowType];
        var rawData = fileRows[coreFileDatum.fileName];
        var jsonObj = this.occArray2JSONArray (rawData, coreFileDatum.idIndex);

        var impTree;
        var expTree;

        var impTreePoss = VESPER.DWCAHelper.fieldListExistence (metaData, VESPER.DWCAParser.neccLists.impTaxonomy, true, undefined, true, true);
        var expTreePoss = VESPER.DWCAHelper.fieldListExistence (metaData, VESPER.DWCAParser.neccLists.expTaxonomy, false, 2, true, true);
        VESPER.log ("TREE POS", impTreePoss, expTreePoss);
        VESPER.log ("MDR", metaData.coreRowType);
		//if (MGNapier.NapVisLib.endsWith (metaData.coreRowType, "Taxon")) {
        if (impTreePoss.match) {
			impTree = this.jsonTaxaObj2JSONTree (jsonObj, rawData, coreFileDatum, metaData);
		}
        if (expTreePoss.match) {
            expTree = this.jsonTaxaObj2ExplicitJSONTree (jsonObj, rawData, coreFileDatum, metaData,
                VESPER.DWCAParser.addOriginalAsSpecimenEntry
            );
		}

        var jsoned = {"records": jsonObj, "impTree":impTree, "expTree":expTree};

		for (var indRowDescriptorProp in rowDescriptors) {
			if (rowDescriptors.hasOwnProperty (indRowDescriptorProp)) {
				var indRowDescriptor = rowDescriptors[indRowDescriptorProp];
                if (indRowDescriptorProp !== "core" && indRowDescriptor.selected) {
                    var unreconciled = this.addExtRows2JSON (jsoned.records, fileRows[indRowDescriptor.fileName], indRowDescriptor);
                    VESPER.log ("unreconciled in ",indRowDescriptorProp, unreconciled);
                }
			}
		}

		return jsoned;
	};
	

	
	this.setupStrucFromRows = function (fileRows, metaData) {

		var struc = this.makeTreeFromAllFileRows (fileRows, metaData);
        if (VESPER.alerts) { alert ("mem monitor point 2"); }

        if (struc.impTree && struc.impTree.root) {
            VESPER.log ("root", struc.impRoot);
            this.recursiveCount (struc.impTree.root, this.DCOUNT, undefined, 1);
            this.recursiveCount (struc.impTree.root, this.SYNCOUNT, VESPER.DWCAParser.SYN, 0);
        }

        if (struc.expTree && struc.expTree.root) {
            this.recursiveCount (struc.expTree.root, this.DCOUNT, undefined, 1);
            this.recursiveCount (struc.expTree.root, this.SPECCOUNT, VESPER.DWCAParser.SPECS, 0);
        }

        VESPER.log ("STRUC", struc);

        if (VESPER.alerts) { alert ("mem monitor point 3"); }
        VESPER.log ("root", struc.impTree, struc.expTree);
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
	
	
	this.createSuperroot = function (jsonObj, roots, fileDatum, metaData, fieldIndexer) {
		if (roots.length === 0) {
			return undefined;
		}
		
		if (roots.length === 1) {
            //jsonObj[superrootID] = jsonObj[roots[0]];
			return jsonObj[roots[0]];
		}

        //var idName = fileData.invFieldIndex[fieldIndexer["id"]];
        var idName = fileDatum.invFieldIndex[fileDatum.idIndex];
		var hidx = fieldIndexer["parentNameUsageID"];
		var srFields = {
            //id: superrootID,
            acceptedNameUsageID: superrootID,
            parentNameUsageID: superrootID,
            acceptedNameUsage: VESPER.DWCAParser.SUPERROOT,
            taxonRank: VESPER.DWCAParser.SUPERROOT,
            nameAccordingTo: "dwcaParse.js"
		};
        srFields[metaData.vesperAdds.nameLabelField.fieldType] = VESPER.DWCAParser.SUPERROOT;
        srFields[idName] = superrootID;
        VESPER.log ("SR", srFields);


		var srObj = {};
	
		srObj[this.TAXA] = [];
		for (var n = 0; n < roots.length; n++) {
			srObj[this.TAXA].push (jsonObj[roots[n]]);	// add root as child taxon of superroot
			jsonObj[roots[n]][VESPER.DWCAParser.TDATA][hidx] = superrootID;	// make superroot parent taxon of root
		}
		
		srObj[VESPER.DWCAParser.TDATA] = [];
		for (var prop in srFields) {
			if (srFields.hasOwnProperty (prop)) {
                if (fieldIndexer[prop] !== undefined) {
				    srObj[VESPER.DWCAParser.TDATA][fieldIndexer[prop]] = srFields[prop];
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

        var arr = taxon[this.TAXA];
        if (arr) {
            for (var n = arr.length; --n >= 0;) {
                c += this.recursiveCount (arr[n], storeField, countField, inc);
            }
        }
        c += (countField && taxon[countField] ? taxon[countField].length : 0);

        if (c || taxon[storeField]) {
            taxon[storeField] = c;
        }

        return c + inc;
    };


	
	this.parseMeta = function (theXML) {
		var fileData = {};

		var coreRowType = this.getCoreRowType (theXML);
		//fileData[coreRowType] = this.parseCore (theXML, coreRowType);
        fileData["core"] = this.parseCore (theXML, coreRowType);

		var extRowTypes = this.getExtensionRowTypes (theXML);
		for (var n = 0; n < extRowTypes.length; n++) {
			//fileData [extRowTypes[n]] = this.parseExtension (theXML, extRowTypes[n], n);
            fileData["ext"+n] = this.parseExtension (theXML, extRowTypes[n], n);
		}

		var metaData = {"fileData":fileData, "vesperAdds":{}};

        var coreFileDatum = this.getFileDatum (metaData, true);
        if (coreFileDatum == undefined) {
            metaData.error = $.t("parser.missingCoreError");
        }
        else if (coreFileDatum.error) {
            metaData.error = coreFileDatum.error;
        }
        console.log ("metaData", metaData);
		return metaData;
	};

    this.getFileDatum = function (metaData, isCore, extIndex, rowType) {
        if (metaData) {
            if (isCore) {
                return metaData.fileData["core"];
            } else {
                return metaData.fileData["ext"+extIndex];
            }
        }
        return undefined;
    };

    /*
    this.getFileDataOld = function (metaData, rowType) {
        if (metaData) {
            return metaData.fileData[rowType];
        }
        return undefined;
    };
    */

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

            var fileDatum = {};
            var fileNames = ffrag.find('files location').contents();

            if (fileNames[0] !== undefined) {
                fileDatum.fileName = fileNames[0].data;

                fileDatum.rowType = rowType;
                fileDatum.mappedRowType = this.recordURIMap [rowType] || rowType;
                for (var attrName in this.rowTypeDefaults) {
                    if (this.rowTypeDefaults.hasOwnProperty (attrName)) {
                        // AARGH. Remember, there is a difference between something being undefined and an empty value.
                        // Both equate to false, but only one (attribute is undefined) says there is no
                        // such attribute there and we should fall back to the default.
                        // The other, the attribute has been given an empty value, means the value is empty and we should use that, not the default.
                        // Caused Error. Grrrr.
                        //if (ffrag.attr(attrName) === undefined)
                        fileDatum[attrName] = (ffrag.attr(attrName) !== undefined ? ffrag.attr(attrName) : this.rowTypeDefaults[attrName]);
                        VESPER.log ("att", attrName, "#", fileDatum[attrName], "#");
                    }
                }
                VESPER.log (ffrag.attr("fieldsEnclosedBy"));


                var idIndex = +ffrag.find(idAttrName).attr('index'); // '+' makes it a number not a string
                fileDatum.idIndex = idIndex;
                var fields = ffrag.find('field');

                VESPER.log ("fieldsTerminatedBy", fileDatum.fieldsTerminatedBy);

                fileDatum.fieldIndex = {}; fileDatum.invFieldIndex = [];
                fileDatum.fieldData = {};
                fileDatum.fieldIndex[idAttrName] = idIndex;
                fileDatum.invFieldIndex[idIndex] = idAttrName;
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
                        fileDatum.fieldIndex[fieldName] = index;
                        fileDatum.invFieldIndex[fileDatum.fieldIndex[fieldName]] = fieldName;
                    }

                    fileDatum.fieldData[fieldName] = fieldAttrs;
                }

                fileDatum.filteredFieldIndex = {}; //$.extend ({}, fileData.fieldIndex);
                fileDatum.filteredInvFieldIndex = []; //fileData.invFieldIndex.slice();

                VESPER.log ("filenames: ", fileNames);
                return fileDatum;
            }
            return {"error": $.t("parser.missingFilesError", {"part": fragQ})};
        }
        return {"error": $.t("parser.missingPathError", {"path": fragQ})};
	};


    this.updateFilteredLists = function (fileDatum, presentFieldIndex) {
        var i = 0;
        fileDatum.filteredInvFieldIndex.length = 0;
        var idName = fileDatum.invFieldIndex[fileDatum.idIndex];
        $.each(fileDatum.filteredFieldIndex, function (n) {
            if (n !== idName) {
                fileDatum.filteredFieldIndex[n] = undefined;
            }
        });

        for (var n = 0; n < presentFieldIndex.length; n++) {
            if (presentFieldIndex[n]) {
                var name = fileDatum.invFieldIndex [n];
                fileDatum.filteredFieldIndex[name] = i;
                fileDatum.filteredInvFieldIndex[i] = name;
                i++;
            }
        }

        VESPER.log ("fi", fileDatum.fieldIndex, fileDatum.filteredFieldIndex, fileDatum.invFieldIndex, fileDatum.filteredInvFieldIndex);
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
        var coreData = this.getFileDatum (metaData, true); //metaData.fileData[metaData.coreRowType];
        return coreData.filteredFieldIndex [coreData.invFieldIndex [coreData.idIndex]];
    };

	
	function chopToLastSlash (term) {
		var chop = (term ? term.lastIndexOf("/") + 1 : -1);
		return (chop > 0) ? term.substring (chop) : term;
	}

    this.selectNodes = function (regex, selectorFunc, model, setSelectionFunc) {
        var count = 0;

        if (regex !== undefined /*&& regex.length > 0*/) {
            var data = model.getData();
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


    this.init = function (callback) {
        $.when (this.loadxsd ('dwca.xsd'), // load in xsd and populate arrays/maps from it.
            $.get ('dwc_occurrence.xml', function (xml) {
                // pull descriptions for dwca fields out of dwc_occurrence.xml file, used in tooltips
                VESPER.log ("XML LOADED", typeof xml);
                VESPER.DWCAParser.descriptors = {};
                var props = $(xml).find('property');
                VESPER.log ("props", props);
                for (var n = props.length; --n >= 0;) {
                    var prop = $(props[n]);
                    VESPER.DWCAParser.descriptors[prop.attr('name')] = prop.attr('dc:description');
                }
                VESPER.log (VESPER.DWCAParser.descriptors);
            })
        )
        .then (callback)
            // agh. Mega important point. 'callback' passes in the callback to run after the stuff in $.when is done.
            // but doing 'callback()' runs the callback function as soon as the interpreter reaches here, so mega fail, i.e. it runs before the xsd has loaded.
            // (it also passes in the result of the function call to then, but it's already gone wrong enough).
        ;
        //this.loadxsd ('dwca.xsd', callback);
    };


    return this;
}();