#!/bin/bash

# Get current directory, and normalize it
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Echo output stuff
echo ">>> running : publish.sh (for all dist-repos)"
echo ">>> Assuming parent distribution directory of : $DIR"

# Does publication
./linux-32bit/publish.sh
./linux-64bit/publish.sh
./macos-32bit/publish.sh
./macos-64bit/publish.sh
./windows-32bit/publish.sh
./windows-64bit/publish.sh