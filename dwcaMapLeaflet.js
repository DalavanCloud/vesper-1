VESPER.DWCAMapLeaflet = function (divid) {

	var dims;
    var self = this;
	var dividsub = divid.substring(1);
	
	var exitDur = 400, updateDur = 1000, enterDur = 400;
	
	var keyField, longField, latField, nameField;
    var model;
	
	var struc;
	var dwcaid2Marker = {};
	var markerGroup;
	var map;

    var curSelLayer;

    var selIcon = L.icon({
        iconUrl: 'img/selMarker.png',
        shadowUrl: '../lib/leafletjs/images/marker-shadow.png',

        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],

        shadowAnchor: [4, 62] // the same for the shadow
    });

    var oldIcon = new L.Icon.Default();

    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        longField = fields.longitude;
        latField = fields.latitude;
        nameField = fields.nameField;
        dims = NapVisLib.getDivDims (divid);
        model = mmodel;
        console.log ("set model for map", model);
    };
	
	
	this.go = function () {

        console.log ("map go");
        if (!map) {
            // create the tile layer with correct attribution
            var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib='Map data � OpenStreetMap contributors';
            var osm = new L.TileLayer(osmUrl, {minZoom: 1, maxZoom: 19, attribution: osmAttrib});

            d3.select(divid).style("overflow", "hidden"); // gets rid of scrollbars when the map tiles go over the edges of the display
            map = L.map(dividsub);//.setView([51.505, -0.09], 13); // set view dependent on markers now, drawControl is for draw toolbar
            map.addLayer (osm);

            console.log ("size", map.getSize());

            // Adds leaflet.draw functionality
            var drawControl = new L.Control.Draw({
                draw: {
                    marker: false,
                    polyline: false
                }
            });
            map.addControl (drawControl);

            map.on('draw:created', function (e) {
                var type = e.layerType,
                    layer = e.layer;

                var sel = [];
                var i = 0;

                if (type === 'circle') {
                    console.log ("circle", e);
                    var cll = e.layer._latlng;
                    var rad = e.layer._mRadius;
                    markerGroup.eachLayer(function (layer) {
                        i++;
                        var ll = layer.getLatLng();
                        if (cll.distanceTo (ll) <= rad) {
                            sel.push(layer.extId);
                            //console.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within circle");
                        }
                    });
                }
                else if (type === 'rectangle') {
                    console.log ("rectangle", e);
                    var clls = e.layer._latlngs;
                    var bounds = new L.LatLngBounds (clls[0], clls[2]);
                    markerGroup.eachLayer(function (layer) {
                        i++;
                        var ll = layer.getLatLng();
                        if (bounds.contains (ll)) {
                            sel.push(layer.extId);
                            //console.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within rectangle");
                        }
                    });
                }
                else if (type === 'polygon') {
                    console.log ("polygon", e);
                    var clls = e.layer._latlngs;
                    var bb = new L.LatLngBounds (clls);
                    markerGroup.eachLayer(function (layer) {
                        i++;
                        var ll = layer.getLatLng();
                        if (containsLatLng (clls, bb, ll)) {
                            sel.push(layer.extId);
                            //console.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within polygon");
                        }
                    });
                }

                //if (sel.length > 0) {

                    if (curSelLayer) {
                        map.removeLayer (curSelLayer);
                    }

                    console.log (sel.length, "specimens within", type);

                    // Do whatever else you need to. (save to db, add to map etc)
                    map.addLayer(layer);
                    curSelLayer = layer;

                    model.getSelectionModel().clear();
                    model.getSelectionModel().addAllToMap (sel);
                //}
            });

            markerGroup = new L.MarkerClusterGroup (
                {
                    iconCreateFunction: function(cluster) {
                        return new L.DivIcon({ html: '<div class="unselected">' + cluster.getChildCount() + '</div><div class="selected">' + cluster.getSelectedChildCount()+ '</div>',
                            className: 'vesperMapIcon',
                            iconSize: new L.Point(40, 20 + (cluster.getSelectedChildCount() > 0 ? 20 : 0))
                        });
                    }
                }
            );
            markerGroup.clearLayers();
        }

		var colourscheme = function(value){
		    return [value, 1, 0.5, 1];
		};
		//var heatmap = new L.TileLayer.HeatCanvas(/*"HeatCanvas", map,*/ {},
	    //        {'step':0.2, 'degree':HeatCanvas.QUAD, 'opacity':0.4, 'colorscheme':colourscheme}
		//);

        var maskMap = L.TileLayer.maskCanvas({
            radius: 5,  // radius in pixels or in meters (see useAbsoluteRadius)
            useAbsoluteRadius: false,  // true: r in meters, false: r in pixels
            color: '#000',  // the color of the layer
            opacity: 0.6  // opacity of the not coverted area
        });
        console.log ("maskmap ",maskMap);

		var markers = [];
		var latlngs = [];
		
		struc = model.getData();
		if (latField && longField) {
			 for (var prop in struc) {
				 if (struc.hasOwnProperty (prop)) {
					 var rec = model.getTaxaData(struc[prop]);
					 var lat = +rec[latField];
					 var longi = +rec[longField];
					
					 //narRecs[prop] = [+rec[latI], +rec[lonI], 1, rec[idI]];
					 //narRecs[prop] = [+rec[latField], +rec[longField]];
					 if (!isNaN(lat) && !isNaN(longi)) {
						 var coord= [lat, longi];
						 //console.log (lat, longi);
						 var marker = L.marker(coord)
						 	.bindPopup (rec[keyField]+" "+rec[nameField])
						 	.on ('dblclick', function (e) {
                                model.getSelectionModel().clear();
                                model.getSelectionModel().addToMap (e.target.extId);
						 	})
						 ;
						 marker.extId = prop;
						 markers.push (marker);
						 latlngs.push (coord);
						 dwcaid2Marker[prop] = marker;
						 
						// heatmap.pushData (lat, longi, 1);
					 }
				 }
			 } 
			 markerGroup.addLayers (markers);
            maskMap.setData (latlngs);
		}
		
		//map.addLayer (heatmap);
		map.addLayer (markerGroup);
       // map.addLayer (maskMap);
		map.fitBounds ((new L.LatLngBounds (latlngs)).pad(1.05));
		
		L.control.layers ({},{"Marker":markerGroup, /*"Heatmap":heatmap,*/ "Mask":maskMap}).addTo(map);
		L.control.scale().addTo (map);
		
		console.log ("group ", markerGroup);
		console.log ("map ", map);
	};


	this.update = function () {
        var vals = model.getSelectionModel().values();

		if (map.hasLayer (markerGroup)) {
            markerGroup.eachLayer (function(layer) {
                var sel = model.getSelectionModel().contains(layer.extId);
                layer.setIcon (sel ? selIcon : oldIcon);
            });

            //console.log ("vals", vals);

            var lls = [];
            var lastLayer;
            for (var n = 0; n < vals.length; n++) {
                var layer = dwcaid2Marker[vals[n]];
                if (layer) {
                    lls.push (layer.getLatLng());
                    lastLayer = layer;
                }
            }

            markerGroup.setAllSelectedChildCounts (model.getSelectionModel());

            if (lls.length == 1) {
                markerGroup.zoomToShowLayer (lastLayer, function () { lastLayer.openPopup()});
            }
            else if (lls.length > 1) {
                var bb = new L.LatLngBounds (lls);
                map.fitBounds(bb);
            }
		}
	};

    this.destroy = function () {
        DWCAHelper.recurseClearEvents (d3.select(divid));

        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divid);
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
    var  mc = 0;
    // Extend MarkerClusterGroup
    // mjg
    L.MarkerClusterGroup.include( {
            //mjg
            setAllSelectedChildCounts: function (selectionModel) {
                //console.log ("recalcing cluster sel counts");
                mc = 0;
                var cc = this._topClusterLevel.setAllSelectedChildCounts (selectionModel);
                //console.log ("MC", mc);
                return cc;
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
                mc++;

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
		