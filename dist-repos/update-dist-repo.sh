#!/bin/bash

# Get current directory, and normalize it
DIST_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJ_DIR="$(dirname $DIST_DIR)"

# Lets go the project
cd "$PROJ_DIR"

# Echo output stuff
echo ">>> running : update-dist-repo.sh"
echo ">>> Assuming project directory of : $PROJ_DIR"

# Lets get the current package versioning
RAW_VERSION_LINE=$(cat package.json | grep "version" | xargs)
RAW_VERSION_ARR=($RAW_VERSION_LINE)
RAW_VERSION_STR=${RAW_VERSION_ARR[1]}
VERSION_STR=$(echo $RAW_VERSION_STR | sed 's/[^a-zA-Z0-9\.]//g')
echo ">>> Assuming project version : $VERSION_STR"

# Lets update all the vairous sub repos files
# > cp  <binary file>  <distribution folder>

# WE DROPPED 32bit support
# cp ./bin/uilicious-cli-linux-32bit   ./dist-repos/linux-32bit/
# cp ./bin/uilicious-cli-macos-32bit   ./dist-repos/macos-32bit/
# cp ./bin/uilicious-cli-win-32bit.exe ./dist-repos/windows-32bit/

# 64 bit support
cp ./bin/uilicious-cli-linux-64bit   ./dist-repos/linux-64bit/
cp ./bin/uilicious-cli-macos-64bit   ./dist-repos/macos-64bit/
cp ./bin/uilicious-cli-win-64bit.exe ./dist-repos/windows-64bit/
cp ./bin/uilicious-cli-alpine-64bit.exe ./dist-repos/alpine-64bit/

# Lets do an update of the package versioning
for DREPO in `find ./dist-repos -type d -mindepth 1 -maxdepth 1`
do 
	# echo "updating - $DREPO"
	sed "s/\$VERSION/$VERSION_STR/g" $DREPO/package-template.json > $DREPO/package.json
done
