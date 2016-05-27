const fs = require('fs');
const request = require('request');

var r = request;
if (process.env.https_proxy != null) {
	r = request.defaults({'proxy':process.env.https_proxy});
}
const unzip = require('unzip');

var file = fs.createWriteStream('data/gold-coast_australia.imposm-geojson.zip');
r.get('https://s3.amazonaws.com:443/metro-extracts.mapzen.com/gold-coast_australia.imposm-geojson.zip').pipe(file);
file.on('finish', () => {
	console.log("Downloaded");
	fs.createReadStream('data/gold-coast_australia.imposm-geojson.zip').pipe(unzip.Extract({ path: 'data'}).on('close', () => {
		console.log('Extracted');
		file.close();
	}));
});