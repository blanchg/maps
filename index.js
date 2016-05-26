'use strict';

const turf = {
        buffer: require('turf-buffer'),
        centroid: require('turf-centroid'),
        extent: require('turf-extent'),
        explode: require('turf-explode'),
        inside: require('turf-inside'),
      },
      fs = require('fs'),
      topojson = require("topojson");;

var bounds = JSON.parse(fs.readFileSync(process.argv[2]));

var buffer = turf.buffer(bounds, 100, 'meters');

var clipped = {
    "features": [bounds],
    "type":"FeatureCollection",
    "crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}}
};

var context = [];

var filenames = [
    'data/gold-coast_australia_amenities.geojson',
    'data/gold-coast_australia_buildings.geojson',
    'data/gold-coast_australia_landusages.geojson',
    'data/gold-coast_australia_roads.geojson',
    'data/gold-coast_australia_waterareas.geojson',
    'data/gold-coast_australia_waterways.geojson',
];

filenames.forEach(function (filename) {

    var features = JSON.parse(fs.readFileSync(filename, 'utf8')).features;

    features.forEach(function(feature) {
        var points = turf.explode(feature);
        var include = points.features.some(function(point) {
            // console.log("Point", point);
            if (turf.inside(point, buffer)) {
                // console.log("Found a point in the bounds!");
                return true;
            }
            return false;
        });

        if (include) {
            // feature.properties.source = filename;
            if (feature.properties.name === null)
                feature.properties.name = '';
            if (feature.geometry.type == "Polygon") {
                var point = turf.centroid(feature);
                point.properties = feature.properties;
                clipped.features.push(point);
            }
            // console.error(feature);
            clipped.features.push(feature);
        }
    });
});

clipped.bbox = turf.extent(bounds);
// clipped.properties.bbox = turf.extent(bounds);
// clipped.features = clipped.features.concat(context);

function propertyTransform(feature) {
  return feature.properties;
}
// var originalLength = JSON.stringify(clipped).length;

var topo = topojson.topology({collection:clipped}, {
    'property-transform': propertyTransform
});
var output = JSON.stringify(topo);
console.log(output);
console.error("Size:", Math.round(output.length/10.24)/100 + "k");