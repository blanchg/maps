@echo off

for %%i in (maps\*.json) do echo %%i && call node index.js %%i > public\%%i 
