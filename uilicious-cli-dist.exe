#!/bin/bash

#
# This is a bash script that is built into the NPM deployment package
# to route request on known NPM install issues.
#

# Derive the working directory
WORKING_DIR="$( pwd )"

# Echo out a warning message for the fallback
if [[ "$#" -le 2 ]]; then
	echo ">"
	echo "> NOTE: This is using a bash script fallback, with a working directory of : $WORKING_DIR"
	echo ">"
	echo "> this happens due to npm/system file permission issues, and is known to have issues with relative file path"
	echo "> it is recommended to download and use the github release binary version instead at : https://github.com/uilicious/uilicious-cli/releases"
	echo ">"
fi

# Lets get the current script
MAIN_SCRIPT="${BASH_SOURCE[0]}"
# Get project directory, and normalize it
PROJ_DIR="$( cd "$( dirname "$MAIN_SCRIPT" )" >/dev/null 2>&1 && pwd )"
cd "$PROJ_DIR"

#
# Lets do symlink resolution
#
LINKCHECK_COUNT=0
while [[ -L "$MAIN_SCRIPT" ]]
do
	# Get derived symlink
	MAIN_SCRIPT="$PROJ_DIR/$(ls -l $MAIN_SCRIPT | sed -e 's/.* -> //')"
	# Get project directory, and normalize it
	PROJ_DIR="$( cd "$( dirname "$MAIN_SCRIPT" )" >/dev/null 2>&1 && pwd )"
	cd "$PROJ_DIR"

	# Link check loop safety
	LINKCHECK_COUNT=$((LINKCHECK_COUNT++))
	if [[ LINKCHECK_COUNT -gt 10 ]]; then
		echo "!!! FATAL ERROR: Attempting to trace a symlink with depth larger then 10 - aborting due to possibility of infinite loop"
		exit 2;
	fi
done

# Get project directory, and normalize it
PROJ_DIR="$( cd "$( dirname "$MAIN_SCRIPT" )" >/dev/null 2>&1 && pwd )"
cd "$PROJ_DIR"

# Alright lets detect OS, and machine type
OS_TYPE=$(uname)

# Binary file check
BIN_FILE=""

# Perform OS / CPU based switching logic for the binary file
if [[ "$OS_TYPE" == "Darwin" ]]; then
	# MACOS
	BIN_FILE="$PROJ_DIR/node_modules/@uilicious/cli-macos-64bit/uilicious-cli-macos-64bit"
elif [[ `which apk` ]]; then
	# Alpine
	BIN_FILE="$PROJ_DIR/node_modules/@uilicious/cli-alpine-64bit/uilicious-cli-alpine-64bit"
else
	# Linux
	BIN_FILE="$PROJ_DIR/node_modules/@uilicious/cli-linux-64bit/uilicious-cli-linux-64bit"
fi

# Lets check if file exists
if [[ ! -f "$BIN_FILE" ]]; then
	echo "!!! FATAL ERROR: Unable to locate CLI binary file - $BIN_FILE"
	exit 1;
fi

# Lets restart back to working directory
cd "$WORKING_DIR"

# Lets forward the parameters to the actual binary file
"$BIN_FILE" "$@"
