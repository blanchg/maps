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
    map.addControl(new mapboxgl.Navigation());
    // map.addControl(new mapboxgl.Geolocate()); 
    load('masters');
});

// When a click event occurs near a marker icon, open a popup at the location of
// the feature, with description HTML from its properties.
map.on('click', function (e) {
    var features = map.queryRenderedFeatures(e.point, { filter: ["==", "type", "poi"] });

    if (!features.length) {
        return;
    }

    var feature = features[0];

    // Populate the popup and set its coordinates
    // based on the feature found.
    var popup = new mapboxgl.Popup()
        .setLngLat(feature.geometry.coordinates)
        .setHTML(feature.properties.description)
        .addTo(map);
});

var lngLat = null;

if ("geolocation" in navigator) {
  /* geolocation is available */
    var watchID = navigator.geolocation.watchPosition(function(position) {
        // do_something(position.coords.latitude, position.coords.longitude);
        console.log(position.coords.accuracy);
        lngLat =  [position.coords.longitude, position.coords.latitude];
        var point = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": lngLat
            }
        };
        var features = [point];
        var accuracy = position.coords.accuracy;
        if (!isNaN(accuracy) && accuracy > 0) {
            var circle = turf.buffer(point, accuracy, 'meters');
            features.push(circle);
        }
        map.getSource('position').setData({
            "features": features,
            "type":"FeatureCollection",
            "crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}}
        });

        if (follow)
            map.setCenter(lngLat);
    }, function (a,b) {
        console.log(a,b);
    },{
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
} else {
  /* geolocation IS NOT available */
}

var follow = true;

var followChanged = function(e) {
    follow = e.target.checked;
    if (follow && lngLat != null) {
        map.flyTo({
            center: lngLat
        });
    }
}

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
