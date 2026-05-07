@echo off
echo Cleaning previous builds...
rd /s /q build
rd /s /q dist
del /q SSU.spec

echo Converting Python script to EXE...
pyinstaller --onefile --windowed --icon=icon.ico --add-data "icon.ico;." SSU.py

echo Conversion finished.
pause
