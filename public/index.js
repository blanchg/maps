'use strict';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'style.json',
    zoom: 10,
    hash: true,
    attributionControl: {
        position: 'bottom-left'
    }
});


map.on('load', function () {
    load('reserverise');
});

var emptyFeature = {
    'type':'Topology',
    'objects': {
        'collection': {
            'geometries': [],
            'bbox': [153.2803748401999,-27.891266319450438,153.29496119574048,-27.880232214474773]
        }
    }
};

var cacheKey;
var cache;
var cacheEtag;

var autosave = false;

function saveMap() {
    console.log(cacheKey, cacheEtag);
    if (cacheEtag == null || cache == null) {
        return;
    }
    localStorage.setItem(cacheKey + "-etag", cacheEtag);
    localStorage.setItem(cacheKey, cache);
    updateUI();
}

function clearSavedMaps() {
    var keys = Object.keys(localStorage);
    keys.forEach(function(key) {
        if (key.indexOf("maps-") == 0)
            delete localStorage[key];
    });
    updateUI();
}

function autosaveChanged(e) {
    console.log(e.target.checked);
    autosave = e.target.checked;
    // save it now instead of waiting for next load
    if (autosave) {
        saveMap();
    }
    updateUI();
}

function updateUI() {

    var cache = localStorage.getItem(cacheKey);
    var cacheEtag = localStorage.getItem(cacheKey + "-etag");
    var wasCached = cacheEtag != null || cache != null;
    var btn = document.getElementById("btnSave");
    // console.log(btn.attributes.put);
    if (wasCached) {
        var del = document.createAttribute('disabled');
        btn.attributes.setNamedItem(del);
        btn.firstChild.nodeValue = "Saved";
    } else {
        if(btn.attributes.getNamedItem('disabled') != null)
            btn.attributes.removeNamedItem('disabled');
        // btn.attributes["enabled"] = true;
        btn.firstChild.nodeValue = "Save"
    }

}

function load(name) {

    cacheKey = 'maps-' + name;
    cache = localStorage.getItem(cacheKey);
    cacheEtag = localStorage.getItem(cacheKey + "-etag");
    var wasCached = cacheEtag != null || cache != null;
    updateUI();
    var request = new XMLHttpRequest();
    request.open('GET', '/maps/' + name + '.json', true);
    if (cacheEtag != null) {
        request.setRequestHeader("etag", cacheEtag);
    }

    request.onload = function(e) {
      if (request.status == 0 || (request.status >= 200 && request.status < 400)) {

        // Success!
        cache = request.responseText;
        var json = JSON.parse(cache);
        cacheEtag = request.getResponseHeader('etag')?request.getResponseHeader('etag'):cacheEtag
        // Need to add to the cache here
        if (autosave || wasCached) {
            console.log("Saving");
            saveMap();
        }
        addSource(json);
      } else {
        // We reached our target server, but it returned an error
        console.log("Map", name, "not available offline");
        // Display an empty map
        addSource(emptyFeature);
      }
    };

    request.onerror = function(e) {
      // Use our cache
        if (cache == null) {
            addSource(emptyFeature);
        } else {
            addSource(JSON.parse(cache));
        }
    };

    request.send();

}

function addSource(data) {

    if (map.getSource('maps'))
        map.removeSource('maps');

    var geo = {
        "attribution": "© OpenStreetMap",
        "features": [],
        "bbox": data.objects.collection.bbox,
        "type":"FeatureCollection",
        "crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}}
    };
    data.objects.collection.geometries.forEach(function (obj) {
        geo.features.push(topojson.feature(data, obj));
    });
    map.addSource('maps', {
        'type': 'geojson',
        'data': geo
    });

    map.getSource('maps').attribution = geo.attribution;

    if (geo.bbox) {
        map.fitBounds(geo.bbox, {
            linear: true,
            duration: 500,
            padding: 10
        });
    }
}
