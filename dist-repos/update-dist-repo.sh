#!/bin/bash

# Get current directory, and normalize it
DIST_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJ_DIR="$(dirname $DIST_DIR)"
CODE_PROJ_DIR="$PROJ_DIR/uilicious-cli-code"

# Echo output stuff
echo ">>> running : update-dist-repo.sh"
echo ">>> Assuming code directory of : $PROJ_DIR"

# Lets get the current package versioning
cd "$CODE_PROJ_DIR"
RAW_VERSION_LINE=$(cat package.json | grep "version" | xargs)
RAW_VERSION_ARR=($RAW_VERSION_LINE)
RAW_VERSION_STR=${RAW_VERSION_ARR[1]}
VERSION_STR=$(echo $RAW_VERSION_STR | sed 's/[^a-zA-Z0-9\.]//g')
echo ">>> Assuming project version : $VERSION_STR"

echo ">>> Ensuring built project"
cd "$CODE_PROJ_DIR"
./pkg-build.sh

# Lets go the project
cd "$PROJ_DIR"

# Lets update all the vairous sub repos files
# > cp  <binary file>  <distribution folder>

# WE DROPPED 32bit support
# cp ./bin/uilicious-cli-linux-32bit   "$DIST_DIR/linux-32bit/
# cp ./bin/uilicious-cli-macos-32bit   "$DIST_DIR/macos-32bit/
# cp ./bin/uilicious-cli-win-32bit.exe "$DIST_DIR/windows-32bit/

# 64 bit support
cp "$CODE_PROJ_DIR/bin/uilicious-cli-linux-64bit"      "$DIST_DIR/linux-64bit/"
cp "$CODE_PROJ_DIR/bin/uilicious-cli-macos-64bit"      "$DIST_DIR/macos-64bit/"
cp "$CODE_PROJ_DIR/bin/uilicious-cli-alpine-64bit"     "$DIST_DIR/alpine-64bit/"
cp "$CODE_PROJ_DIR/bin/uilicious-cli-win-64bit.exe"    "$DIST_DIR/windows-64bit/"

# Lets do an update of the package versioning
sed "s/\$VERSION/$VERSION_STR/g" "$DIST_DIR/linux-64bit/package-template.json"   > "$DIST_DIR/linux-64bit/package.json"
sed "s/\$VERSION/$VERSION_STR/g" "$DIST_DIR/macos-64bit/package-template.json"   > "$DIST_DIR/macos-64bit/package.json"
sed "s/\$VERSION/$VERSION_STR/g" "$DIST_DIR/alpine-64bit/package-template.json"  > "$DIST_DIR/alpine-64bit/package.json"
sed "s/\$VERSION/$VERSION_STR/g" "$DIST_DIR/windows-64bit/package-template.json" > "$DIST_DIR/windows-64bit/package.json"