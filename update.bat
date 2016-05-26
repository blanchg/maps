@echo off

rem download from mapzen city or find out how to extract parts of osm and convert to geoserver
rem extract to data directory
call node download

call convert
