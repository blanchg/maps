'use strict';

const fs = require('fs');

var source = JSON.parse(fs.readFileSync(process.argv[2]));

var features = source.features;

var types = {};
// var amenities = {};

features.forEach(function(feature) {
    types[feature.properties.type] = true;
    // amenities[feature.properties.amenity] = true;
});

console.log("Types:\n", Object.keys(types).map(x=>'"' + x + '"').join(","));
// console.log("Amenitites:\n", Object.keys(amenities).map(x=>'"' + x + '"').join(","));
