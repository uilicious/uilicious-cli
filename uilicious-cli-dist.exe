#!/bin/bash

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
CPU_TYPE=$(uname -m)
OS_TYPE=$(uname)

# Binary file
BIN_FILE=""

# Perform OS / CPU based switching logic for the binary file
if [[ "$OS_TYPE" == "Darwin" ]]; then
	if [[ "$CPU_TYPE" == "x86_64" ]]; then
		BIN_FILE="$PROJ_DIR/node_modules/@uilicious/cli-macos-64bit/uilicious-cli-macos-64bit"
	else
		BIN_FILE="$PROJ_DIR/node_modules/@uilicious/cli-macos-32bit/uilicious-cli-macos-32bit"
	fi
else 
	if [[ "$CPU_TYPE" == "x86_64" ]]; then
		BIN_FILE="$PROJ_DIR/node_modules/@uilicious/cli-linux-64bit/uilicious-cli-linux-64bit"
	else
		BIN_FILE="$PROJ_DIR/node_modules/@uilicious/cli-linux-32bit/uilicious-cli-linux-32bit"
	fi
fi

# Lets check if file exists
if [[ ! -f "$BIN_FILE" ]]; then
	echo "!!! FATAL ERROR: Unable to locate CLI binary file - $BIN_FILE"
	exit 1;
fi

# Lets forward the parameters to the actual binary file
"$BIN_FILE" $@
